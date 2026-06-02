// add.js v3
const machineTypeInput = document.getElementById("machineType");
const createSetBtn     = document.getElementById("createSetBtn");
const step1Status      = document.getElementById("step1Status");
const step2Card        = document.getElementById("step2Card");
const setLabel         = document.getElementById("setLabel");
const setBadge         = document.getElementById("setBadge");
const partsList        = document.getElementById("partsList");
const addPartBtn       = document.getElementById("addPartBtn");
const doneBtn          = document.getElementById("doneBtn");
const partStatus       = document.getElementById("partStatus");
const recentList       = document.getElementById("recentList");

let currentSetId = null;
let currentParts = [];

// ── Load all sets ─────────────────────────────────────────────
async function loadRecent() {
  const totalCount = document.getElementById("totalCount");
  try {
    const sets = await Api.getAllSets();
    if (totalCount) totalCount.textContent = `${sets.length} sets`;
    if (sets.length === 0) {
      recentList.innerHTML = `<div class="loading-row" style="font-size:0.78rem">No machine sets yet.</div>`;
      return;
    }
    recentList.innerHTML = sets.map(s => {
      const allParts = s.machines?.flatMap(m => m.parts || []) || [];
      const partCount = allParts.length;
      const partsHtml = allParts.map((p, i) => `
        <div class="set-part-row" id="spr-${s.id}-${p.id}">
          <span style="font-size:0.72rem;color:var(--text-xdim);min-width:50px">Part ${i+1}</span>
          <span style="font-size:0.82rem;color:var(--accent2);flex:1">${p.type} - ${p.serial_no}</span>
          <span style="font-size:0.72rem;color:var(--text-xdim);margin-right:0.5rem">${p.article_no} / ${p.power}</span>
          <button class="btn-delete" style="font-size:0.62rem;padding:3px 10px"
            onclick="deletePartFromList('${s.id}','${p.id}',this)">DELETE</button>
        </div>`).join("");

      return `
        <div class="set-list-item" id="sli-${s.id}">
          <div class="set-list-header">
            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
              <span style="font-size:0.9rem;font-weight:700;color:var(--accent)">${s.set_no}</span>
              <span style="font-size:0.82rem;color:var(--text-dim)">${s.machine_type}</span>
              <span style="font-size:0.7rem;color:var(--text-xdim)">${partCount} part${partCount!==1?"s":""}</span>
            </div>
            <button class="btn-edit" style="font-size:0.65rem"
              onclick="toggleSetEdit('${s.id}')">EDIT</button>
          </div>
          <div class="set-edit-panel" id="sep-${s.id}" style="display:none">
            <div id="parts-panel-${s.id}">${partsHtml || '<div style="font-size:0.75rem;color:var(--text-xdim);padding:0.5rem 0">No parts yet.</div>'}</div>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
              <button class="btn-delete" style="font-size:0.65rem"
                onclick="deleteSetFromList('${s.id}',this)">DELETE SET</button>
              <button class="btn-secondary" style="font-size:0.65rem;padding:4px 14px"
                onclick="openSetForEdit('${s.id}','${s.machine_type}')">ADD PARTS →</button>
            </div>
          </div>
        </div>`;
    }).join("");
  } catch {
    recentList.innerHTML = `<div class="loading-row" style="color:var(--danger);font-size:0.78rem">Cannot connect to backend.</div>`;
    if (totalCount) totalCount.textContent = "";
  }
}

