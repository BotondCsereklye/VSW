from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    scan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    http_headers: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
    tls_analysis: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
    port_results: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list, nullable=False)
    misconfigurations: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list, nullable=False)
    metadata: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="snapshot")
