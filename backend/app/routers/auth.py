from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..security import create_access_token, set_session_cookie, clear_session_cookie, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google/login")
async def google_login(request: Request):
    # Authlib handles the CSRF `state` param for us as part of the OAuth flow
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        info = token["userinfo"]
    except Exception as e:
        print("GOOGLE OAUTH ERROR:", repr(e))
        raise HTTPException(
            status_code=400,
            detail="Google sign-in failed. Please try again.")

    google_sub = info["sub"]
    email = info["email"]

    user = db.query(User).filter(User.google_sub == google_sub).first()
    is_new = False
    if not user:
        is_new = True
        # temporary placeholder username — user must claim a real one before using the app
        placeholder = f"user{google_sub[-8:]}"
        user = User(
            google_sub=google_sub,
            email=email,
            username=placeholder,
            display_name=info.get("name", email.split("@")[0]),
            avatar_url=info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(user.id)
    dest = f"{settings.FRONTEND_ORIGIN}/app.html" + ("?setup=1" if is_new else "")
    resp = RedirectResponse(url=dest)
    set_session_cookie(resp, jwt_token)
    return resp


@router.post("/logout")
def logout():
    resp = RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/index.html")
    clear_session_cookie(resp)
    return resp


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "email": user.email,
    }
