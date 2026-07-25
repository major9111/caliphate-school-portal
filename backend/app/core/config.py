"""Application configuration using pydantic-settings."""
from functools import lru_cache
from typing import List, Union
from typing_extensions import Annotated
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode


class Settings(BaseSettings):
    """Global application settings loaded from environment."""

    # App
    APP_NAME: str = "Caliphate International Schools Gusau Ltd"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./caliphate_school.db"

    # CORS — accepts either a JSON array ("[\"https://a.com\",\"https://b.com\"]")
    # or a plain comma-separated string ("https://a.com,https://b.com"), since
    # the latter is what most people naturally type into a .env file or host's
    # environment variable settings. NoDecode stops pydantic-settings from
    # force-JSON-parsing this before our validator below gets a chance to run.
    CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                import json
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    # AI Receptionist (Groq) — optional; falls back to canned responses if unset
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Email (SMTP) — for password reset, admission letters, fee reminders
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@caliphateschools.edu.ng"
    EMAIL_FROM_NAME: str = "Caliphate International Schools"

    # Cloudinary — for file/image uploads (student photos, documents)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # School branding (used in generated PDFs)
    SCHOOL_NAME: str = "Caliphate International Schools Gusau Ltd"
    SCHOOL_ADDRESS: str = "Gusau, Zamfara State, Nigeria"
    SCHOOL_PHONE: str = "+234 803 000 0000"
    SCHOOL_EMAIL: str = "info@caliphateschools.edu.ng"
    SCHOOL_WEBSITE: str = "https://caliphateschools.edu.ng"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    instance = Settings()
    if instance.APP_ENV == "production" and instance.SECRET_KEY == "change-me-in-production-use-long-random-string":
        raise RuntimeError(
            "SECRET_KEY is still set to its insecure default. "
            "Set the SECRET_KEY environment variable to a long random string before running in production."
        )
    return instance


settings = get_settings()
