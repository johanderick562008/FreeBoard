from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 10080
    FRONTEND_ORIGIN: str = "http://localhost:5500"
    ENV: str = "development"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()