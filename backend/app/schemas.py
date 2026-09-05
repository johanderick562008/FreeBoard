from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UsernameSetup(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-30 characters: letters, numbers, underscore only.")
        return v.lower()


class TimetableCell(BaseModel):
    day: str
    slot_index: int = Field(ge=0, le=7)
    label: str = Field(max_length=80)


class TimetableBulkUpdate(BaseModel):
    cells: List[TimetableCell]


class DisplayNameUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class NicknameUpdate(BaseModel):
    nickname: str = Field(max_length=100)  # empty string clears the nickname, falls back to their real name


class ConnectionOut(BaseModel):
    id: int
    user: UserOut
    nickname: Optional[str] = None
