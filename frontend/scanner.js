// scanner.js — Data Matrix scanner v3
// ใช้ ZXing decode ทีละ frame จาก canvas

function parseSerialNo(rawText) {
  if (!rawText) return null;
  return rawText.trim().split(/\s+/)[0] || null;
}

const scanCameraBtn = document.getElementById("scanCameraBtn");
const scanFileBtn   = document.getElementById("scanFileBtn");
const fileInput     = document.getElementById("fileInput");
const scanModal     = document.getElementById("scanModal");
const closeScan     = document.getElementById("closeScan");
const scanVideo     = document.getElementById("scanVideo");
const scanStatus    = document.getElementById("scanStatus");
const searchInput   = document.getElementById("searchInput");

let mediaStream = null;
let scanning    = false;
let animFrame   = null;
let reader      = null;

// ── Init ZXing reader ─────────────────────────────────────────
function initReader() {
  if (reader) return reader;
  try {
    // ลอง ZXingBrowser ก่อน (package @zxing/browser)
    const ZX = window.ZXingBrowser || window.ZXing;
    if (!ZX) return null;
    reader = new ZX.BrowserMultiFormatReader();
    return reader;
  } catch(e) { return null; }
}

// ── Decode image element ──────────────────────────────────────
async function decodeImage(imgEl) {
  const ZX = window.ZXingBrowser || window.ZXing;
  if (!ZX) throw new Error("ZXing ไม่พร้อม");

  // วาดลง canvas แล้ว decode
  const c = document.createElement("canvas");
  c.width  = imgEl.naturalWidth  || imgEl.videoWidth  || imgEl.width;
  c.height = imgEl.naturalHeight || imgEl.videoHeight || imgEl.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, c.width, c.height);

  // ลองหลาย scale เพื่อให้โอกาสอ่านมากขึ้น
  const scales = [1, 1.5, 2];
  for (const scale of scales) {
    try {
      const c2 = document.createElement("canvas");
      c2.width  = c.width  * scale;
      c2.height = c.height * scale;
      const ctx2 = c2.getContext("2d");
      ctx2.drawImage(c, 0, 0, c2.width, c2.height);

      const r = initReader() || new ZX.BrowserMultiFormatReader();
      const result = await r.decodeFromCanvas(c2);
      if (result?.getText()) return result.getText();
    } catch(e) { /* NotFoundException → ลอง scale ต่อไป */ }
  }
  throw new Error("ไม่พบ barcode");
}

// ── Camera scan ───────────────────────────────────────────────
scanCameraBtn.addEventListener("click", openCamera);
closeScan.addEventListener("click", closeCamera);

async function openCamera() {
  scanModal.style.display = "flex";
  setStatus("กำลังเปิดกล้อง...", "dim");

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      }
    });
    scanVideo.srcObject = mediaStream;
    await scanVideo.play();
    scanning = true;
    setStatus("พร้อมสแกน — ส่องกล้องไปที่ Data Matrix", "dim");
    scanLoop();
  } catch(e) {
    setStatus("⚠ เปิดกล้องไม่ได้: " + e.message, "danger");
  }
}

let frameCount = 0;
async function scanLoop() {
  if (!scanning) return;

  // decode ทุก 5 frame เพื่อไม่ให้หนักเกินไป
  frameCount++;
  if (frameCount % 5 === 0 && scanVideo.readyState >= 2) {
    try {
      const raw = await decodeImage(scanVideo);
      if (raw) { onScanResult(raw); return; }
    } catch(e) { /* ยังไม่เจอ */ }
  }

  animFrame = requestAnimationFrame(scanLoop);
}

function onScanResult(raw) {
  scanning = false;
  const sn = parseSerialNo(raw);
  if (sn) {
    setStatus(`✓ พบ S/N: ${sn}`, "success");
    setTimeout(() => {
      closeCamera();
      searchInput.value = sn;
      document.getElementById("searchHint").textContent =
        `สแกนได้: ${raw} → ค้นหาด้วย S/N: ${sn}`;
      document.getElementById("searchBtn").click();
    }, 700);
  } else {
    setStatus(`อ่านได้: ${raw} (ไม่พบ S/N)`, "danger");
    scanning = true;
    animFrame = requestAnimationFrame(scanLoop);
  }
}

function closeCamera() {
  scanning = false;
  frameCount = 0;
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  if (reader)    { try { reader.reset(); } catch(e){} reader = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  scanVideo.srcObject = null;
  scanModal.style.display = "none";
  setStatus("กำลังเปิดกล้อง...", "dim");
}

// ── File upload ───────────────────────────────────────────────
scanFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const hint = document.getElementById("searchHint");
  hint.textContent = "กำลังอ่าน Data Matrix...";

  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise(r => { img.onload = r; });

    const raw = await decodeImage(img);
    URL.revokeObjectURL(url);

    const sn = parseSerialNo(raw);
    if (sn) {
      searchInput.value = sn;
      hint.textContent = `อ่านได้: ${raw} → ค้นหาด้วย S/N: ${sn}`;
      document.getElementById("searchBtn").click();
    } else {
      hint.textContent = `อ่านได้: ${raw} แต่ parse S/N ไม่ได้`;
    }
  } catch(e) {
    hint.textContent = "⚠ อ่านไม่สำเร็จ — ลองถ่ายรูปให้ชัดและใกล้ขึ้น";
  }
  fileInput.value = "";
});

// ── Helpers ───────────────────────────────────────────────────
function setStatus(msg, type) {
  scanStatus.textContent = msg;
  scanStatus.style.color = type === "success" ? "var(--success)"
                         : type === "danger"  ? "var(--danger)"
                         : "var(--text-dim)";
}

scanModal.addEventListener("click", (e) => { if (e.target === scanModal) closeCamera(); });
