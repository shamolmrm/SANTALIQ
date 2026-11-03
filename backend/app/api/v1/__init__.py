from fastapi import APIRouter

from app.api.v1 import health
from app.modules.admin.dashboard import router as admin_dashboard_router
from app.modules.admin.router import router as admin_router
from app.modules.ai.router import router as ai_router
from app.modules.contact.router import router as contact_router
from app.modules.heritage.router import admin_router as heritage_admin_router
from app.modules.heritage.router import router as heritage_router
from app.modules.language.dataset import router as dataset_router
from app.modules.language.router import router as dictionary_router
from app.modules.monitoring.router import router as monitoring_router
from app.modules.translate.router import router as translate_router
from app.modules.users.account_router import router as account_router
from app.modules.users.delete_router import router as account_delete_router
from app.modules.users.profile_router import router as profile_router
from app.modules.users.router import router as auth_router
from app.modules.voice.router import admin_router as voice_admin_router
from app.modules.voice.router import router as voice_router
from app.modules.write.moderation import router as write_moderation_router
from app.modules.write.router import router as write_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(account_router)
api_router.include_router(profile_router)
api_router.include_router(translate_router)
api_router.include_router(dictionary_router)
api_router.include_router(dataset_router)
api_router.include_router(write_router)
api_router.include_router(ai_router)
api_router.include_router(admin_router)
api_router.include_router(admin_dashboard_router)
api_router.include_router(write_moderation_router)
api_router.include_router(heritage_router)
api_router.include_router(heritage_admin_router)
api_router.include_router(voice_router)
api_router.include_router(voice_admin_router)
api_router.include_router(contact_router)
api_router.include_router(monitoring_router)
api_router.include_router(account_delete_router)
