import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_db
from security import (create_access_token, get_current_user,
                      hash_password, verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: Credentials):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (data.email, hash_password(data.password)),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    finally:
        conn.close()
    return {"message": "User created"}


@router.post("/login")
def login(data: Credentials):
    conn = get_db()
    row = conn.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (data.email,)
    ).fetchone()
    conn.close()

    if row is None or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")

    return {"access_token": create_access_token(row["id"]), "token_type": "bearer"}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user