import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.db import get_db
from app.modules.monitoring.service import record_error

log = logging.getLogger("santaliq")

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.3.0",
        description="Public API of SANTALIQ, the Santali language platform. See /developers.",
        docs_url=f"{settings.api_v1_prefix}/docs",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def origin_guard(request: Request, call_next):  # type: ignore[no-untyped-def]
        """CSRF defence: reject state-changing requests sent from other websites."""
        if request.method in UNSAFE_METHODS:
            origin = request.headers.get("origin")
            if origin and origin not in settings.cors_origins:
                return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
        return await call_next(request)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        """Record every unexpected error (grouped) and alert the admin; never leak details."""
        try:
            await run_in_threadpool(_record_api_error, request, exc)
        except Exception:  # noqa: BLE001 — monitoring must never mask the original error
            log.exception("could not record error")
        return JSONResponse(
            {"detail": "Something went wrong on our side. We have been notified."}, status_code=500
        )

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


def _record_api_error(request: Request, exc: Exception) -> None:
    provider = request.app.dependency_overrides.get(get_db, get_db)
    gen = provider()
    db = next(gen) if hasattr(gen, "__next__") else gen
    try:
        route = request.scope.get("route")
        where = f"{request.method} {getattr(route, 'path', request.url.path)}"
        record_error(
            db,
            source="api",
            kind=type(exc).__name__,
            message=str(exc) or type(exc).__name__,
            where=where,
            detail={
                "path": where,
                "trace": "".join(traceback.format_exception(exc))[-6000:],
            },
        )
    finally:
        if hasattr(gen, "close"):
            gen.close()


app = create_app()
