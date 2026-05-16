import json
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audio
from ..db import get_session
from ..models import Item
from ..schemas import ItemCreate, ItemKind, ItemRead, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=list[ItemRead])
def list_items(
    session: Annotated[Session, Depends(get_session)],
    kind: ItemKind | None = Query(default=None),
    tag: str | None = Query(default=None),
    pinned: bool | None = Query(default=None),
    archived: bool | None = Query(default=False),
) -> list[Item]:
    stmt = select(Item)
    if kind is not None:
        stmt = stmt.where(Item.kind == kind)
    if pinned is not None:
        stmt = stmt.where(Item.pinned == pinned)
    if archived is not None:
        stmt = stmt.where(Item.archived == archived)
    stmt = stmt.order_by(Item.pinned.desc(), Item.updated_at.desc())

    items = list(session.scalars(stmt))
    if tag:
        needle = tag.strip().lower()
        items = [it for it in items if needle in (it.tags or [])]
    return items


def _to_model_kwargs(payload: ItemCreate | ItemUpdate) -> dict:
    data = payload.model_dump()
    if data.get("url") is not None:
        data["url"] = str(data["url"])
    return data


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    session: Annotated[Session, Depends(get_session)],
) -> Item:
    item = Item(**_to_model_kwargs(payload))
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.post(
    "/voice",
    response_model=ItemRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_voice_memo(
    session: Annotated[Session, Depends(get_session)],
    audio_file: Annotated[UploadFile, File(alias="audio")],
    title: Annotated[str, Form()] = "",
    body: Annotated[str, Form()] = "",
    tags: Annotated[str, Form()] = "[]",
    color: Annotated[str | None, Form()] = None,
    pinned: Annotated[bool, Form()] = False,
    duration_ms: Annotated[int | None, Form()] = None,
) -> Item:
    """Multipart: atomically create a voice_memo and store its audio file.

    `tags` is sent as a JSON-encoded list of strings (matches the rest of
    the API). All other text fields are plain form values.
    """
    try:
        tag_list = json.loads(tags) if tags else []
        if not isinstance(tag_list, list):
            raise ValueError
        tag_list = [str(t).strip().lower() for t in tag_list if str(t).strip()]
        # de-dupe while preserving order
        tag_list = list(dict.fromkeys(tag_list))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=422, detail="tags must be a JSON array of strings")

    data = await audio_file.read()
    item = Item(
        kind="voice_memo",
        title=title.strip(),
        body=body,
        tags=tag_list,
        color=color or None,
        pinned=pinned,
        audio_duration_ms=duration_ms,
    )
    session.add(item)
    session.flush()  # assigns item.id without committing

    try:
        rel_path, mime = audio.write_audio(item.id, audio_file.content_type or "", data)
    except HTTPException:
        session.rollback()
        raise

    item.audio_path = rel_path
    item.audio_mime = mime
    session.commit()
    session.refresh(item)
    return item


@router.post("/{item_id}/audio", response_model=ItemRead)
async def replace_audio(
    item_id: int,
    session: Annotated[Session, Depends(get_session)],
    audio_file: Annotated[UploadFile, File(alias="audio")],
    duration_ms: Annotated[int | None, Form()] = None,
) -> Item:
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="item not found")
    if item.kind != "voice_memo":
        raise HTTPException(status_code=400, detail="item is not a voice_memo")

    data = await audio_file.read()
    rel_path, mime = audio.write_audio(item.id, audio_file.content_type or "", data)
    item.audio_path = rel_path
    item.audio_mime = mime
    if duration_ms is not None:
        item.audio_duration_ms = duration_ms
    session.commit()
    session.refresh(item)
    return item


@router.get("/{item_id}/audio")
def get_audio(
    item_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> FileResponse:
    item = session.get(Item, item_id)
    if not item or item.kind != "voice_memo" or not item.audio_path:
        raise HTTPException(status_code=404, detail="audio not found")
    path = audio.absolute_path(item.audio_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="audio file missing on disk")
    return FileResponse(
        path,
        media_type=item.audio_mime or "application/octet-stream",
        filename=path.name,
    )


@router.get("/{item_id}", response_model=ItemRead)
def get_item(
    item_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> Item:
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="item not found")
    return item


@router.put("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: int,
    payload: ItemUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> Item:
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="item not found")
    for field, value in _to_model_kwargs(payload).items():
        setattr(item, field, value)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="item not found")
    rel_path = item.audio_path
    session.delete(item)
    session.commit()
    audio.delete_audio(rel_path)
