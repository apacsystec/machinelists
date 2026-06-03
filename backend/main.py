from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore
from firebase_config import db
from models import MachineIn, PartIn, PartUpdate
from typing import List
import re
from datetime import datetime

app = FastAPI(title="Machine Registry API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SETS_COL = "machine_sets"

# ── helpers ──────────────────────────────────────────────────

def next_set_no(existing: list[str]) -> str:
    nums = []
    for s in existing:
        m = re.match(r"SET-(\d+)", s)
        if m:
            nums.append(int(m.group(1)))
    n = max(nums) + 1 if nums else 1
    return f"SET-{n:03d}"

def part_to_dict(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    d["display_name"] = f"{d.get('type','')} - {d.get('serial_no','')}"
    return d

def machine_to_dict(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    return d

def set_to_dict(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    return d

# ═══════════════════════════════════════════════════════════════
# MACHINE SETS
# ═══════════════════════════════════════════════════════════════

@app.get("/sets")
async def get_all_sets():
    docs = db.collection(SETS_COL).order_by("created_at").stream()
    result = []
    for doc in docs:
        s = set_to_dict(doc)
        # ดึง machines
        machines = []
        m_docs = db.collection(SETS_COL).document(doc.id).collection("machines").stream()
        for m_doc in m_docs:
            machine = machine_to_dict(m_doc)
            # ดึง parts
            parts = []
            p_docs = (db.collection(SETS_COL).document(doc.id)
                      .collection("machines").document(m_doc.id)
                      .collection("parts").stream())
            for p_doc in p_docs:
                parts.append(part_to_dict(p_doc))
            machine["parts"] = parts
            machines.append(machine)
        s["machines"] = machines
        result.append(s)
    return result

@app.post("/sets", status_code=201)
async def create_set(machine: MachineIn):
    # Auto generate SET-XXX
    existing = [d.id for d in db.collection(SETS_COL).stream()]
    set_no = next_set_no(existing)
    set_ref = db.collection(SETS_COL).document(set_no)
    set_ref.set({
        "set_no": set_no,
        "machine_type": machine.machine_type,
        "created_at": firestore.SERVER_TIMESTAMP,
    })
    return {"id": set_no, "set_no": set_no, "machine_type": machine.machine_type}

@app.delete("/sets/{set_id}", status_code=204)
async def delete_set(set_id: str):
    ref = db.collection(SETS_COL).document(set_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Set not found")
    # ลบ sub-collections
    for m in ref.collection("machines").stream():
        for p in ref.collection("machines").document(m.id).collection("parts").stream():
            ref.collection("machines").document(m.id).collection("parts").document(p.id).delete()
        ref.collection("machines").document(m.id).delete()
    ref.delete()
    return None

# ═══════════════════════════════════════════════════════════════
# PARTS
# ═══════════════════════════════════════════════════════════════

@app.get("/sets/{set_id}/parts")
async def get_parts(set_id: str):
    set_ref = db.collection(SETS_COL).document(set_id)
    if not set_ref.get().exists:
        raise HTTPException(status_code=404, detail="Set not found")
    # machine เดียวต่อ set
    machines = list(set_ref.collection("machines").stream())
    if not machines:
        return []
    m_id = machines[0].id
    parts = set_ref.collection("machines").document(m_id).collection("parts").stream()
    return [part_to_dict(p) for p in parts]

@app.post("/sets/{set_id}/parts", status_code=201)
async def add_part(set_id: str, part: PartIn):
    set_ref = db.collection(SETS_COL).document(set_id)
    if not set_ref.get().exists:
        raise HTTPException(status_code=404, detail="Set not found")
    # หรือสร้าง machine node ถ้ายังไม่มี
    machines = list(set_ref.collection("machines").stream())
    if machines:
        m_id = machines[0].id
    else:
        set_data = set_ref.get().to_dict()
        m_ref = set_ref.collection("machines").add({"type": set_data.get("machine_type","")})
        m_id = m_ref[1].id
    data = part.model_dump()
    p_ref = set_ref.collection("machines").document(m_id).collection("parts").add(data)
    p_doc = set_ref.collection("machines").document(m_id).collection("parts").document(p_ref[1].id).get()
    return part_to_dict(p_doc)

@app.put("/sets/{set_id}/parts/{part_id}")
async def update_part(set_id: str, part_id: str, part: PartUpdate):
    set_ref = db.collection(SETS_COL).document(set_id)
    machines = list(set_ref.collection("machines").stream())
    if not machines:
        raise HTTPException(status_code=404, detail="Machine not found")
    m_id = machines[0].id
    p_ref = set_ref.collection("machines").document(m_id).collection("parts").document(part_id)
    if not p_ref.get().exists:
        raise HTTPException(status_code=404, detail="Part not found")
    update_data = {k: v for k, v in part.model_dump().items() if v is not None}
    p_ref.update(update_data)
    return part_to_dict(p_ref.get())

@app.delete("/sets/{set_id}/parts/{part_id}", status_code=204)
async def delete_part(set_id: str, part_id: str):
    set_ref = db.collection(SETS_COL).document(set_id)
    machines = list(set_ref.collection("machines").stream())
    if not machines:
        raise HTTPException(status_code=404, detail="Machine not found")
    m_id = machines[0].id
    p_ref = set_ref.collection("machines").document(m_id).collection("parts").document(part_id)
    if not p_ref.get().exists:
        raise HTTPException(status_code=404, detail="Part not found")
    p_ref.delete()
    return None

# ═══════════════════════════════════════════════════════════════
# SEARCH — ค้นหาจาก Set No., Machine Type และ Part attributes
# ═══════════════════════════════════════════════════════════════

@app.get("/search/{query}")
async def search(query: str):
    q = query.strip().lower()
    if not q:
        return []
    sets_docs = db.collection(SETS_COL).stream()
    results = []
    for set_doc in sets_docs:
        s_data = set_doc.to_dict()
        set_searchable = " ".join([
            s_data.get("set_no", ""),
            s_data.get("machine_type", ""),
        ]).lower()

        machines = list(set_doc.reference.collection("machines").stream())
        all_parts = []
        matched_parts = []

        for m_doc in machines:
            parts = m_doc.reference.collection("parts").stream()
            for p_doc in parts:
                p = part_to_dict(p_doc)
                all_parts.append(p)
                part_searchable = " ".join([
                    p.get("type",""), p.get("article_no",""),
                    p.get("serial_no",""), p.get("power",""),
                ]).lower()
                if q in part_searchable:
                    matched_parts.append(p)

        # ถ้า query ตรงกับ Set No. หรือ Machine Type → แสดง parts ทั้งหมด
        if q in set_searchable:
            s = set_to_dict(set_doc)
            s["matched_parts"] = all_parts
            results.append(s)
        elif matched_parts:
            s = set_to_dict(set_doc)
            s["matched_parts"] = matched_parts
            results.append(s)
    return results

# ═══════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Machine Registry API v2"}

# ═══════════════════════════════════════════════════════════════
# DECODE DATA MATRIX
# ═══════════════════════════════════════════════════════════════

import fastapi
from fastapi import File, UploadFile

@app.post("/decode-datamatrix")
async def decode_datamatrix(file: UploadFile = File(...)):
    try:
        from pylibdmtx.pylibdmtx import decode as dmtx_decode
        from PIL import Image
        import io

        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")

        results = dmtx_decode(img)
        if not results:
            raise HTTPException(status_code=422, detail="ไม่พบ DataMatrix ในรูปภาพ")

        raw = results[0].data.decode("utf-8").strip()
        sn  = raw.split()[0] if raw else ""
        return {"raw": raw, "serial_no": sn}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# updated

