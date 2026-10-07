from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, oid, now_iso, BaseDocument, get_current_user
from routes_finance import ledger

router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])


class Student(BaseDocument):
    nama: str
    job: str = ""
    tsk: str = ""
    no_hp: str = ""
    tanggal_daftar: str = ""
    biaya: float = 0
    est_visa: float = 2300000
    est_ktkln: float = 200000
    est_mcu: float = 800000
    est_tsk: float = 15000000
    status: str = "Proses"
    catatan: str = ""
    created_at: str = ""


class StudentIn(BaseModel):
    nama: str = Field(min_length=1)
    job: str = ""
    tsk: str = ""
    no_hp: str = ""
    tanggal_daftar: str = ""
    biaya: float = Field(default=0, ge=0)
    est_visa: float = Field(default=2300000, ge=0)
    est_ktkln: float = Field(default=200000, ge=0)
    est_mcu: float = Field(default=800000, ge=0)
    est_tsk: float = Field(default=15000000, ge=0)
    status: str = "Proses"
    catatan: str = ""


def summarize(s: dict, agg: dict) -> dict:
    a = agg or {"masuk": 0.0, "keluar": 0.0, "count": 0, "last": "", "by_kat": {}}
    est_cost = s["est_visa"] + s["est_ktkln"] + s["est_mcu"] + s["est_tsk"]
    s.update({
        "total_bayar": a["masuk"], "total_keluar": a["keluar"], "jumlah_transaksi": a["count"],
        "terakhir": a["last"], "pengeluaran_per_kategori": dict(a["by_kat"]),
        "kekurangan": max(s["biaya"] - a["masuk"], 0) if s["biaya"] > 0 else None,
        "lebih_bayar": max(a["masuk"] - s["biaya"], 0) if s["biaya"] > 0 else 0,
        "profit_aktual": a["masuk"] - a["keluar"],
        "estimasi_biaya": est_cost,
        "estimasi_profit": s["biaya"] - est_cost if s["biaya"] > 0 else None,
        "lunas": s["biaya"] > 0 and a["masuk"] >= s["biaya"],
    })
    return s


async def aggregates() -> dict:
    agg = defaultdict(lambda: {"masuk": 0.0, "keluar": 0.0, "count": 0, "last": "", "by_kat": defaultdict(float)})
    async for t in db.transactions.find({"student_id": {"$ne": None}}):
        a = agg[t["student_id"]]
        a["masuk"] += t.get("masuk", 0)
        a["keluar"] += t.get("keluar", 0)
        a["count"] += 1
        a["last"] = max(a["last"], t.get("tanggal") or "")
        if t.get("keluar", 0) > 0:
            a["by_kat"][t.get("kategori") or "Lainnya"] += t["keluar"]
    return agg


async def all_students() -> list:
    agg = await aggregates()
    docs = await db.students.find({}).sort("nama", 1).to_list(None)
    return [summarize(Student.from_mongo(d).model_dump(), agg.get(str(d["_id"]))) for d in docs]


@router.get("/students")
async def list_students():
    return await all_students()


@router.post("/students")
async def create_student(body: StudentIn):
    st = Student(**body.model_dump(), created_at=now_iso())
    res = await db.students.insert_one(st.to_mongo())
    st.id = str(res.inserted_id)
    return summarize(st.model_dump(), None)


@router.get("/students/{sid}")
async def get_student(sid: str):
    doc = await db.students.find_one({"_id": oid(sid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    agg = await aggregates()
    data = summarize(Student.from_mongo(doc).model_dump(), agg.get(sid))
    data["transaksi"] = (await ledger({"student_id": sid}))[::-1]
    return data


@router.put("/students/{sid}")
async def update_student(sid: str, body: StudentIn):
    res = await db.students.update_one({"_id": oid(sid)}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    return {"ok": True}


@router.delete("/students/{sid}")
async def delete_student(sid: str):
    await db.students.delete_one({"_id": oid(sid)})
    deleted = await db.transactions.delete_many({"student_id": sid})
    return {"ok": True, "transaksi_dihapus": deleted.deleted_count}


class Job(BaseDocument):
    nama_job: str
    tsk: str = ""
    status: str = "open"
    jumlah_peserta: int = 0
    lolos: int = 0
    tidak_lolos: int = 0
    biaya: float = 0
    catatan: str = ""


class JobIn(BaseModel):
    nama_job: str = Field(min_length=1)
    tsk: str = ""
    status: str = "open"
    jumlah_peserta: int = Field(default=0, ge=0)
    lolos: int = Field(default=0, ge=0)
    tidak_lolos: int = Field(default=0, ge=0)
    biaya: float = Field(default=0, ge=0)
    catatan: str = ""


@router.get("/jobs")
async def list_jobs():
    return [Job.from_mongo(d).model_dump() async for d in db.jobs.find({}).sort("nama_job", 1)]


@router.post("/jobs")
async def create_job(body: JobIn):
    job = Job(**body.model_dump())
    res = await db.jobs.insert_one(job.to_mongo())
    job.id = str(res.inserted_id)
    return job.model_dump()


@router.put("/jobs/{jid}")
async def update_job(jid: str, body: JobIn):
    res = await db.jobs.update_one({"_id": oid(jid)}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return {"ok": True}


@router.delete("/jobs/{jid}")
async def delete_job(jid: str):
    await db.jobs.delete_one({"_id": oid(jid)})
    return {"ok": True}
