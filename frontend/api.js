// ============================================================
// api.js — Machine Registry API Client
// ชี้ไปที่ FastAPI backend
// ============================================================

const API_BASE = "https://machinelists.onrender.com";

const Api = {
  async getAllMachines() {
    const res = await fetch(`${API_BASE}/machines`);
    if (!res.ok) throw new Error("Failed to fetch machines");
    return res.json();
  },

  async searchMachines(query) {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`${API_BASE}/machines/search/${encoded}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },

  async createMachine(data) {
    const res = await fetch(`${API_BASE}/machines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create machine");
    }
    return res.json();
  },

  async updateMachine(id, data) {
    const res = await fetch(`${API_BASE}/machines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update machine");
    return res.json();
  },

  async deleteMachine(id) {
    const res = await fetch(`${API_BASE}/machines/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete machine");
    return true;
  },
};
