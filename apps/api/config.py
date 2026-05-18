from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # AI providers
    gemini_api_key: str = ""
    groq_api_key: str = ""

    # Google Cloud
    google_cloud_project_id: str = ""
    google_application_credentials: str = ""
    google_service_account_base64: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_webhook_base_url: str = "http://localhost:8000"

    # WhatsApp
    meta_whatsapp_token: str = ""
    meta_whatsapp_verify_token: str = "helio_verify_2025"

    # Email
    resend_api_key: str = ""
    resend_from_email: str = "noreply@tryhelio.com"

    # Cache
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    # App
    app_env: str = "development"
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
