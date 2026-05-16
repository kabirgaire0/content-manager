from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{Path.cwd() / 'data' / 'content.db'}"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    web_base_url: str = "http://localhost:3000"

    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://127.0.0.1:8000/spotify/callback"
    spotify_scopes: str = (
        "user-read-playback-state "
        "user-read-currently-playing "
        "user-modify-playback-state"
    )

    state_secret: str = "dev-only-state-secret-change-me"

    @property
    def spotify_configured(self) -> bool:
        return bool(self.spotify_client_id and self.spotify_client_secret)


settings = Settings()
