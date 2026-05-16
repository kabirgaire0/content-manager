"""Spotify Web API client + token lifecycle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from .config import settings
from .models import SpotifyToken

SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"


def authorize_url(state: str) -> str:
    """Build the URL we send the user's browser to for the consent step."""
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": settings.spotify_scopes,
        "state": state,
        "show_dialog": "false",
    }
    return f"{SPOTIFY_AUTH_URL}?{httpx.QueryParams(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.spotify_redirect_uri,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            SPOTIFY_TOKEN_URL,
            data=data,
            auth=(settings.spotify_client_id, settings.spotify_client_secret),
        )
    if res.status_code != 200:
        raise HTTPException(status_code=400, detail=f"spotify token exchange failed: {res.text}")
    return res.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            SPOTIFY_TOKEN_URL,
            data=data,
            auth=(settings.spotify_client_id, settings.spotify_client_secret),
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"spotify refresh failed: {res.text}")
    return res.json()


def save_token(session: Session, payload: dict[str, Any], existing: SpotifyToken | None) -> SpotifyToken:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(payload["expires_in"]) - 30)
    if existing is None:
        token = SpotifyToken(
            id=1,
            access_token=payload["access_token"],
            refresh_token=payload["refresh_token"],
            scope=payload.get("scope", ""),
            token_type=payload.get("token_type", "Bearer"),
            expires_at=expires_at,
        )
        session.add(token)
    else:
        token = existing
        token.access_token = payload["access_token"]
        if "refresh_token" in payload:
            token.refresh_token = payload["refresh_token"]
        token.scope = payload.get("scope", token.scope)
        token.token_type = payload.get("token_type", token.token_type)
        token.expires_at = expires_at
    session.commit()
    session.refresh(token)
    return token


def get_token(session: Session) -> SpotifyToken | None:
    return session.get(SpotifyToken, 1)


async def ensure_access_token(session: Session) -> SpotifyToken:
    token = get_token(session)
    if token is None:
        raise HTTPException(status_code=409, detail="spotify not connected")
    if token.expires_at <= datetime.now(timezone.utc):
        payload = await refresh_access_token(token.refresh_token)
        token = save_token(session, payload, token)
    return token


async def api_request(
    session: Session,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: Any = None,
) -> httpx.Response:
    token = await ensure_access_token(session)
    headers = {"Authorization": f"Bearer {token.access_token}"}
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.request(
            method,
            f"{SPOTIFY_API}{path}",
            headers=headers,
            params=params,
            json=json,
        )
    # On 401 the token may have been revoked; refresh once and retry.
    if res.status_code == 401:
        payload = await refresh_access_token(token.refresh_token)
        token = save_token(session, payload, token)
        headers = {"Authorization": f"Bearer {token.access_token}"}
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.request(
                method,
                f"{SPOTIFY_API}{path}",
                headers=headers,
                params=params,
                json=json,
            )
    return res
