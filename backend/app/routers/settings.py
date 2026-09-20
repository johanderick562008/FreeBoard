import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import User
from ..security import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SLOTS = [
    {"start": "08:45", "end": "09:45", "label": "08:45 – 09:45"},
    {"start": "09:45", "end": "10:45", "label": "09:45 – 10:45"},
    {"start": "11:00", "end": "12:00", "label": "11:00 – 12:00"},
    {"start": "12:00", "end": "13:00", "label": "12:00 – 01:00"},
    {"start": "13:00", "end": "14:00", "label": "01:00 – 02:00"},
    {"start": "14:00", "end": "15:00", "label": "02:00 – 03:00"},
    {"start": "15:15", "end": "16:15", "label": "03:15 – 04:15"},
    {"start": "16:15", "end": "17:15", "label": "04:15 – 05:15"},
]


class PeriodSlot(BaseModel):
    start: str
    end: str
    label: str


class PeriodSlotsUpdate(BaseModel):
    slots: List[PeriodSlot] = Field(min_length=1, max_length=16)


@router.get("/periods/{user_id}")
def get_periods_for_user(user_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    """Each person's own period structure — how many periods they have and what
    times they run, exactly as they set it. Falls back to the default 8 if that
    person never customized it."""
    row = db.execute(
        text("SELECT slots_json FROM period_settings WHERE user_id = :uid"), {"uid": user_id}
    ).fetchone()
    if not row:
        return {"slots": DEFAULT_SLOTS}
    return {"slots": json.loads(row[0])}


@router.put("/periods")
def set_my_periods(body: PeriodSlotsUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Saves the CURRENT user's own period structure — never anyone else's."""
    for s in body.slots:
        if s.end <= s.start:
            raise HTTPException(status_code=422, detail=f"End time must be after start time ({s.label}).")

    slots_json = json.dumps([s.model_dump() for s in body.slots])
    db.execute(
        text("""
            INSERT INTO period_settings (user_id, slots_json) VALUES (:uid, :slots)
            ON DUPLICATE KEY UPDATE slots_json = :slots
        """),
        {"uid": user.id, "slots": slots_json},
    )
    db.commit()
    return {"status": "saved"}
