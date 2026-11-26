from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User, Connection
from ..schemas import UserOut, UsernameSetup, DisplayNameUpdate, NicknameUpdate, ConnectionOut
from ..security import (get_current_user, decode_token, COOKIE_NAME, read_signup,
                        create_access_token, set_session_cookie, clear_signup_cookie)
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/users", tags=["users"])
limiter = Limiter(key_func=get_remote_address)


def _session_user(request: Request, db: Session):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        return db.query(User).filter(User.id == decode_token(token)).first()
    except HTTPException:
        return None


@router.post("/username", response_model=UserOut)
def set_username(request: Request, body: UsernameSetup, db: Session = Depends(get_db)):
    user = _session_user(request, db)
    if not user:
        return _finish_signup(request, body, db)

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


def _finish_signup(request: Request, body: UsernameSetup, db: Session):
    """The ONLY place a new account is created: when a new Google user picks a display name and username."""
    pending = read_signup(request)
    if not pending:
        raise HTTPException(status_code=401, detail="Your sign-in expired. Please continue with Google again.")
    if not body.display_name:
        raise HTTPException(status_code=422, detail="Enter your display name.")
    user = db.query(User).filter(User.google_sub == pending["gsub"]).first()   # e.g. a double tap
    if not user:
        if db.query(User).filter(User.username == body.username).first():
            raise HTTPException(status_code=409, detail="That username is already taken.")
        user = User(google_sub=pending["gsub"], email=pending["email"], username=body.username,
                    display_name=body.display_name,   # typed by the person, not taken from Google
                    avatar_url=pending.get("pic"))
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="That username or Google account is already registered.")
        db.refresh(user)
    resp = JSONResponse(UserOut.model_validate(user).model_dump())
    set_session_cookie(resp, create_access_token(user.id))
    clear_signup_cookie(resp)
    return resp


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
    # Like Instagram's Follow / Requested / Following: tell the app where MY request to
    # each person stands, so it never offers "Send request" twice.
    #   "none"      -> never asked, or they declined  -> can send a request
    #   "requested" -> waiting for them to accept
    #   "accepted"  -> already on my board
    mine = {}
    if results:
        rows = db.query(Connection).filter(
            Connection.owner_user_id == user.id,
            Connection.other_user_id.in_([u.id for u in results]),
        ).all()
        mine = {r.other_user_id: r.status for r in rows}
    status_word = {"pending": "requested", "accepted": "accepted"}
    return [
        {"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url,
         "request_status": status_word.get(mine.get(u.id), "none")}
        for u in results
    ]


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
        if existing.status == "declined":
            # They declined an earlier request. Asking again must reach them again —
            # otherwise the old "declined" row just sits there, the sender is told
            # "request sent", and the receiver never sees an Accept/Decline prompt.
            existing.status = "pending"
            db.commit()
        return {"status": existing.status, "user": UserOut.model_validate(target)}
    db.add(Connection(owner_user_id=user.id, other_user_id=other_user_id, status="pending"))
    db.commit()
    return {"status": "pending", "user": UserOut.model_validate(target)}


@router.delete("/connections/{other_user_id}")
def remove_connection(other_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Connection).filter_by(owner_user_id=user.id, other_user_id=other_user_id).delete()
    db.commit()
    return {"status": "removed"}


@router.delete("/connections/{other_user_id}/request")
def unsend_request(other_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Takes back a request I sent that is still waiting (like Instagram's unsend).
    Only touches a PENDING request - if they accepted in the meantime, nothing is removed."""
    row = db.query(Connection).filter_by(owner_user_id=user.id, other_user_id=other_user_id).first()
    if not row:
        return {"status": "none"}
    if row.status != "pending":
        return {"status": "accepted" if row.status == "accepted" else "none"}
    db.delete(row)
    db.commit()
    return {"status": "none"}


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


@router.get("/me/network")
def my_network(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """My two private lists (like Instagram following / followers), for ME only.
    There is deliberately no version of this that takes a user id, so nobody can
    see anyone else's lists or counts.
      on_board     - people whose timetable I can see (my accepted rows)
      can_see_mine - people who can see MY timetable (accepted rows pointing at me)
    "mutual" = both directions are accepted."""
    mine = db.query(Connection).filter_by(owner_user_id=user.id).all()          # rows I own, any status
    theirs = db.query(Connection).filter_by(other_user_id=user.id, status="accepted").all()
    my_status = {r.other_user_id: r.status for r in mine}
    my_nick = {r.other_user_id: r.nickname for r in mine if r.status == "accepted"}
    on_board = [r for r in mine if r.status == "accepted"]
    viewers = {r.owner_user_id for r in theirs}
    ids = {r.other_user_id for r in on_board} | viewers
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(ids)).all()} if ids else {}

    board_out = [
        {"user": UserOut.model_validate(users_by_id[r.other_user_id]).model_dump(),
         "nickname": r.nickname, "mutual": r.other_user_id in viewers}
        for r in on_board if r.other_user_id in users_by_id
    ]
    seeme_out = []
    for r in theirs:
        if r.owner_user_id not in users_by_id:
            continue
        st = my_status.get(r.owner_user_id)
        seeme_out.append({
            "user": UserOut.model_validate(users_by_id[r.owner_user_id]).model_dump(),
            "nickname": my_nick.get(r.owner_user_id),   # my own name for them, if they're on my board
            "mutual": st == "accepted",
            # what the "Add back" button should show: accepted (no button), requested, or none
            "my_request": "accepted" if st == "accepted" else ("requested" if st == "pending" else "none"),
        })
    by_name = lambda x: (x["nickname"] or x["user"]["display_name"]).lower()
    board_out.sort(key=by_name)
    seeme_out.sort(key=by_name)
    return {"on_board": board_out, "can_see_mine": seeme_out}


@router.delete("/me/viewers/{other_user_id}")
def remove_viewer(other_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Stops other_user_id from seeing MY timetable (removes me from their board).
    They aren't notified; they can send a new request later."""
    row = db.query(Connection).filter_by(owner_user_id=other_user_id, other_user_id=user.id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"status": "removed"}


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
