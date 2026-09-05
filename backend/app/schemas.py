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


class SearchResultOut(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    # None = never requested, "pending" = you already sent a request, "accepted" = already on your board,
    # "declined" = they declined before, but you're allowed to send again — same as None on the frontend.
    request_status: Optional[str] = None


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

    class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class GroupOut(BaseModel):
    id: int
    name: str
    owner_user_id: int
    member_count: int


class GroupMemberOut(BaseModel):
    user: UserOut
    status: str
    is_owner: bool


class GroupInviteIn(BaseModel):
    user_id: int

