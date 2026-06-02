// tree.js v2 — render Machine Sets with Parts

function renderSets(container, sets, opts = {}) {
  const { rootLabel = "Machine set No.", onEdit, onDelete } = opts;

  if (!sets || sets.length === 0) {
    container.innerHTML = `<div class="tree-container"><div class="loading-row" style="justify-content:center;padding:2rem;">No machine sets found.</div></div>`;
    return;
  }

  let html = `<div class="tree-container">
    <div class="tree-root-label">
      <span>${rootLabel}</span>
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text-xdim)">${sets.length} set${sets.length !== 1 ? "s" : ""}</span>
    </div>`;

  const parts = opts.parts || null; // สำหรับ search result

  sets.forEach((s) => {
    const setId = `set-${s.id}`;
    const partList = parts || (s.matched_parts || s.machines?.flatMap(m => m.parts || []) || []);

    html += `
      <div class="tree-machine" data-setid="${s.id}">
        <div class="tree-machine-header" onclick="toggleTree('${setId}')">
          <div class="tree-machine-name">
            <span class="tree-connector">├──</span>
            <span style="color:var(--accent)">${s.set_no || s.id}</span>
            <span style="color:var(--text-dim);font-size:0.8rem;margin-left:0.5rem">${s.machine_type || ""}</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text-xdim)">${partList.length} part${partList.length !== 1 ? "s" : ""}</span>
            <span class="tree-toggle" id="toggle-${setId}">▶ expand</span>
          </div>
        </div>

        <div class="tree-attrs" id="${setId}">`;

    if (partList.length === 0) {
      html += `<div style="padding:0.5rem 1.25rem 0.75rem 2.5rem;font-family:var(--mono);font-size:0.78rem;color:var(--text-xdim)">No parts yet.</div>`;
    } else {
      partList.forEach((p, i) => {
        const isLast = i === partList.length - 1;
        const pid     = `part-${s.id}-${p.id}`;
        const pattrId = `pattr-${s.id}-${p.id}`;
        html += `
          <div class="tree-machine" id="${pid}" style="border-left:none;margin-left:2rem">
            <div class="tree-machine-header" onclick="toggleTree('${pattrId}')">
              <div class="tree-machine-name">
                <span class="tree-connector" style="color:var(--text-xdim)">${isLast ? "└──" : "├──"}</span>
                <span style="color:var(--accent2)">Part ${i + 1}</span>
                <span style="color:var(--text-dim);font-size:0.78rem;margin-left:0.5rem">${p.type || "—"} - ${p.serial_no || "—"}</span>
              </div>
              <span class="tree-toggle" id="toggle-${pattrId}">▶</span>
            </div>
            <div class="tree-attrs" id="${pattrId}">
              ${buildAttr("Type", p.type)}
              ${buildAttr("Article No.", p.article_no)}
              ${buildAttr("S/N", p.serial_no)}
              ${buildAttr("Power", p.power, false)}
              <div class="tree-actions">
                ${onEdit   ? `<button class="btn-edit" onclick="handleEditPart('${s.id}','${p.id}')">EDIT</button>` : ""}
                ${onDelete ? `<button class="btn-delete" onclick="handleDeletePart('${s.id}','${p.id}',this)">DELETE</button>` : ""}
              </div>
            </div>
          </div>`;
      });
    }

    html += `
        </div>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function buildAttr(key, value, notLast = true) {
  const branch = notLast ? "├──" : "└──";
  return `<div class="tree-attr-row"><div class="attr-line">
    <span class="attr-branch">${branch}</span>
    <span class="attr-key">${key}</span>
    <span class="attr-val">${value || "—"}</span>
  </div></div>`;
}

function toggleTree(id) {
  const el = document.getElementById(id);
  const toggle = document.getElementById(`toggle-${id}`);
  if (!el) return;
  const isOpen = el.classList.toggle("open");
  toggle.textContent = isOpen ? "▼ collapse" : "▶ expand";
  toggle.classList.toggle("open", isOpen);
}

async function handleDeleteSet(setId, btn) {
  if (!confirm("ลบ Machine Set นี้และ Parts ทั้งหมดใช่ไหม?")) return;
  btn.disabled = true;
  try {
    await Api.deleteSet(setId);
    const row = btn.closest(".tree-machine[data-setid]");
    row.style.opacity = "0"; row.style.transition = "opacity 0.3s";
    setTimeout(() => row.remove(), 300);
  } catch (e) { alert("Error: " + e.message); btn.disabled = false; }
}

async function handleDeletePart(setId, partId, btn) {
  if (!confirm("ลบ Part นี้ใช่ไหม?")) return;
  btn.disabled = true;
  try {
    await Api.deletePart(setId, partId);
    const row = document.getElementById(`part-${setId}-${partId}`);
    row.style.opacity = "0"; row.style.transition = "opacity 0.3s";
    setTimeout(() => row.remove(), 300);
  } catch (e) { alert("Error: " + e.message); btn.disabled = false; }
}

async function handleEditPart(setId, partId) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">Edit Part</div>
      <div class="modal-grid">
        <div class="field-group"><label class="field-label">Type</label><input class="field-input" id="ep-type"></div>
        <div class="field-group"><label class="field-label">Article No.</label><input class="field-input" id="ep-article"></div>
        <div class="field-group"><label class="field-label">S/N</label><input class="field-input" id="ep-sn"></div>
        <div class="field-group"><label class="field-label">Power</label><input class="field-input" id="ep-power"></div>
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
      await Api.updatePart(setId, partId, {
        type: overlay.querySelector("#ep-type").value,
        article_no: overlay.querySelector("#ep-article").value,
        serial_no: overlay.querySelector("#ep-sn").value,
        power: overlay.querySelector("#ep-power").value,
      });
      status.className = "modal-status success"; status.textContent = "✓ Saved!";
      setTimeout(() => { overlay.remove(); location.reload(); }, 800);
    } catch (e) {
      status.className = "modal-status error"; status.textContent = "Error: " + e.message;
      btn.disabled = false; btn.textContent = "SAVE";
    }
  };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}
