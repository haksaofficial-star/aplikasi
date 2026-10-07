from datetime import datetime, timezone, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from core import (db, oid, now_iso, hash_password, verify_password, create_access_token,
                  get_current_user, require_admin)

router = APIRouter(prefix="/api")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    password: str = Field(min_length=6)
    role: Literal["admin", "staff"] = "staff"


class PasswordIn(BaseModel):
    password: str = Field(min_length=6)


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


def _public(u: dict) -> dict:
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""),
            "role": u.get("role", "staff"), "created_at": u.get("created_at")}


@router.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if att and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > now:
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi 15 menit lagi.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att.get("count", 0) if att else 0) + 1
        upd = {"count": count}
        if count >= 5:
            upd = {"count": 0, "locked_until": (now + timedelta(minutes=15)).isoformat()}
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(status_code=401, detail="Email atau password salah")
    await db.login_attempts.delete_many({"identifier": ident})
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": _public(user)}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": oid(user["id"])})
    if not verify_password(body.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    await db.users.update_one({"_id": doc["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


@router.get("/users")
async def list_users(_: dict = Depends(require_admin)):
    return [_public(u) async for u in db.users.find({}).sort("created_at", 1)]


@router.post("/users")
async def create_user(body: UserIn, _: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = {"email": email, "name": body.name, "role": body.role,
           "password_hash": hash_password(body.password), "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _public(doc)


@router.put("/users/{user_id}/password")
async def reset_user_password(user_id: str, body: PasswordIn, _: dict = Depends(require_admin)):
    res = await db.users.update_one({"_id": oid(user_id)}, {"$set": {"password_hash": hash_password(body.password)}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
    await db.users.delete_one({"_id": oid(user_id)})
    return {"ok": True}
