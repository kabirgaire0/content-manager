"""PIN auth, session token issuance, and the require_session dependency."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from .db import get_session
from .models import AuthSettings, Session as SessionRow

SESSION_TTL = timedelta(days=30)


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except ValueError:
        return False


def get_auth_settings(db: DbSession) -> AuthSettings | None:
    return db.get(AuthSettings, 1)


def needs_setup(db: DbSession) -> bool:
    return get_auth_settings(db) is None


def create_session(db: DbSession, user_agent: str | None = None) -> SessionRow:
    token = secrets.token_hex(32)
    row = SessionRow(
        token=token,
        expires_at=datetime.now(timezone.utc) + SESSION_TTL,
        user_agent=(user_agent or "")[:300] or None,
    )
    db.add(row)
    db.commit()
    return row


def delete_session(db: DbSession, token: str) -> None:
    row = db.get(SessionRow, token)
    if row is not None:
        db.delete(row)
        db.commit()


def _extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def require_session(
    db: Annotated[DbSession, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> SessionRow:
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing or malformed bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    row = db.get(SessionRow, token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if _as_utc(row.expires_at) <= datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="session expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return row
