from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

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
    session.delete(item)
    session.commit()
