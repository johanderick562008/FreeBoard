"""Groups ("shortcuts"): private, named lists of people from your own board.

Like Snapchat shortcuts / WhatsApp lists: a student makes "Hostellers", "Cricket team",
"Class"... and picks people from their accepted connections. Only the owner ever sees
their groups. Live Now, Browse and People can then be filtered to one group.

Tables (see backend/migrations/add_groups.sql):
  board_groups         (id, owner_user_id, name, created_at)
  board_group_members  (group_id, member_user_id)
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])

MAX_GROUPS = 30
MAX_MEMBERS = 200
MAX_NAME = 40


class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_NAME)
    member_ids: List[int] = Field(default_factory=list, max_length=MAX_MEMBERS)


# ------------------------------------------------------------------ helpers ---
def _board_ids(db: Session, user_id: int) -> set:
    rows = db.execute(
        text("SELECT other_user_id FROM connections WHERE owner_user_id = :u AND status = 'accepted'"),
        {"u": user_id},
    ).fetchall()
    return {r[0] for r in rows}


def _list_groups(db: Session, user_id: int) -> list:
    groups = db.execute(
        text("SELECT id, name FROM board_groups WHERE owner_user_id = :u ORDER BY created_at, id"),
        {"u": user_id},
    ).fetchall()
    if not groups:
        return []
    # Members = me, or people who are STILL on my board (someone I removed drops out).
    members = db.execute(
        text("""
            SELECT m.group_id, m.member_user_id
            FROM board_group_members m
            JOIN board_groups g ON g.id = m.group_id
            LEFT JOIN connections c ON c.owner_user_id = g.owner_user_id
                                   AND c.other_user_id = m.member_user_id
                                   AND c.status = 'accepted'
            WHERE g.owner_user_id = :u
              AND (c.id IS NOT NULL OR m.member_user_id = g.owner_user_id)
        """),
        {"u": user_id},
    ).fetchall()
    by_group = {}
    for gid, mid in members:
        by_group.setdefault(gid, []).append(mid)
    return [{"id": gid, "name": name, "member_ids": sorted(by_group.get(gid, []))} for gid, name in groups]


def _own_group(db: Session, user_id: int, group_id: int):
    row = db.execute(
        text("SELECT id FROM board_groups WHERE id = :g AND owner_user_id = :u"),
        {"g": group_id, "u": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(404, "Group not found.")


def _clean(db: Session, user_id: int, body: GroupIn, exclude_id: int = None):
    name = " ".join(body.name.split())          # trim + collapse spaces
    if not name:
        raise HTTPException(422, "Give the group a name.")
    ids = list(dict.fromkeys(body.member_ids))   # remove duplicates, keep order
    if not ids:
        raise HTTPException(422, "Add at least one person to the group.")
    if not set(ids) <= _board_ids(db, user_id) | {user_id}:   # my board + me
        raise HTTPException(422, "You can only add people who are on your board.")
    existing = db.execute(
        text("SELECT id, name FROM board_groups WHERE owner_user_id = :u"), {"u": user_id}
    ).fetchall()
    if any(gid != exclude_id and gname.lower() == name.lower() for gid, gname in existing):
        raise HTTPException(409, f'You already have a group called "{name}".')
    return name, ids, len(existing)


def _set_members(db: Session, group_id: int, ids: list):
    db.execute(text("DELETE FROM board_group_members WHERE group_id = :g"), {"g": group_id})
    db.execute(
        text("INSERT INTO board_group_members (group_id, member_user_id) VALUES (:g, :m)"),
        [{"g": group_id, "m": m} for m in ids],
    )


def _result(group_id: int, name: str, ids: list) -> dict:
    return {"id": group_id, "name": name, "member_ids": sorted(ids)}


# ------------------------------------------------------------------- routes ---
@router.get("")
def list_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """My groups only - nobody else can ever see them."""
    return _list_groups(db, user.id)


@router.post("")
def create_group(body: GroupIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    name, ids, count = _clean(db, user.id, body)
    if count >= MAX_GROUPS:
        raise HTTPException(422, f"You can have up to {MAX_GROUPS} groups.")
    try:
        res = db.execute(
            text("INSERT INTO board_groups (owner_user_id, name) VALUES (:u, :n)"),
            {"u": user.id, "n": name},
        )
        group_id = res.lastrowid
        _set_members(db, group_id, ids)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _result(group_id, name, ids)


@router.put("/{group_id}")
def update_group(group_id: int, body: GroupIn, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    """Rename and/or replace the member list (add + remove people in one save)."""
    _own_group(db, user.id, group_id)
    name, ids, _ = _clean(db, user.id, body, exclude_id=group_id)
    try:
        db.execute(text("UPDATE board_groups SET name = :n WHERE id = :g"), {"n": name, "g": group_id})
        _set_members(db, group_id, ids)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _result(group_id, name, ids)


@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Deletes the group only - the people stay on your board."""
    _own_group(db, user.id, group_id)
    try:
        db.execute(text("DELETE FROM board_group_members WHERE group_id = :g"), {"g": group_id})
        db.execute(text("DELETE FROM board_groups WHERE id = :g"), {"g": group_id})
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"status": "deleted"}
