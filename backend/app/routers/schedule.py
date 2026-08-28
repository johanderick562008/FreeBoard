from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, TimetableEntry, Connection
from ..security import get_current_user

router = APIRouter(prefix="/schedule", tags=["schedule"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def _my_board(db: Session, user: User) -> list[User]:
    """Everyone whose timetable this user is allowed to see on their board: themself + accepted connections."""
    rows = db.query(Connection).filter_by(owner_user_id=user.id, status="accepted").all()
    ids = [r.other_user_id for r in rows] + [user.id]
    return db.query(User).filter(User.id.in_(ids)).all()


def _status_map(db: Session, people_ids: list[int]) -> dict:
    """user_id -> {(day, slot_index): (label, is_free)}"""
    rows = db.query(TimetableEntry).filter(TimetableEntry.user_id.in_(people_ids)).all()
    out: dict = {uid: {} for uid in people_ids}
    for r in rows:
        out.setdefault(r.user_id, {})[(r.day, r.slot_index)] = (r.label, r.is_free)
    return out


@router.get("/live")
def live(day: str = Query(...), slot_index: int = Query(..., ge=0, le=7),
          db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if day not in DAYS:
        raise HTTPException(status_code=400, detail="Invalid day.")
    board = _my_board(db, user)
    status = _status_map(db, [p.id for p in board])

    free, busy = [], []
    for p in board:
        entry = status.get(p.id, {}).get((day, slot_index))
        label, is_free = entry if entry else ("Not set", False)
        target = free if is_free else busy
        target.append({"user_id": p.id, "username": p.username, "display_name": p.display_name, "label": label})
    return {"free": free, "busy": busy}


@router.get("/browse")
def browse(day: str = Query(...), slot_index: int = Query(..., ge=0, le=7),
            db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return live(day=day, slot_index=slot_index, db=db, user=user)


@router.get("/together")
def together(user_ids: str = Query(..., description="comma-separated user ids, min 2"),
              db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        ids = [int(x) for x in user_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="user_ids must be comma-separated integers.")
    if len(ids) < 2:
        raise HTTPException(status_code=400, detail="Pick at least 2 people.")

    board_ids = {p.id for p in _my_board(db, user)}
    if not set(ids).issubset(board_ids):
        raise HTTPException(status_code=403, detail="You can only compare people on your own board.")

    status = _status_map(db, ids)
    results = {d: [] for d in DAYS}
    for d in DAYS:
        for slot_index in range(8):
            if all(status.get(uid, {}).get((d, slot_index), ("", False))[1] for uid in ids):
                results[d].append(slot_index)
    return results
