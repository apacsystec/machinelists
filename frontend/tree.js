// ============================================================
// tree.js — Render machines as Tree/Hierarchy view
// ============================================================

/**
 * Render an array of machine objects into a tree container element.
 * @param {HTMLElement} container
 * @param {Array} machines
 * @param {Object} opts - { rootLabel, onEdit, onDelete }
 */
function renderTree(container, machines, opts = {}) {
  const { rootLabel = "Machine Type", onEdit, onDelete } = opts;

  if (!machines || machines.length === 0) {
    container.innerHTML = `
      <div class="loading-row" style="justify-content:center;padding:2rem;">
        No machines to display.
      </div>`;
    return;
  }

  let html = `
    <div class="tree-root-label">
      <span>${rootLabel}</span>
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text-xdim)">
        ${machines.length} machine${machines.length !== 1 ? "s" : ""}
      </span>
    </div>`;

  machines.forEach((m, i) => {
    const setLabel = `Machine set ${i + 1}`;
    const displayName = `${m.type || "—"} - ${m.serial_no || "—"}`;
    const id = `tree-${m.id || i}`;

    html += `
      <div class="tree-machine" data-id="${m.id}">
        <div class="tree-machine-header" onclick="toggleTree('${id}')">
          <div class="tree-machine-name">
            <span class="tree-connector">├──</span>
            <span>${setLabel}</span>
            <span style="color:var(--text-dim);font-size:0.8rem;margin-left:0.5rem">${displayName}</span>
          </div>
          <span class="tree-toggle" id="toggle-${id}">▶ expand</span>
        </div>

        <div class="tree-attrs" id="${id}">
          ${buildAttr("Type", m.type, i === machines.length - 1 ? false : true)}
          ${buildAttr("Article No.", m.article_no)}
          ${buildAttr("S/N", m.serial_no)}
          ${buildAttr("Power", m.power, false)}

          <div class="tree-actions">
            ${onEdit   ? `<button class="btn-edit"   onclick="handleEdit('${m.id}')">EDIT</button>` : ""}
            ${onDelete ? `<button class="btn-delete" onclick="handleDelete('${m.id}', this)">DELETE</button>` : ""}
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function buildAttr(key, value, notLast = true) {
  const branch = notLast ? "├──" : "└──";
  return `
    <div class="tree-attr-row">
      <div class="attr-line">
        <span class="attr-branch">${branch}</span>
        <span class="attr-key">${key}</span>
        <span class="attr-val">${value || "—"}</span>
      </div>
    </div>`;
}

function toggleTree(id) {
  const el = document.getElementById(id);
  const toggle = document.getElementById(`toggle-${id}`);
  if (!el) return;
  const isOpen = el.classList.toggle("open");
  toggle.textContent = isOpen ? "▼ collapse" : "▶ expand";
  toggle.classList.toggle("open", isOpen);
}

// ── Global handlers (called from inline onclick) ──────────────

async function handleDelete(id, btn) {
  if (!confirm("ลบ Machine นี้ใช่ไหม?")) return;
  btn.disabled = true;
  btn.textContent = "...";
  try {
    await Api.deleteMachine(id);
    const row = btn.closest(".tree-machine");
    row.style.opacity = "0";
    row.style.transition = "opacity 0.3s";
    setTimeout(() => row.remove(), 300);
  } catch (e) {
    alert("Error: " + e.message);
    btn.disabled = false;
    btn.textContent = "DELETE";
  }
}

async function handleEdit(id) {
  // ดึงข้อมูลปัจจุบัน
  let machine;
  try {
    const res = await fetch(`http://localhost:8000/machines/${id}`);
    machine = await res.json();
  } catch {
    alert("Cannot load machine data");
    return;
  }

  // สร้าง Modal
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">Edit Machine</div>
      <div class="modal-grid">
        <div class="field-group">
          <label class="field-label">Type</label>
          <input class="field-input" id="edit-type" value="${machine.type || ""}">
        </div>
        <div class="field-group">
          <label class="field-label">Article No.</label>
          <input class="field-input" id="edit-article" value="${machine.article_no || ""}">
        </div>
        <div class="field-group">
          <label class="field-label">S/N</label>
          <input class="field-input" id="edit-sn" value="${machine.serial_no || ""}">
        </div>
        <div class="field-group">
          <label class="field-label">Power</label>
          <input class="field-input" id="edit-power" value="${machine.power || ""}">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="cancelEdit">CANCEL</button>
        <button class="btn-primary" id="saveEdit">SAVE</button>
      </div>
      <div class="modal-status" id="editStatus"></div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector("#cancelEdit").onclick = () => overlay.remove();

  overlay.querySelector("#saveEdit").onclick = async () => {
    const btn = overlay.querySelector("#saveEdit");
    const status = overlay.querySelector("#editStatus");
    btn.disabled = true; btn.textContent = "Saving...";
    try {
      await Api.updateMachine(id, {
        type:       overlay.querySelector("#edit-type").value,
        article_no: overlay.querySelector("#edit-article").value,
        serial_no:  overlay.querySelector("#edit-sn").value,
        power:      overlay.querySelector("#edit-power").value,
      });
      status.className = "modal-status success";
      status.textContent = "✓ Saved!";
      setTimeout(() => { overlay.remove(); location.reload(); }, 800);
    } catch (e) {
      status.className = "modal-status error";
      status.textContent = "Error: " + e.message;
      btn.disabled = false; btn.textContent = "SAVE";
    }
  };

  // Close on backdrop click
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}
