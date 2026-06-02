// add.js v2
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

// ── Load recent ───────────────────────────────────────────────
async function loadRecent() {
  try {
    const sets = await Api.getAllSets();
    const recent = sets.slice(-5).reverse();
    if (recent.length === 0) {
      recentList.innerHTML = `<div class="loading-row" style="font-size:0.78rem">No machine sets yet.</div>`;
      return;
    }
    recentList.innerHTML = recent.map(s => {
      const partCount = s.machines?.flatMap(m => m.parts || []).length || 0;
      return `<div class="recent-item">
        <span class="recent-name" style="color:var(--accent)">${s.set_no}</span>
        <span class="recent-meta">${s.machine_type} — ${partCount} part${partCount !== 1 ? "s" : ""}</span>
      </div>`;
    }).join("");
  } catch {
    recentList.innerHTML = `<div class="loading-row" style="color:var(--danger);font-size:0.78rem">Cannot connect to backend.</div>`;
  }
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

    // แสดง step 2
    setLabel.textContent = `${set.set_no} — PARTS`;
    setBadge.innerHTML = `
      <span style="font-family:var(--mono);font-size:0.8rem;color:var(--accent)">${set.set_no}</span>
      <span style="font-family:var(--mono);font-size:0.8rem;color:var(--text-dim)">${set.machine_type}</span>
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

doneBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// ── Helpers ───────────────────────────────────────────────────
function renderPartsList() {
  if (currentParts.length === 0) {
    partsList.innerHTML = `<div style="font-family:var(--mono);font-size:0.78rem;color:var(--text-xdim);margin-bottom:1rem">ยังไม่มี Parts — เพิ่มด้านล่างได้เลยครับ</div>`;
    return;
  }
  partsList.innerHTML = currentParts.map((p, i) => `
    <div class="recent-item" style="margin-bottom:0" id="prow-${p.id}">
      <div>
        <span style="font-family:var(--mono);font-size:0.7rem;color:var(--text-xdim)">Part ${i + 1}</span>
        <span class="recent-name" style="margin-left:0.75rem">${p.type} - ${p.serial_no}</span>
        <span class="recent-meta" style="margin-left:0.5rem">${p.article_no} / ${p.power}</span>
      </div>
      <button class="btn-delete" style="font-size:0.65rem;flex-shrink:0"
        onclick="deletePartInline('${p.id}', this)">DELETE</button>
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
  } catch (e) {
    alert("Error: " + e.message);
    btn.disabled = false;
  }
}

async function deleteCurrentSet() {
  if (!confirm("ลบ Set นี้และ Parts ทั้งหมดใช่ไหม?")) return;
  try {
    await Api.deleteSet(currentSetId);
    currentSetId = null;
    currentParts = [];
    step2Card.style.display = "none";
    setStep1Status("✓ Set deleted", "success");
    loadRecent();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

function clearPartForm() {
  ["pType","pArticle","pSN","pPower"].forEach(id => document.getElementById(id).value = "");
}

function setStep1Status(msg, type) {
  step1Status.textContent = msg;
  step1Status.className = `status-msg ${type}`;
}

function setPartStatus(msg, type) {
  partStatus.textContent = msg;
  partStatus.className = `status-msg ${type}`;
}
