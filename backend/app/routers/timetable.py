from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, TimetableEntry, Connection
from ..schemas import TimetableBulkUpdate, OcrReviewResult
from ..security import get_current_user
from ..services.ocr_service import extract_grid_from_image

router = APIRouter(prefix="/timetable", tags=["timetable"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload-preview", response_model=OcrReviewResult)
async def upload_preview(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Runs OCR and returns a best-guess grid. Nothing is saved yet — the user
    reviews/edits this on the frontend, then calls /timetable/bulk to save."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image.")
    raw = await file.read()
    try:
        cells = extract_grid_from_image(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    low_conf = sum(1 for c in cells if c.confidence < 0.5)
    note = (
        "We couldn't read this clearly — please fill in the highlighted cells by hand."
        if low_conf > len(cells) / 2
        else "Pre-filled from your photo — please check each cell before saving."
    )
    return OcrReviewResult(cells=cells, note=note)


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


def _visible_or_404(db: Session, viewer: User, target_id: int) -> User:
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == viewer.id or target.privacy == "public":
        return target
    if target.privacy == "connections":
        linked = db.query(Connection).filter_by(owner_user_id=viewer.id, other_user_id=target.id).first()
        if linked:
            return target
    raise HTTPException(status_code=403, detail="This person's timetable is private.")


@router.get("/{user_id}")
def get_timetable(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    target = _visible_or_404(db, user, user_id)
    rows = db.query(TimetableEntry).filter_by(user_id=target.id).all()
    return [{"day": r.day, "slot_index": r.slot_index, "label": r.label, "is_free": r.is_free} for r in rows]
