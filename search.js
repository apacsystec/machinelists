// search.js v2
const searchInput    = document.getElementById("searchInput");
const searchBtn      = document.getElementById("searchBtn");
const resultsSection = document.getElementById("resultsSection");
const resultsTitle   = document.getElementById("resultsTitle");
const resultsCount   = document.getElementById("resultsCount");
const resultsContainer = document.getElementById("resultsContainer");
const emptyState     = document.getElementById("emptyState");
const allContainer   = document.getElementById("allContainer");
const allCount       = document.getElementById("allCount");
const searchHint     = document.getElementById("searchHint");

(async () => {
  try {
    const sets = await Api.getAllSets();
    allCount.textContent = `${sets.length} sets`;
    renderSets(allContainer, sets, { rootLabel: "Machine set No. — ALL", onEdit: true, onDelete: true });
  } catch (e) {
    allContainer.innerHTML = `<div class="tree-container"><div class="loading-row" style="color:var(--danger)">⚠ Cannot connect to backend.</div></div>`;
    allCount.textContent = "";
  }
})();

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
    const results = await Api.search(q);
    resultsSection.style.display = results.length > 0 ? "block" : "none";
    emptyState.style.display = results.length === 0 ? "block" : "none";
    if (results.length > 0) {
      resultsTitle.textContent = `Results for "${q}"`;
      resultsCount.textContent = `${results.length} set${results.length !== 1 ? "s" : ""} matched`;
      renderSets(resultsContainer, results, {
        rootLabel: `Machine set No. — "${q}"`,
        onEdit: true, onDelete: true,
      });
      resultsSection.scrollIntoView({ behavior: "smooth" });
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
