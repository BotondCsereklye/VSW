from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class TargetType(StrEnum):
    DOMAIN = "domain"
    IP = "ip"


class ScanStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_target: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    target_type: Mapped[TargetType] = mapped_column(
        SAEnum(TargetType, native_enum=False),
        nullable=False,
    )
    status: Mapped[ScanStatus] = mapped_column(
        SAEnum(ScanStatus, native_enum=False),
        default=ScanStatus.PENDING,
        nullable=False,
        index=True,
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    snapshot = relationship(
        "ReportSnapshot",
        back_populates="scan",
        cascade="all, delete-orphan",
        uselist=False,
    )
