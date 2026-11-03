from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SANTALIQ API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    database_url: str = "postgresql+psycopg://santaliq:santaliq@localhost:5432/santaliq"
    redis_url: str = "redis://localhost:6379/0"
    translate_url: str = "http://localhost:8100"

    # Abuse protection / performance
    translate_rate_limit_per_minute: int = 20
    translate_cache_ttl_seconds: int = 7 * 24 * 3600
    auth_rate_limit_per_minute: int = 10

    # Open dataset licence label (owner decision; shown in every export)
    dataset_license: str = (
        "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)"
        " — credit SANTALIQ and contributors"
    )

    # Google Cloud Translation (optional second engine). Off until the key is set.
    google_translate_api_key: str = ""
    google_santali_code: str = "sat"
    # Hard monthly cap so usage stays inside Google's free tier (500,000 chars/month)
    google_monthly_char_limit: int = 450_000

    # Sessions
    session_cookie_name: str = "santaliq_session"
    session_ttl_days: int = 30

    # Outgoing email (verification, password reset). Disabled until SMTP_HOST and MAIL_FROM are set.
    public_url: str = "https://santaliq.supersoftltd.com"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = ""

    # SANTALIQ AI (Claude). Chat is disabled until ANTHROPIC_API_KEY is set.
    anthropic_api_key: str = ""
    ai_model: str = "claude-opus-5-5"
    ai_effort: str = "low"
    ai_requests_per_minute: int = 10
    ai_requests_per_day: int = 50

    # SANTALIQ Voice: consented recordings stored on disk (a Docker bind mount in production)
    voice_dir: str = "./data/voice"
    voice_max_bytes: int = 2 * 1024 * 1024  # ~30 s of Opus is ~150 KB; generous for WAV/MP4
    voice_clips_per_hour: int = 60
    # Listing images (market / media), same bind mount as voice in production
    media_dir: str = "./data/media"

    # Contact form: optional address notified of new messages (needs email enabled)
    contact_notify_email: str = ""
    # Error alerts (falls back to contact_notify_email); needs email enabled
    alert_email: str = ""

    @property
    def email_enabled(self) -> bool:
        return bool(self.smtp_host and self.mail_from)

    @property
    def cookie_secure(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
