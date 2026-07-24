from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    meeting_forest_base_url: str = "http://localhost:3000"
    mcp_host: str = "0.0.0.0"
    mcp_port: int = 8100


settings = Settings()
