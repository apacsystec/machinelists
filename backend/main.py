from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore
from firebase_config import db
from models import MachineSet, MachineSetUpdate
from typing import List

app = FastAPI(title="Machine Registry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLLECTION = "machine_sets"


def doc_to_dict(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    # สร้าง display_name = Type - S/N
    data["display_name"] = f"{data.get('type', '')} - {data.get('serial_no', '')}"
    return data


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────
@app.post("/machines", status_code=201)
async def create_machine(machine: MachineSet):
    data = machine.model_dump()
    ref = db.collection(COLLECTION).add(data)
    doc = db.collection(COLLECTION).document(ref[1].id).get()
    return doc_to_dict(doc)


# ─────────────────────────────────────────────
# READ ALL
# ─────────────────────────────────────────────
@app.get("/machines")
async def get_all_machines():
    docs = db.collection(COLLECTION).stream()
    return [doc_to_dict(d) for d in docs]


# ─────────────────────────────────────────────
# READ ONE
# ─────────────────────────────────────────────
@app.get("/machines/{machine_id}")
async def get_machine(machine_id: str):
    doc = db.collection(COLLECTION).document(machine_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Machine not found")
    return doc_to_dict(doc)


# ─────────────────────────────────────────────
# SEARCH — full-text search across all fields (client-side filter)
# Firestore ไม่มี native full-text search จึงดึงทั้งหมดแล้ว filter ฝั่ง backend
# ─────────────────────────────────────────────
@app.get("/machines/search/{query}")
async def search_machines(query: str):
    q = query.strip().lower()
    if not q:
        return []

    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        d = doc_to_dict(doc)
        # ค้นหาใน type, article_no, serial_no, power (case-insensitive)
        searchable = " ".join([
            d.get("type", ""),
            d.get("article_no", ""),
            d.get("serial_no", ""),
            d.get("power", ""),
        ]).lower()
        if q in searchable:
            results.append(d)

    return results


# ─────────────────────────────────────────────
# UPDATE
# ─────────────────────────────────────────────
@app.put("/machines/{machine_id}")
async def update_machine(machine_id: str, machine: MachineSetUpdate):
    doc_ref = db.collection(COLLECTION).document(machine_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Machine not found")
    update_data = {k: v for k, v in machine.model_dump().items() if v is not None}
    doc_ref.update(update_data)
    updated = doc_ref.get()
    return doc_to_dict(updated)


# ─────────────────────────────────────────────
# DELETE
# ─────────────────────────────────────────────
@app.delete("/machines/{machine_id}", status_code=204)
async def delete_machine(machine_id: str):
    doc_ref = db.collection(COLLECTION).document(machine_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Machine not found")
    doc_ref.delete()
    return None


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Machine Registry API"}
