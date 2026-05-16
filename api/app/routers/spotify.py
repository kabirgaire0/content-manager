from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse
from itsdangerous import BadSignature, URLSafeTimedSerializer
from sqlalchemy.orm import Session

from .. import spotify
from ..config import settings
from ..db import get_session
from ..models import SpotifyToken

router = APIRouter(prefix="/spotify", tags=["spotify"])

_state_signer = URLSafeTimedSerializer(settings.state_secret, salt="spotify-oauth-state")
_STATE_MAX_AGE_S = 600


def _ensure_configured() -> None:
    if not settings.spotify_configured:
        raise HTTPException(
            status_code=503,
            detail="spotify not configured (set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)",
        )


@router.get("/status")
def status(session: Annotated[Session, Depends(get_session)]) -> dict[str, bool]:
    token = spotify.get_token(session)
    return {
        "configured": settings.spotify_configured,
        "connected": token is not None,
    }


@router.get("/login")
def login() -> RedirectResponse:
    _ensure_configured()
    state = _state_signer.dumps({"v": 1})
    return RedirectResponse(spotify.authorize_url(state), status_code=302)


@router.get("/callback")
async def callback(
    session: Annotated[Session, Depends(get_session)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    _ensure_configured()
    if error:
        return RedirectResponse(
            f"{settings.web_base_url}/?spotify_error={error}", status_code=302
        )
    if not code or not state:
        raise HTTPException(status_code=400, detail="missing code or state")
    try:
        _state_signer.loads(state, max_age=_STATE_MAX_AGE_S)
    except BadSignature:
        raise HTTPException(status_code=400, detail="invalid oauth state") from None

    payload = await spotify.exchange_code(code)
    existing = spotify.get_token(session)
    spotify.save_token(session, payload, existing)
    return RedirectResponse(f"{settings.web_base_url}/?spotify=connected", status_code=302)


@router.delete("/connection", status_code=204)
def disconnect(session: Annotated[Session, Depends(get_session)]) -> None:
    token = spotify.get_token(session)
    if token is not None:
        session.delete(token)
        session.commit()


@router.get("/state")
async def player_state(session: Annotated[Session, Depends(get_session)]) -> JSONResponse:
    res = await spotify.api_request(session, "GET", "/me/player")
    if res.status_code == 204:
        return JSONResponse({"playing": False, "track": None, "device": None})
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"spotify state error: {res.text}")
    data = res.json()
    item = data.get("item") or {}
    album = item.get("album") or {}
    images = album.get("images") or []
    return JSONResponse(
        {
            "playing": bool(data.get("is_playing")),
            "progress_ms": data.get("progress_ms"),
            "shuffle": data.get("shuffle_state"),
            "repeat": data.get("repeat_state"),
            "device": (data.get("device") or {}).get("name"),
            "track": (
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "duration_ms": item.get("duration_ms"),
                    "artists": [a.get("name") for a in (item.get("artists") or [])],
                    "album": album.get("name"),
                    "image": images[0]["url"] if images else None,
                    "url": (item.get("external_urls") or {}).get("spotify"),
                }
                if item
                else None
            ),
        }
    )


PlayerAction = Literal["play", "pause", "next", "previous"]


@router.post("/control/{action}")
async def control(
    action: PlayerAction,
    session: Annotated[Session, Depends(get_session)],
    device_id: Annotated[str | None, Query()] = None,
) -> JSONResponse:
    if action == "play":
        method, path = "PUT", "/me/player/play"
    elif action == "pause":
        method, path = "PUT", "/me/player/pause"
    elif action == "next":
        method, path = "POST", "/me/player/next"
    else:
        method, path = "POST", "/me/player/previous"

    params = {"device_id": device_id} if device_id else None
    res = await spotify.api_request(session, method, path, params=params)
    if res.status_code in (200, 202, 204):
        return JSONResponse({"ok": True})
    if res.status_code == 404:
        raise HTTPException(status_code=404, detail="no active spotify device")
    if res.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="spotify says no (premium required, or no active device)",
        )
    raise HTTPException(status_code=502, detail=f"spotify control error: {res.text}")
