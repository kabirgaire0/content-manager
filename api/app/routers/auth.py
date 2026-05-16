from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DbSession

from .. import auth, rate_limit
from ..db import get_session
from ..models import AuthSettings, Session as SessionRow

router = APIRouter(prefix="/auth", tags=["auth"])


class StatusResponse(BaseModel):
    needs_setup: bool


class SetupRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


class LoginRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=64)


class LoginResponse(BaseModel):
    token: str
    expires_at: str


class MeResponse(BaseModel):
    authenticated: bool = True
    expires_at: str


@router.get("/status", response_model=StatusResponse)
def status_endpoint(db: Annotated[DbSession, Depends(get_session)]) -> StatusResponse:
    return StatusResponse(needs_setup=auth.needs_setup(db))


@router.post(
    "/setup",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
)
def setup(
    payload: SetupRequest,
    db: Annotated[DbSession, Depends(get_session)],
    user_agent: Annotated[str | None, Header(alias="user-agent")] = None,
) -> LoginResponse:
    if not auth.needs_setup(db):
        raise HTTPException(status_code=409, detail="PIN already set")
    settings_row = AuthSettings(id=1, pin_hash=auth.hash_pin(payload.pin))
    db.add(settings_row)
    db.commit()
    session_row = auth.create_session(db, user_agent=user_agent)
    return LoginResponse(
        token=session_row.token,
        expires_at=session_row.expires_at.isoformat(),
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[DbSession, Depends(get_session)],
    user_agent: Annotated[str | None, Header(alias="user-agent")] = None,
) -> LoginResponse:
    rate_limit.hit(request, "auth.login", limit=5, window_s=300)
    settings_row = auth.get_auth_settings(db)
    if settings_row is None:
        raise HTTPException(status_code=409, detail="no PIN set; setup first")
    if not auth.verify_pin(payload.pin, settings_row.pin_hash):
        raise HTTPException(status_code=401, detail="incorrect PIN")
    session_row = auth.create_session(db, user_agent=user_agent)
    return LoginResponse(
        token=session_row.token,
        expires_at=session_row.expires_at.isoformat(),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: Annotated[SessionRow, Depends(auth.require_session)],
    db: Annotated[DbSession, Depends(get_session)],
) -> None:
    auth.delete_session(db, session.token)


@router.get("/me", response_model=MeResponse)
def me(
    session: Annotated[SessionRow, Depends(auth.require_session)],
) -> MeResponse:
    return MeResponse(expires_at=session.expires_at.isoformat())
