// api.js — Machine Registry v2
const API_BASE = "https://machinelists.onrender.com";

const Api = {
  // ── SETS ──────────────────────────────────────
  async getAllSets() {
    const res = await fetch(`${API_BASE}/sets`);
    if (!res.ok) throw new Error("Failed to fetch sets");
    return res.json();
  },

  async createSet(machineType) {
    const res = await fetch(`${API_BASE}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machine_type: machineType }),
    });
    if (!res.ok) throw new Error("Failed to create set");
    return res.json();
  },

  async deleteSet(setId) {
    const res = await fetch(`${API_BASE}/sets/${setId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete set");
    return true;
  },

  // ── PARTS ─────────────────────────────────────
  async addPart(setId, data) {
    const res = await fetch(`${API_BASE}/sets/${setId}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add part");
    return res.json();
  },

  async updatePart(setId, partId, data) {
    const res = await fetch(`${API_BASE}/sets/${setId}/parts/${partId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update part");
    return res.json();
  },

  async deletePart(setId, partId) {
    const res = await fetch(`${API_BASE}/sets/${setId}/parts/${partId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete part");
    return true;
  },

  // ── SEARCH ────────────────────────────────────
  async search(query) {
    const res = await fetch(`${API_BASE}/search/${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },
};
