from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScanCreateRequest(BaseModel):
    target: str


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    severity: str
    title: str
    description: str
    recommendation: str
    evidence: dict[str, object]
    created_at: datetime


class ReportSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    http_headers: dict[str, object]
    tls_analysis: dict[str, object]
    port_results: list[dict[str, object]]
    misconfigurations: list[dict[str, object]]
    metadata: dict[str, object] = Field(validation_alias="report_metadata")
    created_at: datetime


class ScanListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    target: str
    normalized_target: str
    target_type: str
    status: str
    score: int | None
    summary: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ScanDetailResponse(ScanListItemResponse):
    findings: list[FindingResponse]
    snapshot: ReportSnapshotResponse | None
