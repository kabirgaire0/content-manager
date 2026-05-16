from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

ITEM_KINDS = (
    "note",
    "memo",
    "bookmark",
    "video",
    "diary",
    "schedule",
    "quick_link",
    "voice_memo",
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('note','memo','bookmark','video','diary','schedule','quick_link','voice_memo')",
            name="kind_check",
        ),
        Index("ix_items_kind", "kind"),
        Index("ix_items_pinned_updated", "pinned", "updated_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)

    title: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # kind-specific (nullable for kinds that don't use them)
    url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    event_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # voice_memo-specific
    audio_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_mime: Mapped[str | None] = mapped_column(String(80), nullable=True)
    audio_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    transcript_lang: Mapped[str | None] = mapped_column(String(8), nullable=True)

    # common metadata
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )


class AuthSettings(Base):
    """Singleton (id=1) holding the local PIN hash. Absent row => no PIN set yet."""

    __tablename__ = "auth_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    pin_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
    )


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("ix_sessions_expires_at", "expires_at"),)

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    # Non-secret identifier exposed in URLs (e.g. /auth/sessions/{session_id}).
    # The token itself never leaves the API except in the LoginResponse body.
    session_id: Mapped[str] = mapped_column(String(16), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)


class SpotifyToken(Base):
    """Singleton table (id always 1) holding the connected Spotify account's tokens."""

    __tablename__ = "spotify_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    token_type: Mapped[str] = mapped_column(String(40), nullable=False, default="Bearer")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
    )
