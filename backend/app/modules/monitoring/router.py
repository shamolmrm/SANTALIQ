import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db
from app.modules.monitoring.models import ErrorEvent
from app.modules.monitoring.service import record_error
from app.modules.users.models import Role, User
from app.modules.users.security import client_ip, require_role

router = APIRouter(tags=["monitoring"])
admin_required = require_role(Role.admin)
REPORTS_PER_MINUTE = 20
MAX_CSP_BYTES = 16_000


class ClientErrorIn(BaseModel):
    kind: str = Field(default="Error", max_length=120)
    message: str = Field(max_length=2000)
    url: str = Field(default="", max_length=500)
    stack: str = Field(default="", max_length=8000)
    digest: str = Field(default="", max_length=64)


class ErrorOut(BaseModel):
    id: uuid.UUID
    source: str
    kind: str
    message: str
    detail: dict | None
    count: int
    first_seen: datetime
    last_seen: datetime
    resolved: bool


def out(e: ErrorEvent) -> ErrorOut:
    return ErrorOut(
        id=e.id,
        source=e.source,
        kind=e.kind,
        message=e.message,
        detail=e.detail,
        count=e.count,
        first_seen=e.first_seen,
        last_seen=e.last_seen,
        resolved=e.resolved,
    )


async def _limited(store: KeyValueStore, request: Request) -> bool:
    return await hit_rate_limit(store, f"rl:telemetry:{client_ip(request)}", REPORTS_PER_MINUTE)


@router.post("/telemetry/client-error", status_code=204)
async def client_error(
    body: ClientErrorIn,
    request: Request,
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> None:
    """Errors from visitors' browsers. No personal data: only the page path, never the query."""
    if await _limited(store, request):
        return
    path = body.url.split("?")[0].split("#")[0][:300]
    first_frame = next((ln.strip() for ln in body.stack.splitlines()[1:2]), "")
    record_error(
        db,
        source="web",
        kind=body.kind,
        message=body.message,
        where=first_frame,
        detail={
            "url": path,
            "stack": body.stack[:4000],
            "digest": body.digest or None,
            "user_agent": (request.headers.get("user-agent") or "")[:200],
        },
    )


@router.post("/telemetry/csp", status_code=204)
async def csp_report(
    request: Request,
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> None:
    """Content-Security-Policy violation reports (report-only mode while the policy is tuned)."""
    if await _limited(store, request):
        return
    raw = await request.body()
    if len(raw) > MAX_CSP_BYTES:
        return
    try:
        data = json.loads(raw or b"{}")
    except ValueError:
        return
    reports = data if isinstance(data, list) else [data]
    for r in reports[:5]:
        rep = r.get("csp-report") or r.get("body") or {}
        if not isinstance(rep, dict):
            continue
        directive = str(rep.get("violated-directive") or rep.get("effectiveDirective") or "?")
        blocked = str(rep.get("blocked-uri") or rep.get("blockedURL") or "?")
        page = str(rep.get("document-uri") or rep.get("documentURL") or "").split("?")[0]
        record_error(
            db,
            source="csp",
            kind=directive[:120],
            message=f"blocked {blocked[:300]}",
            detail={"url": page[:300]},
        )


@router.get("/admin/errors", response_model=list[ErrorOut])
def list_errors(
    resolved: bool = False,
    _: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> list[ErrorOut]:
    rows = db.scalars(
        select(ErrorEvent)
        .where(ErrorEvent.resolved.is_(resolved))
        .order_by(ErrorEvent.last_seen.desc())
        .limit(100)
    ).all()
    return [out(e) for e in rows]


@router.post("/admin/errors/{error_id}/resolve", response_model=ErrorOut)
def resolve_error(
    error_id: uuid.UUID, _: User = Depends(admin_required), db: Session = Depends(get_db)
) -> ErrorOut:
    e = db.get(ErrorEvent, error_id)
    if e is None:
        raise HTTPException(status_code=404, detail="Not found.")
    e.resolved = True
    db.commit()
    return out(e)
