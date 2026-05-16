from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

ItemKind = Literal[
    "note",
    "memo",
    "bookmark",
    "video",
    "diary",
    "schedule",
    "quick_link",
]


class ItemBase(BaseModel):
    kind: ItemKind
    title: str = Field(default="", max_length=300)
    body: str = ""

    url: HttpUrl | None = None
    provider: str | None = Field(default=None, max_length=40)
    icon: str | None = Field(default=None, max_length=40)
    entry_date: datetime | None = None
    event_at: datetime | None = None
    duration_min: int | None = Field(default=None, ge=0, le=24 * 60)

    tags: list[str] = Field(default_factory=list)
    color: str | None = Field(default=None, max_length=20)
    pinned: bool = False
    archived: bool = False

    @field_validator("tags")
    @classmethod
    def _clean_tags(cls, v: list[str]) -> list[str]:
        seen: dict[str, None] = {}
        for raw in v:
            t = raw.strip().lower()
            if t and t not in seen:
                seen[t] = None
        return list(seen.keys())

    def model_post_init(self, _ctx) -> None:
        # Bookmark / video / quick_link must have a URL.
        if self.kind in {"bookmark", "video", "quick_link"} and self.url is None:
            raise ValueError(f"{self.kind} requires a url")
        # Note / memo / diary need either title or body.
        if self.kind in {"note", "memo", "diary"} and not (self.title or self.body):
            raise ValueError(f"{self.kind} requires a title or body")
        if self.kind == "schedule" and self.event_at is None:
            raise ValueError("schedule requires event_at")


class ItemCreate(ItemBase):
    pass


class ItemUpdate(ItemBase):
    pass


class ItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: ItemKind
    title: str
    body: str
    url: str | None
    provider: str | None
    icon: str | None
    entry_date: datetime | None
    event_at: datetime | None
    duration_min: int | None
    tags: list[str]
    color: str | None
    pinned: bool
    archived: bool
    created_at: datetime
    updated_at: datetime
