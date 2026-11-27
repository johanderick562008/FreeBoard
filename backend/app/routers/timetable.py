from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, TimetableEntry, Connection
from ..schemas import TimetableBulkUpdate
from ..security import get_current_user

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.put("/bulk")
def save_bulk(body: TimetableBulkUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for cell in body.cells:
        is_free = cell.label.strip().lower() == "free"
        row = (
            db.query(TimetableEntry)
            .filter_by(user_id=user.id, day=cell.day, slot_index=cell.slot_index)
            .first()
        )
        if row:
            row.label = cell.label.strip() or "Class"
            row.is_free = is_free
            row.source = "manual"
        else:
            db.add(TimetableEntry(
                user_id=user.id, day=cell.day, slot_index=cell.slot_index,
                label=cell.label.strip() or "Class", is_free=is_free, source="manual",
            ))
    db.commit()
    return {"status": "saved", "count": len(body.cells)}


@router.delete("/clear")
def clear_timetable(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Wipes every timetable entry for the current user (e.g. starting a new semester)."""
    deleted = db.query(TimetableEntry).filter_by(user_id=user.id).delete()
    db.commit()
    return {"status": "cleared", "count": deleted}


def _visible_or_404(db: Session, viewer: User, target_id: int) -> User:
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == viewer.id or target.privacy == "public":
        return target
    if target.privacy == "connections":
        linked = db.query(Connection).filter_by(owner_user_id=viewer.id, other_user_id=target.id, status="accepted").first()
        if linked:
            return target
    raise HTTPException(status_code=403, detail="This person's timetable is private.")


@router.get("/{user_id}")
def get_timetable(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    target = _visible_or_404(db, user, user_id)
    rows = db.query(TimetableEntry).filter_by(user_id=target.id).all()
    return [{"day": r.day, "slot_index": r.slot_index, "label": r.label, "is_free": r.is_free} for r in rows]


# ---------------- Copy a classmate's timetable ----------------
# Everyone in a section shares one timetable, so a new user can copy a friend's instead of
# filling every cell. You can only copy from someone whose timetable you're already allowed
# to see (same rule as viewing it). The friend isn't told and nothing of theirs changes.

@router.get("/copy/candidates")
def copy_candidates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """People on my board whose timetable I can see, with how many periods they've filled
    in, so the picker can show "30 classes set" and skip empty timetables."""
    ids = [r.other_user_id for r in
           db.query(Connection).filter_by(owner_user_id=user.id, status="accepted").all()]
    if not ids:
        return []
    counts = dict(
        db.query(TimetableEntry.user_id, func.count(TimetableEntry.id))
        .filter(TimetableEntry.user_id.in_(ids)).group_by(TimetableEntry.user_id).all()
    )
    return [{"user_id": uid, "filled": int(counts.get(uid, 0))} for uid in ids]


@router.post("/copy/{user_id}")
def copy_timetable(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Replaces MY timetable and period times with a copy of user_id's."""
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="That's your own timetable.")
    source = _visible_or_404(db, user, user_id)
    rows = db.query(TimetableEntry).filter_by(user_id=source.id).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Their timetable is empty, so there's nothing to copy.")

    # Period times travel with the timetable: each class is stored against a period number,
    # which only means the right time when read with the same period times.
    periods = db.execute(text("SELECT slots_json FROM period_settings WHERE user_id = :uid"),
                         {"uid": source.id}).fetchone()
    if periods:
        db.execute(text("""
            INSERT INTO period_settings (user_id, slots_json) VALUES (:uid, :slots)
            ON DUPLICATE KEY UPDATE slots_json = :slots
        """), {"uid": user.id, "slots": periods[0]})
    else:
        db.execute(text("DELETE FROM period_settings WHERE user_id = :uid"), {"uid": user.id})  # both on the defaults

    db.query(TimetableEntry).filter_by(user_id=user.id).delete()
    for r in rows:
        db.add(TimetableEntry(user_id=user.id, day=r.day, slot_index=r.slot_index,
                              label=r.label, is_free=r.is_free, source="manual"))
    db.commit()
    return {"status": "copied", "count": len(rows), "classes": sum(1 for r in rows if not r.is_free)}
