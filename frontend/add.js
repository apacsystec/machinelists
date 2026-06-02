// ============================================================
// add.js — Add Machine page logic (add.html)
// ============================================================

const typeInput    = document.getElementById("type");
const articleInput = document.getElementById("articleNo");
const snInput      = document.getElementById("serialNo");
const powerInput   = document.getElementById("power");
const previewName  = document.getElementById("previewName");
const submitBtn    = document.getElementById("submitBtn");
const submitLabel  = document.getElementById("submitLabel");
const resetBtn     = document.getElementById("resetBtn");
const statusMsg    = document.getElementById("statusMsg");
const recentList   = document.getElementById("recentList");

// ── Live preview ─────────────────────────────────────────────
function updatePreview() {
  const t  = typeInput.value.trim() || "—";
  const sn = snInput.value.trim()   || "—";
  previewName.textContent = `${t} - ${sn}`;
}

[typeInput, snInput].forEach(el => el.addEventListener("input", updatePreview));

// ── Load recent machines ──────────────────────────────────────
async function loadRecent() {
  try {
    const machines = await Api.getAllMachines();
    const recent = machines.slice(-5).reverse(); // แสดง 5 ล่าสุด
    if (recent.length === 0) {
      recentList.innerHTML = `<div class="loading-row" style="font-size:0.78rem">No machines yet.</div>`;
      return;
    }
    recentList.innerHTML = recent.map(m => `
      <div class="recent-item">
        <span class="recent-name">${m.type || "—"} - ${m.serial_no || "—"}</span>
        <span class="recent-meta">${m.article_no || ""}</span>
      </div>`).join("");
  } catch {
    recentList.innerHTML = `<div class="loading-row" style="color:var(--danger);font-size:0.78rem">
      Cannot connect to backend.
    </div>`;
  }
}

loadRecent();

// ── Submit ────────────────────────────────────────────────────
submitBtn.addEventListener("click", async () => {
  const type       = typeInput.value.trim();
  const article_no = articleInput.value.trim();
  const serial_no  = snInput.value.trim();
  const power      = powerInput.value.trim();

  // Validation
  if (!type || !article_no || !serial_no || !power) {
    setStatus("⚠ กรุณากรอกข้อมูลให้ครบทุกช่อง", "error");
    return;
  }

  submitBtn.disabled = true;
  submitLabel.textContent = "Adding...";
  setStatus("", "");

  try {
    const created = await Api.createMachine({ type, article_no, serial_no, power });
    setStatus(`✓ Added: ${created.display_name}`, "success");
    clearForm();
    loadRecent();
  } catch (e) {
    setStatus("Error: " + e.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = "ADD MACHINE";
  }
});

// ── Reset ─────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
  clearForm();
  setStatus("", "");
});

function clearForm() {
  typeInput.value = "";
  articleInput.value = "";
  snInput.value = "";
  powerInput.value = "";
  updatePreview();
}

function setStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
}
