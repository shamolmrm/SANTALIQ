import hashlib
import logging
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import mailer
from app.core.config import get_settings
from app.core.db import utcnow
from app.modules.monitoring.models import ErrorEvent

log = logging.getLogger("santaliq.errors")
ALERT_EVERY_SECONDS = 3600
_last_alert: dict[str, float] = {}  # per worker process; good enough to avoid floods


def _clip(s: str | None, n: int) -> str:
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


def fingerprint(source: str, kind: str, message: str, where: str = "") -> str:
    # digits vary (ids, line numbers in minified bundles); group them together
    norm = "".join("0" if c.isdigit() else c for c in f"{source}|{kind}|{message[:200]}|{where}")
    return hashlib.sha256(norm.encode()).hexdigest()


def record_error(
    db: Session,
    *,
    source: str,
    kind: str,
    message: str,
    detail: dict | None = None,
    where: str = "",
) -> ErrorEvent:
    """Insert or bump a grouped error, then alert the admin (at most hourly per error)."""
    kind, message = _clip(kind, 120), _clip(message, 2000)
    fp = fingerprint(source, kind, message, where)
    ev = db.scalar(select(ErrorEvent).where(ErrorEvent.fingerprint == fp))
    is_new_or_reopened = ev is None or ev.resolved
    if ev is None:
        ev = ErrorEvent(fingerprint=fp, source=source, kind=kind, message=message, detail=detail)
        db.add(ev)
    else:
        ev.count += 1
        ev.last_seen = utcnow()
        ev.detail = detail or ev.detail
        ev.resolved = False
    db.commit()
    log.error("%s error %s: %s", source, kind, message)
    if source != "csp":
        _maybe_alert(fp, source, kind, message, detail, force=is_new_or_reopened)
    return ev


def _maybe_alert(
    fp: str, source: str, kind: str, message: str, detail: dict | None, *, force: bool
) -> None:
    s = get_settings()
    to = s.alert_email or s.contact_notify_email
    if not to or not mailer.email_enabled():
        return
    now = time.monotonic()
    if not force and now - _last_alert.get(fp, -1e9) < ALERT_EVERY_SECONDS:
        return
    _last_alert[fp] = now
    try:
        where = (detail or {}).get("path") or (detail or {}).get("url") or ""
        mailer.send_email(
            to,
            f"[SANTALIQ error] {source}: {kind}",
            f"{kind}: {message}\nWhere: {where}\n\nSee {s.public_url}/admin/system",
        )
    except Exception:  # noqa: BLE001 — alerting must never break the request
        log.exception("error alert email failed")
