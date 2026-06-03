// search.js v3 — ไม่แสดง All Machine Sets
const searchInput     = document.getElementById("searchInput");
const searchBtn       = document.getElementById("searchBtn");
const resultsSection  = document.getElementById("resultsSection");
const resultsTitle    = document.getElementById("resultsTitle");
const resultsCount    = document.getElementById("resultsCount");
const resultsContainer= document.getElementById("resultsContainer");
const emptyState      = document.getElementById("emptyState");
const allSection      = document.getElementById("allSection");
const searchHint      = document.getElementById("searchHint");

// ซ่อน All Machine Sets section
if (allSection) allSection.style.display = "none";

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    resultsSection.style.display = "none";
    emptyState.style.display = "none";
    searchHint.textContent = "กด Enter, คลิก SEARCH หรือสแกน Data Matrix";
    return;
  }
  searchBtn.disabled = true;
  searchHint.textContent = "Searching...";
  try {
    const results = await Api.search(q);
    resultsSection.style.display = results.length > 0 ? "block" : "none";
    emptyState.style.display     = results.length === 0 ? "block" : "none";
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
