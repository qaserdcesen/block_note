from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = "Contextual Task & Habit Manager"
    database_url: str = "sqlite:///./data/app.db"
    telegram_bot_token: str = ""
    scheduler_timezone: str = "UTC"
    llm_provider: str = "ai_io"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.intelligence.io.solutions/api/v1/"
    llm_model: str = "openai/gpt-oss-120b"
    llm_temperature: float = 0.25
    llm_max_tokens: int = 600

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")


@lru_cache()
def get_settings() -> Settings:
    return Settings()

