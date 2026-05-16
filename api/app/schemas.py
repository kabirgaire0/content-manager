from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PostStatus = Literal["draft", "published"]


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = ""
    status: PostStatus = "draft"


class PostCreate(PostBase):
    pass


class PostUpdate(PostBase):
    pass


class PostRead(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
