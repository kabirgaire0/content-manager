from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_STATE_SECRET = "dev-only-state-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["dev", "prod"] = "dev"

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

    state_secret: str = DEFAULT_STATE_SECRET

    # faster-whisper model name (tiny, base, small, medium, large-v3, or
    # English-only variants like base.en). base ≈ 150MB, downloads on first use.
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    @property
    def spotify_configured(self) -> bool:
        return bool(self.spotify_client_id and self.spotify_client_secret)

    def assert_production_safe(self) -> None:
        """Fail fast when running in prod with insecure defaults."""
        if self.app_env != "prod":
            return
        problems: list[str] = []
        if self.state_secret == DEFAULT_STATE_SECRET:
            problems.append(
                "STATE_SECRET is the dev default; set a fresh value "
                "(e.g. `python -c 'import secrets; print(secrets.token_hex(32))'`)"
            )
        if problems:
            raise RuntimeError(
                "Refusing to start in APP_ENV=prod with insecure config:\n  - "
                + "\n  - ".join(problems)
            )


settings = Settings()
settings.assert_production_safe()
