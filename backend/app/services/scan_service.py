from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.models.scan import Scan, TargetType
from app.services.targeting import validate_target


def create_scan(session: Session, raw_target: str) -> Scan:
    normalized_target = validate_target(raw_target)
    scan = Scan(
        target=normalized_target.value,
        normalized_target=normalized_target.value,
        target_type=TargetType(normalized_target.target_type.value),
    )
    session.add(scan)
    session.commit()
    session.refresh(scan)
    return scan


def list_scans(session: Session) -> list[Scan]:
    statement = select(Scan).order_by(desc(Scan.created_at))
    return list(session.scalars(statement).all())


def get_scan_or_404(session: Session, scan_id: str) -> Scan:
    statement = (
        select(Scan)
        .options(selectinload(Scan.findings), selectinload(Scan.snapshot))
        .where(Scan.id == scan_id)
    )
    scan = session.scalar(statement)
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    return scan


def list_history_for_scan(session: Session, scan_id: str, limit: int = 6) -> list[Scan]:
    scan = get_scan_or_404(session, scan_id)
    statement = (
        select(Scan)
        .where(Scan.normalized_target == scan.normalized_target)
        .order_by(desc(Scan.created_at))
        .limit(limit)
    )
    return list(session.scalars(statement).all())
