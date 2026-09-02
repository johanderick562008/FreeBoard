from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

ALGORITHM = "HS256"
COOKIE_NAME = "freeboard_session"


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Reads the httpOnly session cookie — never trusts a header/body-supplied user id."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in.")
    user_id = decode_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account no longer exists.")
    return user


def set_session_cookie(response, token: str):
    is_prod = settings.ENV != "development"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_prod,          # Secure requires HTTPS — off only for local dev
        # Frontend and backend live on different domains once hosted, so the cookie
        # needs SameSite=None to be sent on those cross-site fetch() calls. None
        # requires Secure, which is why this is only safe to flip in production.
        samesite="none" if is_prod else "lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )

-
def clear_session_cookie(response):
    response.delete_cookie(COOKIE_NAME, path="/")
