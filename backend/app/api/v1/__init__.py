from fastapi import APIRouter

from app.api.v1 import health
from app.modules.translate.router import router as translate_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(translate_router)
