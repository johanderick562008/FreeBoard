from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User, Connection, Ping
from ..schemas import PingOut, PingRespond, UserOut
from ..security import get_current_user

router = APIRouter(prefix="/pings", tags=["pings"])
limiter = Limiter(key_func=get_remote_address)


def _are_connected(db: Session, a: int, b: int) -> bool:
    """Pings only make sense between people who can already see each other's free time."""
    row = db.query(Connection).filter_by(owner_user_id=a, other_user_id=b, status="accepted").first()
    return row is not None


@router.post("/{to_user_id}", response_model=PingOut)
@limiter.limit("20/minute")
def send_ping(to_user_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if to_user_id == user.id:
        raise HTTPException(status_code=400, detail="You can't ping yourself.")
    target = db.query(User).filter(User.id == to_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if not _are_connected(db, user.id, to_user_id):
        raise HTTPException(status_code=403, detail="You can only ping people on your board.")

    ping = Ping(from_user_id=user.id, to_user_id=to_user_id, status="sent")
    db.add(ping)
    db.commit()
    db.refresh(ping)
    return PingOut(id=ping.id, user=UserOut.model_validate(user), status=ping.status)


@router.get("/incoming", response_model=list[PingOut])
def incoming_pings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Ping).filter_by(to_user_id=user.id, status="sent").order_by(Ping.created_at.desc()).all()
    if not rows:
        return []
    senders = {u.id: u for u in db.query(User).filter(User.id.in_([r.from_user_id for r in rows])).all()}
    return [
        PingOut(id=r.id, user=UserOut.model_validate(senders[r.from_user_id]), status=r.status)
        for r in rows if r.from_user_id in senders
    ]


@router.post("/{ping_id}/respond")
def respond_to_ping(ping_id: int, body: PingRespond, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(Ping).filter_by(id=ping_id, to_user_id=user.id, status="sent").first()
    if not row:
        raise HTTPException(status_code=404, detail="Ping not found.")
    row.status = body.status
    db.commit()
    return {"status": row.status}
