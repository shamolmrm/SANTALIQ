import asyncio

import httpx
from fastapi import APIRouter, Response

from app.core.cache import ping_redis
from app.core.config import get_settings
from app.core.db import ping_database

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness: the API process is up."""
    settings = get_settings()
    return {"status": "ok", "service": settings.app_name, "environment": settings.environment}


async def _ping_translate() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{get_settings().translate_url}/health")
        return r.status_code == 200
    except httpx.HTTPError:
        return False


@router.get("/health/ready")
async def ready(response: Response) -> dict[str, object]:
    """Readiness: dependencies reachable. 503 if any is down."""
    database, redis, translate = await asyncio.gather(
        asyncio.to_thread(ping_database), ping_redis(), _ping_translate()
    )
    checks = {"database": database, "redis": redis, "translate": translate}
    ok = all(checks.values())
    if not ok:
        response.status_code = 503
    return {"status": "ok" if ok else "degraded", "checks": checks}
