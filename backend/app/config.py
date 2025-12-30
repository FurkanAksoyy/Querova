from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    app_name: str = "Querova API"
    version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    debug: bool = True

    # CORS Settings
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Google Gemini API
    gemini_api_key: str = ""  # Will be loaded from .env
    gemini_model: str = "gemini-3-flash-preview"
    gemini_embedding_model: str = "models/text-embedding-004"

    # ChromaDB Settings
    chroma_persist_directory: str = "./chroma_db"
    chroma_collection_name: str = "documents"

    # Document Processing
    chunk_size: int = 500
    chunk_overlap: int = 50
    max_file_size: int = 10 * 1024 * 1024  # 10MB

    # Upload Settings
    upload_directory: str = "./uploads"
    allowed_extensions: List[str] = [".pdf", ".docx", ".txt"]

    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()