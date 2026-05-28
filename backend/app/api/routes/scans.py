from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.schemas.scan import ScanCreateRequest, ScanDetailResponse, ScanListItemResponse
from app.services.scan_service import create_scan, get_scan_or_404, list_scans
from app.services.targeting import InvalidTargetError


router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("", response_model=ScanListItemResponse, status_code=status.HTTP_202_ACCEPTED)
def create_scan_endpoint(
    payload: ScanCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: Session = Depends(get_db_session),
) -> ScanListItemResponse:
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
def list_scans_endpoint(session: Session = Depends(get_db_session)) -> list[ScanListItemResponse]:
    return [ScanListItemResponse.model_validate(scan) for scan in list_scans(session)]


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan_detail_endpoint(scan_id: str, session: Session = Depends(get_db_session)) -> ScanDetailResponse:
    return ScanDetailResponse.model_validate(get_scan_or_404(session, scan_id))
