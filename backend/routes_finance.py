from collections import defaultdict
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from core import db, oid, now_iso, BaseDocument, get_current_user

router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])

OptionType = Literal["kategori_masuk", "kategori_keluar", "buku"]


class Transaction(BaseDocument):
    tanggal: str = ""
    keterangan: str = ""
    ref: str = ""
    masuk: float = 0
    keluar: float = 0
    kategori: str = ""
    buku: str = ""
    student_id: Optional[str] = None
    source: str = "manual"
    created_at: str = ""


class TxIn(BaseModel):
    tanggal: str
    keterangan: str = Field(min_length=1)
    ref: str = ""
    masuk: float = Field(default=0, ge=0)
    keluar: float = Field(default=0, ge=0)
    kategori: str = ""
    buku: str = ""
    student_id: Optional[str] = None
    force: bool = False

    @model_validator(mode="after")
    def check_amount(self):
        if self.masuk <= 0 and self.keluar <= 0:
            raise ValueError("Isi jumlah masuk atau keluar")
        return self


class Option(BaseDocument):
    type: str
    name: str
    order: int = 0


class OptionIn(BaseModel):
    type: OptionType
    name: str = Field(min_length=1)


OPTION_FIELD = {"kategori_masuk": "kategori", "kategori_keluar": "kategori", "buku": "buku"}


async def student_names() -> dict:
    return {str(s["_id"]): s["nama"] async for s in db.students.find({}, {"nama": 1})}


async def ledger(base_query: dict) -> list:
    names = await student_names()
    docs = await db.transactions.find(base_query).sort([("tanggal", 1), ("created_at", 1)]).to_list(None)
    saldo, out = 0.0, []
    for d in docs:
        t = Transaction.from_mongo(d).model_dump()
        saldo += t["masuk"] - t["keluar"]
        t["saldo"] = saldo
        t["student_nama"] = names.get(t["student_id"]) if t["student_id"] else None
        out.append(t)
    return out


@router.get("/transactions")
async def list_transactions(buku: str = "", kategori: str = "", q: str = "", start: str = "",
                            end: str = "", jenis: str = "", student_id: str = ""):
    base = {}
    if buku:
        base["buku"] = buku
    if student_id:
        base["student_id"] = student_id
    rows = await ledger(base)
    saldo_akhir = rows[-1]["saldo"] if rows else 0
    ql = q.lower().strip()
    rows = [r for r in rows if (not kategori or r["kategori"] == kategori)
            and (not start or r["tanggal"] >= start) and (not end or (r["tanggal"] and r["tanggal"] <= end))
            and (jenis != "masuk" or r["masuk"] > 0) and (jenis != "keluar" or r["keluar"] > 0)
            and (not ql or ql in r["keterangan"].lower() or ql in (r["student_nama"] or "").lower()
                 or ql in r["ref"].lower())]
    return {"items": rows[::-1], "total_masuk": sum(r["masuk"] for r in rows),
            "total_keluar": sum(r["keluar"] for r in rows), "saldo_akhir": saldo_akhir, "count": len(rows)}


async def _check_duplicate(body: TxIn, exclude_id=None):
    if body.force or not body.student_id:
        return
    query = {"student_id": body.student_id, "tanggal": body.tanggal, "masuk": body.masuk, "keluar": body.keluar}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    if await db.transactions.find_one(query):
        raise HTTPException(status_code=409, detail="Transaksi dengan tanggal & jumlah yang sama sudah tercatat untuk siswa ini.")


@router.post("/transactions")
async def create_transaction(body: TxIn):
    if body.student_id and not await db.students.find_one({"_id": oid(body.student_id)}):
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    await _check_duplicate(body)
    tx = Transaction(**body.model_dump(exclude={"force"}), source="siswa" if body.student_id else "manual",
                     created_at=now_iso())
    res = await db.transactions.insert_one(tx.to_mongo())
    tx.id = str(res.inserted_id)
    return tx.model_dump()


