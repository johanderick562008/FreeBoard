from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..security import (create_access_token, set_session_cookie, clear_session_cookie, get_current_user,
                        decode_token, COOKIE_NAME, create_signup_token, read_signup,
                        set_signup_cookie, clear_signup_cookie)

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
    if user:
        resp = RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/app")
        set_session_cookie(resp, create_access_token(user.id))
        clear_signup_cookie(resp)
        return resp

    # New Google account: do NOT create anything in the database yet. Someone who signs
    # in with the wrong account by mistake and leaves must leave no trace. Their details
    # wait in a short-lived signed cookie; the account is created only when they pick a
    # username (POST /users/username). Any other account's session in this browser is
    # signed out, so the app shows the new account's sign-up and nothing else.
    resp = RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/app?setup=1")
    set_signup_cookie(resp, create_signup_token(
        google_sub, email, info.get("name") or email.split("@")[0], info.get("picture")))
    clear_session_cookie(resp)
    return resp


@router.post("/logout")
def logout():
    # Called with fetch() from the app, so answer with plain JSON. (A redirect here made
    # the browser follow it cross-site, fail on CORS, and the app never reached the
    # sign-in page.) The app goes to the sign-in page itself afterwards.
    resp = JSONResponse({"status": "logged out"})
    clear_session_cookie(resp)
    clear_signup_cookie(resp)      # also drops an unfinished sign-up
    return resp


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    user = None
    token = request.cookies.get(COOKIE_NAME)
    if token:
        try:
            user = db.query(User).filter(User.id == decode_token(token)).first()
        except HTTPException:
            user = None
    if not user:
        pending = read_signup(request)
        if pending:
            # Signed in with Google, username not chosen yet - nothing is saved so far.
            return {"pending": True, "display_name": pending.get("name"),
                    "email": pending.get("email"), "avatar_url": pending.get("pic")}
        raise HTTPException(status_code=401, detail="Not logged in.")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "email": user.email,
    }
