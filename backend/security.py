import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from database import get_db
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

ENV_FILE = BASE_DIR / "services" / ".env"

load_dotenv(ENV_FILE)
load_dotenv(BASE_DIR.parent / "services" / ".env")
load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

_hasher = PasswordHash.recommended()
bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _hasher.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    conn = get_db()
    row = conn.execute(
        "SELECT id, email, role FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()

    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return dict(row)


def require_role(*roles: str):
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
        return user

    return checker