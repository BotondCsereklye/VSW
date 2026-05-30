import json
from csv import DictWriter
from io import StringIO
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.schemas.scan import ScanCreateRequest, ScanDetailResponse, ScanListItemResponse
from app.services.scan_service import (
    create_scan,
    get_scan_or_404,
    list_history_for_scan,
    list_scans,
)
from app.services.targeting import InvalidTargetError

router = APIRouter(prefix="/scans", tags=["scans"])
DbSession = Annotated[Session, Depends(get_db_session)]


@router.post("", response_model=ScanListItemResponse, status_code=status.HTTP_202_ACCEPTED)
def create_scan_endpoint(
    payload: ScanCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: DbSession,
) -> ScanListItemResponse:
    client_host = request.client.host if request.client is not None else "unknown"
    rate_limiter = request.app.state.rate_limiter
    if not rate_limiter.allow(f"scan-create:{client_host}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    try:
        scan = create_scan(session, payload.target)
    except InvalidTargetError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Target must be a domain or IP address.",
        ) from exc

    runner = getattr(request.app.state, "scan_runner", None)
    if runner is not None:
        background_tasks.add_task(runner, scan.id)

    return ScanListItemResponse.model_validate(scan)


@router.get("", response_model=list[ScanListItemResponse])
def list_scans_endpoint(session: DbSession) -> list[ScanListItemResponse]:
    return [ScanListItemResponse.model_validate(scan) for scan in list_scans(session)]


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan_detail_endpoint(scan_id: str, session: DbSession) -> ScanDetailResponse:
    return ScanDetailResponse.model_validate(get_scan_or_404(session, scan_id))


@router.get("/{scan_id}/history", response_model=list[ScanListItemResponse])
def get_scan_history_endpoint(
    scan_id: str,
    session: DbSession,
    limit: int = Query(default=6, ge=1, le=20),
) -> list[ScanListItemResponse]:
    history = list_history_for_scan(session, scan_id, limit=limit)
    return [ScanListItemResponse.model_validate(scan) for scan in history]


@router.get("/{scan_id}/export")
def export_scan_endpoint(
    scan_id: str,
    session: DbSession,
    export_format: Literal["json", "csv"] = Query(alias="format"),
) -> Response:
    scan = get_scan_or_404(session, scan_id)
    payload = ScanDetailResponse.model_validate(scan).model_dump(mode="json")

    if export_format == "json":
        pretty_json = json.dumps(payload, indent=2, ensure_ascii=False)
        return Response(
            content=pretty_json,
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="scan-{scan.normalized_target}-report.json"'
                )
            },
        )

    csv_buffer = StringIO()
    fieldnames = [
        "scan_id",
        "target",
        "status",
        "score",
        "finding_id",
        "category",
        "severity",
        "title",
        "description",
        "recommendation",
        "evidence",
    ]
    writer = DictWriter(csv_buffer, fieldnames=fieldnames)
    writer.writeheader()

    findings = payload["findings"] or [{}]
    for finding in findings:
        writer.writerow(
            {
                "scan_id": payload["id"],
                "target": payload["target"],
                "status": payload["status"],
                "score": payload["score"],
                "finding_id": finding.get("id", ""),
                "category": finding.get("category", ""),
                "severity": finding.get("severity", ""),
                "title": finding.get("title", ""),
                "description": finding.get("description", ""),
                "recommendation": finding.get("recommendation", ""),
                "evidence": finding.get("evidence", {}),
            }
        )

    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f'attachment; filename="scan-{scan.normalized_target}-report.csv"'
            )
        },
    )
