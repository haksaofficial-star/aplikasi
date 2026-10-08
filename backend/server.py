from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from core import db, client, hash_password, verify_password, now_iso
import routes_auth
import routes_finance
import routes_students
import routes_reports

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Jurnal Keuangan Hakusa Edu")
for r in (routes_auth, routes_finance, routes_students, routes_reports):
    app.include_router(r.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_OPTIONS = {
    "kategori_masuk": ["Job Matching", "Kursus/Kelas N4-N5", "Lainnya"],
    "kategori_keluar": ["Visa", "KTKLN", "MCU", "TSK", "Transport & Akomodasi", "Gaji", "Operasional", "Lainnya"],
    "buku": ["Kas JATIM", "Kas TG"],
}


@app.get("/api/")
async def root():
    return {"message": "Jurnal Keuangan Hakusa Edu API"}


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.transactions.create_index([("tanggal", 1), ("created_at", 1)])
    await db.transactions.create_index("student_id")
    await db.options.create_index([("type", 1), ("name", 1)], unique=True)
    email, password = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "name": "Admin Hakusa", "role": "admin",
                                   "password_hash": hash_password(password), "created_at": now_iso()})
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": hash_password(password)}})
    if not await db.options.count_documents({}):
        await db.options.insert_many([{"type": t, "name": n, "order": i}
                                      for t, names in DEFAULT_OPTIONS.items() for i, n in enumerate(names)])
    if not await db.meta.find_one({"_id": "excel_import"}):
        if not await db.transactions.count_documents({}):
            import import_excel
            await import_excel.main(False)
        await db.meta.insert_one({"_id": "excel_import", "at": now_iso()})


@app.on_event("shutdown")
async def shutdown():
    client.close()