@router.put("/transactions/{tx_id}")
async def update_transaction(tx_id: str, body: TxIn):
    _id = oid(tx_id)
    await _check_duplicate(body, _id)
    data = body.model_dump(exclude={"force"})
    res = await db.transactions.update_one({"_id": _id}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return Transaction.from_mongo(await db.transactions.find_one({"_id": _id})).model_dump()


@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    await db.transactions.delete_one({"_id": oid(tx_id)})
    return {"ok": True}


@router.get("/options")
async def list_options():
    docs = await db.options.find({}).sort([("type", 1), ("order", 1)]).to_list(None)
    counts = defaultdict(int)
    async for g in db.transactions.aggregate([{"$group": {"_id": {"k": "$kategori", "b": "$buku"}, "n": {"$sum": 1}}}]):
        counts[("kategori", g["_id"].get("k"))] += g["n"]
        counts[("buku", g["_id"].get("b"))] += g["n"]
    out = []
    for d in docs:
        o = Option.from_mongo(d).model_dump()
        o["used"] = counts[(OPTION_FIELD[o["type"]], o["name"])]
        out.append(o)
    return out


@router.post("/options")
async def create_option(body: OptionIn):
    name = body.name.strip()
    if await db.options.find_one({"type": body.type, "name": name}):
        raise HTTPException(status_code=400, detail="Nama sudah ada")
    opt = Option(type=body.type, name=name, order=await db.options.count_documents({"type": body.type}))
    res = await db.options.insert_one(opt.to_mongo())
    opt.id = str(res.inserted_id)
    return opt.model_dump()


@router.put("/options/{opt_id}")
async def rename_option(opt_id: str, body: OptionIn):
    old = await db.options.find_one({"_id": oid(opt_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Tidak ditemukan")
    name = body.name.strip()
    if name != old["name"] and await db.options.find_one({"type": old["type"], "name": name}):
        raise HTTPException(status_code=400, detail="Nama sudah ada")
    await db.options.update_one({"_id": old["_id"]}, {"$set": {"name": name}})
    field = OPTION_FIELD[old["type"]]
    query = {field: old["name"]}
    if old["type"] == "kategori_masuk":
        query["masuk"] = {"$gt": 0}
    elif old["type"] == "kategori_keluar":
        query["keluar"] = {"$gt": 0}
    await db.transactions.update_many(query, {"$set": {field: name}})
    return {"ok": True}


@router.delete("/options/{opt_id}")
async def delete_option(opt_id: str):
    old = await db.options.find_one({"_id": oid(opt_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Tidak ditemukan")
    if await db.transactions.find_one({OPTION_FIELD[old["type"]]: old["name"]}):
        raise HTTPException(status_code=400, detail="Masih dipakai di transaksi. Ganti nama saja atau pindahkan transaksinya dulu.")
    await db.options.delete_one({"_id": old["_id"]})
    return {"ok": True}


@router.get("/income-summary")
async def income_summary(buku: str = "", start: str = "", end: str = ""):
    rows = [r for r in await ledger({"buku": buku} if buku else {}) if r["masuk"] > 0
            and (not start or r["tanggal"] >= start) and (not end or r["tanggal"] <= end)]
    cats = [o["name"] async for o in db.options.find({"type": "kategori_masuk"}).sort("order", 1)]
    by_cat = defaultdict(lambda: {"total": 0.0, "count": 0, "monthly": defaultdict(float)})
    for r in rows:
        c = by_cat[r["kategori"] or "Tanpa Kategori"]
        c["total"] += r["masuk"]
        c["count"] += 1
        c["monthly"][r["tanggal"][:7] or "-"] += r["masuk"]
    names = cats + [k for k in by_cat if k not in cats]
    return [{"kategori": n, "total": by_cat[n]["total"] if n in by_cat else 0,
             "count": by_cat[n]["count"] if n in by_cat else 0,
             "monthly": dict(sorted(by_cat[n]["monthly"].items())) if n in by_cat else {}} for n in names]
