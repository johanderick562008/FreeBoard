from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User, Connection
from ..schemas import UserOut, UsernameSetup, DisplayNameUpdate, NicknameUpdate, ConnectionOut
from ..security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/username", response_model=UserOut)
def set_username(
    body: UsernameSetup,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    existing = db.query(User).filter(
        User.username == body.username,
        User.id != user.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="That username is already taken."
        )

    user.username = body.username
    db.commit()
    db.refresh(user)
    return user


@router.patch("/me", response_model=UserOut)
def update_my_name(body: DisplayNameUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.display_name = body.display_name.strip()
    db.commit()
    db.refresh(user)
    return user

@router.get("/search")
@limiter.limit("20/minute")
def search_users(request: Request,q: str,db: Session = Depends(get_db),user: User = Depends(get_current_user)):
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Type at least 2 characters to search.")
    results = (
        db.query(User)
        .filter(User.id != user.id)
        .filter(or_(User.username.ilike(f"%{q}%"), User.display_name.ilike(f"%{q}%")))
        .limit(15)
        .all()
    )
    return results


@router.post("/connections/{other_user_id}")
def send_connection_request(other_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Sends a request to add other_user_id to my board — does NOT add them yet.
    They only appear on my board once they accept (see /connections/requests/{id}/accept)."""
    if other_user_id == user.id:
        raise HTTPException(status_code=400, detail="You can't add yourself.")
    target = db.query(User).filter(User.id == other_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    existing = db.query(Connection).filter_by(owner_user_id=user.id, other_user_id=other_user_id).first()
    if existing:
        return {"status": existing.status, "user": UserOut.model_validate(target)}
    db.add(Connection(owner_user_id=user.id, other_user_id=other_user_id, status="pending"))
    db.commit()
    return {"status": "pending", "user": UserOut.model_validate(target)}


@router.delete("/connections/{other_user_id}")
def remove_connection(other_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Connection).filter_by(owner_user_id=user.id, other_user_id=other_user_id).delete()
    db.commit()
    return {"status": "removed"}


@router.get("/connections", response_model=list[ConnectionOut])
def list_connections(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """My board — only accepted requests, with my private nickname for each person if I set one."""
    rows = db.query(Connection).filter_by(owner_user_id=user.id, status="accepted").all()
    if not rows:
        return []
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_([r.other_user_id for r in rows])).all()}
    return [
        ConnectionOut(id=r.id, user=UserOut.model_validate(users_by_id[r.other_user_id]), nickname=r.nickname)
        for r in rows if r.other_user_id in users_by_id
    ]


@router.get("/connections/incoming")
def list_incoming_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Requests other people have sent ME, waiting on my accept/decline."""
    rows = db.query(Connection).filter_by(other_user_id=user.id, status="pending").all()
    if not rows:
        return []
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_([r.owner_user_id for r in rows])).all()}
    return [
        {"request_id": r.id, "user": UserOut.model_validate(users_by_id[r.owner_user_id])}
        for r in rows if r.owner_user_id in users_by_id
    ]


@router.post("/connections/requests/{request_id}/accept")
def accept_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(Connection).filter_by(id=request_id, other_user_id=user.id, status="pending").first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")
    row.status = "accepted"
    db.commit()
    return {"status": "accepted"}


@router.post("/connections/requests/{request_id}/decline")
def decline_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(Connection).filter_by(id=request_id, other_user_id=user.id, status="pending").first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")
    row.status = "declined"
    db.commit()
    return {"status": "declined"}


@router.patch("/connections/{other_user_id}/nickname")
def set_nickname(other_user_id: int, body: NicknameUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Renames how a person shows up on MY board only — their real name is unchanged for everyone else."""
    row = db.query(Connection).filter_by(owner_user_id=user.id, other_user_id=other_user_id, status="accepted").first()
    if not row:
        raise HTTPException(status_code=404, detail="That person isn't on your board.")
    row.nickname = body.nickname.strip() or None
    db.commit()
    return {"status": "saved", "nickname": row.nickname}
