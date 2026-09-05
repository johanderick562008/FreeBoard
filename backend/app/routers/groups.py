from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Group, GroupMember, TimetableEntry, DAYS
from ..schemas import GroupCreate, GroupOut, GroupMemberOut, GroupInviteIn, UserOut
from ..security import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


def _member_count(db: Session, group_id: int) -> int:
    return db.query(GroupMember).filter_by(group_id=group_id, status="accepted").count()


def _require_membership(db: Session, group_id: int, user: User) -> Group:
    """Raises 404 unless the caller is an accepted member (or the owner) of this group —
    membership itself isn't leaked to people outside the group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group.owner_user_id == user.id:
        return group
    member = db.query(GroupMember).filter_by(group_id=group_id, user_id=user.id, status="accepted").first()
    if not member:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


@router.post("", response_model=GroupOut)
def create_group(body: GroupCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = Group(name=body.name.strip(), owner_user_id=user.id)
    db.add(group)
    db.flush()  # get group.id before the membership row needs it
    db.add(GroupMember(group_id=group.id, user_id=user.id, status="accepted"))
    db.commit()
    db.refresh(group)
    return GroupOut(id=group.id, name=group.name, owner_user_id=group.owner_user_id, member_count=1)


@router.get("", response_model=list[GroupOut])
def list_my_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(GroupMember).filter_by(user_id=user.id, status="accepted").all()
    if not rows:
        return []
    groups = db.query(Group).filter(Group.id.in_([r.group_id for r in rows])).all()
    return [
        GroupOut(id=g.id, name=g.name, owner_user_id=g.owner_user_id, member_count=_member_count(db, g.id))
        for g in groups
    ]


@router.get("/{group_id}/members", response_model=list[GroupMemberOut])
def list_group_members(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = _require_membership(db, group_id, user)
    rows = db.query(GroupMember).filter_by(group_id=group_id).filter(GroupMember.status != "declined").all()
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_([r.user_id for r in rows])).all()}
    return [
        GroupMemberOut(
            user=UserOut.model_validate(users_by_id[r.user_id]),
            status=r.status,
            is_owner=(r.user_id == group.owner_user_id),
        )
        for r in rows if r.user_id in users_by_id
    ]


@router.post("/{group_id}/invite")
def invite_to_group(group_id: int, body: GroupInviteIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_membership(db, group_id, user)  # only current members can invite others
    target = db.query(User).filter(User.id == body.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    existing = db.query(GroupMember).filter_by(group_id=group_id, user_id=body.user_id).first()
    if existing:
        if existing.status == "declined":
            existing.status = "pending"
            db.commit()
            return {"status": "pending"}
        return {"status": existing.status}
    db.add(GroupMember(group_id=group_id, user_id=body.user_id, status="pending"))
    db.commit()
    return {"status": "pending"}


@router.get("/invites")
def list_my_group_invites(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(GroupMember).filter_by(user_id=user.id, status="pending").all()
    if not rows:
        return []
    groups_by_id = {g.id: g for g in db.query(Group).filter(Group.id.in_([r.group_id for r in rows])).all()}
    return [
        {"member_id": r.id, "group_id": r.group_id, "group_name": groups_by_id[r.group_id].name}
        for r in rows if r.group_id in groups_by_id
    ]


@router.post("/invites/{member_id}/accept")
def accept_group_invite(member_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(GroupMember).filter_by(id=member_id, user_id=user.id, status="pending").first()
    if not row:
        raise HTTPException(status_code=404, detail="Invite not found.")
    row.status = "accepted"
    db.commit()
    return {"status": "accepted"}


@router.post("/invites/{member_id}/decline")
def decline_group_invite(member_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(GroupMember).filter_by(id=member_id, user_id=user.id, status="pending").first()
    if not row:
        raise HTTPException(status_code=404, detail="Invite not found.")
    row.status = "declined"
    db.commit()
    return {"status": "declined"}


@router.delete("/{group_id}/members/{user_id}")
def remove_or_leave(group_id: int, user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    is_self = user_id == user.id
    is_owner = group.owner_user_id == user.id
    if not is_self and not is_owner:
        raise HTTPException(status_code=403, detail="Only the group owner can remove other members.")
    if is_self and is_owner:
        raise HTTPException(status_code=400, detail="The owner can't leave — delete the group instead.")
    db.query(GroupMember).filter_by(group_id=group_id, user_id=user_id).delete()
    db.commit()
    return {"status": "removed"}


@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id, Group.owner_user_id == user.id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    db.delete(group)  # GroupMember rows cascade via ON DELETE CASCADE
    db.commit()
    return {"status": "deleted"}


@router.get("/{group_id}/schedule/live")
def group_live(group_id: int, day: str = Query(...), slot_index: int = Query(..., ge=0, le=7),
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if day not in DAYS:
        raise HTTPException(status_code=400, detail="Invalid day.")
    _require_membership(db, group_id, user)
    member_rows = db.query(GroupMember).filter_by(group_id=group_id, status="accepted").all()
    member_ids = [r.user_id for r in member_rows]
    members = db.query(User).filter(User.id.in_(member_ids)).all()

    entries = (
        db.query(TimetableEntry)
        .filter(TimetableEntry.user_id.in_(member_ids), TimetableEntry.day == day, TimetableEntry.slot_index == slot_index)
        .all()
    )
    status_by_user = {e.user_id: (e.label, e.is_free) for e in entries}

    free, busy = [], []
    for m in members:
        label, is_free = status_by_user.get(m.id, ("Not set", False))
        target = free if is_free else busy
        target.append({"user_id": m.id, "username": m.username, "display_name": m.display_name, "label": label})
    return {"free": free, "busy": busy}