function toggleSetEdit(setId) {
  const panel = document.getElementById(`sep-${setId}`);
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function deletePartFromList(setId, partId, btn) {
  if (!confirm("ลบ Part นี้ใช่ไหม?")) return;
  btn.disabled = true;
  try {
    await Api.deletePart(setId, partId);
    const row = document.getElementById(`spr-${setId}-${partId}`);
    row.style.opacity = "0"; row.style.transition = "opacity 0.2s";
    setTimeout(() => { row.remove(); loadRecent(); }, 250);
  } catch(e) { alert("Error: "+e.message); btn.disabled = false; }
}

async function deleteSetFromList(setId, btn) {
  if (!confirm("ลบ Set นี้และ Parts ทั้งหมดใช่ไหม?")) return;
  btn.disabled = true;
  try {
    await Api.deleteSet(setId);
    const row = document.getElementById(`sli-${setId}`);
    row.style.opacity = "0"; row.style.transition = "opacity 0.2s";
    setTimeout(() => { row.remove(); loadRecent(); }, 250);
  } catch(e) { alert("Error: "+e.message); btn.disabled = false; }
}

function openSetForEdit(setId, machineType) {
  currentSetId = setId;
  currentParts = [];
  setLabel.textContent = `${setId} — PARTS`;
  setBadge.innerHTML = `
    <span style="font-size:0.8rem;color:var(--accent)">${setId}</span>
    <span style="font-size:0.8rem;color:var(--text-dim)">${machineType}</span>
    <button class="btn-delete" style="margin-left:auto;font-size:0.65rem" onclick="deleteCurrentSet()">DELETE SET</button>`;
  step2Card.style.display = "block";
  step2Card.scrollIntoView({ behavior: "smooth" });
  renderPartsList();
}

loadRecent();

// ── STEP 1: Create Set ────────────────────────────────────────
createSetBtn.addEventListener("click", async () => {
  const machineType = machineTypeInput.value.trim();
  if (!machineType) { setStep1Status("⚠ กรุณากรอก Machine Type", "error"); return; }
  createSetBtn.disabled = true;
  createSetBtn.textContent = "Creating...";
  setStep1Status("", "");
  try {
    const set = await Api.createSet(machineType);
    currentSetId = set.id;
    currentParts = [];
    setLabel.textContent = `${set.set_no} — PARTS`;
    setBadge.innerHTML = `
      <span style="font-size:0.8rem;color:var(--accent)">${set.set_no}</span>
      <span style="font-size:0.8rem;color:var(--text-dim)">${set.machine_type}</span>
      <button class="btn-delete" style="margin-left:auto;font-size:0.65rem" onclick="deleteCurrentSet()">DELETE SET</button>`;
    step2Card.style.display = "block";
    step2Card.scrollIntoView({ behavior: "smooth" });
    renderPartsList();
    setStep1Status(`✓ Created ${set.set_no}`, "success");
    createSetBtn.textContent = "CREATE SET →";
    createSetBtn.disabled = false;
    machineTypeInput.value = "";
    loadRecent();
  } catch (e) {
    setStep1Status("Error: " + e.message, "error");
    createSetBtn.disabled = false;
    createSetBtn.textContent = "CREATE SET →";
  }
});

// ── STEP 2: Add Parts ─────────────────────────────────────────
addPartBtn.addEventListener("click", async () => {
  const type       = document.getElementById("pType").value.trim();
  const article_no = document.getElementById("pArticle").value.trim();
  const serial_no  = document.getElementById("pSN").value.trim();
  const power      = document.getElementById("pPower").value.trim();
  if (!type || !article_no || !serial_no || !power) {
    setPartStatus("⚠ กรุณากรอกข้อมูลให้ครบ", "error"); return;
  }
  addPartBtn.disabled = true;
  addPartBtn.textContent = "Adding...";
  setPartStatus("", "");
  try {
    const part = await Api.addPart(currentSetId, { type, article_no, serial_no, power });
    currentParts.push(part);
    renderPartsList();
    clearPartForm();
    setPartStatus(`✓ Added: ${part.display_name}`, "success");
    loadRecent();
  } catch (e) {
    setPartStatus("Error: " + e.message, "error");
  } finally {
    addPartBtn.disabled = false;
    addPartBtn.textContent = "ADD PART";
  }
});

doneBtn.addEventListener("click", () => { window.location.href = "index.html"; });

// ── Helpers ───────────────────────────────────────────────────
function renderPartsList() {
  if (currentParts.length === 0) {
    partsList.innerHTML = `<div style="font-size:0.78rem;color:var(--text-xdim);margin-bottom:1rem">ยังไม่มี Parts — เพิ่มด้านล่างได้เลย</div>`;
    return;
  }
  partsList.innerHTML = currentParts.map((p, i) => `
    <div class="recent-item" id="prow-${p.id}">
      <div>
        <span style="font-size:0.7rem;color:var(--text-xdim)">Part ${i+1}</span>
        <span class="recent-name" style="margin-left:0.75rem">${p.type} - ${p.serial_no}</span>
        <span class="recent-meta" style="margin-left:0.5rem">${p.article_no} / ${p.power}</span>
      </div>
      <button class="btn-delete" style="font-size:0.65rem;flex-shrink:0"
        onclick="deletePartInline('${p.id}',this)">DELETE</button>
    </div>`).join("");
}

async function deletePartInline(partId, btn) {
  if (!confirm("ลบ Part นี้ใช่ไหม?")) return;
  btn.disabled = true;
  try {
    await Api.deletePart(currentSetId, partId);
    currentParts = currentParts.filter(p => p.id !== partId);
    renderPartsList();
    loadRecent();
  } catch (e) { alert("Error: "+e.message); btn.disabled = false; }
}

async function deleteCurrentSet() {
  if (!confirm("ลบ Set นี้และ Parts ทั้งหมดใช่ไหม?")) return;
  try {
    await Api.deleteSet(currentSetId);
    currentSetId = null; currentParts = [];
    step2Card.style.display = "none";
    setStep1Status("✓ Set deleted", "success");
    loadRecent();
  } catch (e) { alert("Error: "+e.message); }
}

function clearPartForm() {
  ["pType","pArticle","pSN","pPower"].forEach(id => document.getElementById(id).value = "");
}
function setStep1Status(msg, type) { step1Status.textContent = msg; step1Status.className = `status-msg ${type}`; }
function setPartStatus(msg, type)  { partStatus.textContent  = msg; partStatus.className  = `status-msg ${type}`; }
