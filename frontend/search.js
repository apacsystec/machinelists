// ============================================================
// search.js — Search page logic (index.html)
// ============================================================

const searchInput   = document.getElementById("searchInput");
const searchBtn     = document.getElementById("searchBtn");
const resultsSection= document.getElementById("resultsSection");
const resultsTitle  = document.getElementById("resultsTitle");
const resultsCount  = document.getElementById("resultsCount");
const treeContainer = document.getElementById("treeContainer");
const emptyState    = document.getElementById("emptyState");
const allSection    = document.getElementById("allSection");
const allContainer  = document.getElementById("allContainer");
const allCount      = document.getElementById("allCount");
const searchHint    = document.getElementById("searchHint");

// ── Load all machines on page load ───────────────────────────
(async () => {
  try {
    const machines = await Api.getAllMachines();
    allCount.textContent = `${machines.length} records`;
    renderTree(allContainer, machines, {
      rootLabel: "Machine Type — ALL",
      onEdit: true,
      onDelete: true,
    });
  } catch (e) {
    allContainer.innerHTML = `<div class="loading-row" style="color:var(--danger)">
      ⚠ Cannot connect to backend. Make sure FastAPI is running on port 8000.
    </div>`;
    allCount.textContent = "";
  }
})();

// ── Search handlers ───────────────────────────────────────────
async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    resultsSection.style.display = "none";
    emptyState.style.display = "none";
    searchHint.textContent = "กด Enter หรือคลิก SEARCH เพื่อค้นหา";
    return;
  }

  searchBtn.disabled = true;
  searchHint.textContent = "Searching...";

  try {
    const results = await Api.searchMachines(q);

    resultsSection.style.display = results.length > 0 ? "block" : "none";
    emptyState.style.display     = results.length === 0 ? "block" : "none";

    if (results.length > 0) {
      resultsTitle.textContent = `Results for "${q}"`;
      resultsCount.textContent = `${results.length} match${results.length !== 1 ? "es" : ""} found`;
      renderTree(treeContainer, results, {
        rootLabel: `Machine Type — Search: "${q}"`,
        onEdit: true,
        onDelete: true,
      });
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    searchHint.textContent = `Found ${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"`;
  } catch (e) {
    searchHint.textContent = "⚠ Search error: " + e.message;
  } finally {
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
