// scanner.js — Data Matrix scanner (camera + file upload)
// ใช้ ZXing-wasm แทน @zxing/browser เพราะรองรับ DataMatrix บน mobile ได้ดีกว่า

// ── Parse S/N from Data Matrix string ────────────────────────
// Format: "A08581 W24HD9U80P WAVE 224" → S/N = "A08581" (ค่าแรก)
function parseSerialNo(rawText) {
  if (!rawText) return null;
  return rawText.trim().split(/\s+/)[0] || null;
}

// ── Elements ──────────────────────────────────────────────────
const scanCameraBtn = document.getElementById("scanCameraBtn");
const scanFileBtn   = document.getElementById("scanFileBtn");
const fileInput     = document.getElementById("fileInput");
const scanModal     = document.getElementById("scanModal");
const closeScan     = document.getElementById("closeScan");
const scanVideo     = document.getElementById("scanVideo");
const scanStatus    = document.getElementById("scanStatus");
const searchInput   = document.getElementById("searchInput");

let mediaStream  = null;
let scanning     = false;
let scanCanvas   = null;
let scanCtx      = null;
let animFrame    = null;
let zxingReader  = null;

// ── Load ZXing ────────────────────────────────────────────────
function getZXing() {
  // @zxing/browser UMD exports as ZXingBrowser or ZXing depending on version
  return window.ZXingBrowser || window.ZXing || null;
}

// ── Camera scan ───────────────────────────────────────────────
scanCameraBtn.addEventListener("click", openCamera);
closeScan.addEventListener("click", closeCamera);

async function openCamera() {
  scanModal.style.display = "flex";
  setStatus("กำลังเปิดกล้อง...", "dim");

  const ZX = getZXing();
  if (!ZX) {
    setStatus("⚠ กำลังโหลด ZXing library...", "dim");
    // รอ library โหลดอีกครั้ง
    await new Promise(r => setTimeout(r, 2000));
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }
    });
    scanVideo.srcObject = mediaStream;
    await scanVideo.play();

    // สร้าง canvas สำหรับ decode
    scanCanvas = document.createElement("canvas");
    scanCtx    = scanCanvas.getContext("2d", { willReadFrequently: true });

    scanning = true;
    setStatus("พร้อมสแกน — ส่องกล้องไปที่ Data Matrix", "dim");
    scanLoop();
  } catch (e) {
    setStatus("⚠ เปิดกล้องไม่ได้: " + e.message, "danger");
  }
}

async function scanLoop() {
  if (!scanning) return;

  if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
    scanCanvas.width  = scanVideo.videoWidth;
    scanCanvas.height = scanVideo.videoHeight;
    scanCtx.drawImage(scanVideo, 0, 0);

    try {
      const ZX = getZXing();
      if (ZX) {
        // ลอง MultiFormatReader ก่อน (รองรับ DataMatrix)
        if (!zxingReader) {
          const hints = new Map();
          const formats = [
            ZX.BarcodeFormat?.DATA_MATRIX,
            ZX.BarcodeFormat?.QR_CODE,
          ].filter(Boolean);
          if (formats.length) hints.set(ZX.DecodeHintType?.POSSIBLE_FORMATS, formats);
          zxingReader = new ZX.BrowserMultiFormatReader(hints);
        }
        const imgData = scanCanvas.toDataURL("image/png");
        const img = new Image();
        img.src = imgData;
        await new Promise(r => { img.onload = r; });
        const result = await zxingReader.decodeFromImageElement(img);
        if (result?.getText()) {
          handleResult(result.getText());
          return;
        }
      }
    } catch (e) {
      // NotFoundException → ยังไม่เจอ scan ต่อ
    }
  }

  animFrame = requestAnimationFrame(scanLoop);
}

function handleResult(raw) {
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
    setStatus(`อ่านได้: ${raw} แต่ parse S/N ไม่ได้`, "danger");
    scanning = true;
    animFrame = requestAnimationFrame(scanLoop);
  }
}

function closeCamera() {
  scanning = false;
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  if (zxingReader) { try { zxingReader.reset(); } catch(e){} zxingReader = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  scanVideo.srcObject = null;
  scanModal.style.display = "none";
  setStatus("กำลังเปิดกล้อง...", "dim");
}

// ── File upload scan ──────────────────────────────────────────
scanFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const hint = document.getElementById("searchHint");
  hint.textContent = "กำลังอ่าน Data Matrix จากรูป...";

  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise(r => { img.onload = r; });

    const ZX = getZXing();
    if (!ZX) throw new Error("ZXing library ยังไม่โหลด");

    const hints = new Map();
    const formats = [
      ZX.BarcodeFormat?.DATA_MATRIX,
      ZX.BarcodeFormat?.QR_CODE,
    ].filter(Boolean);
    if (formats.length) hints.set(ZX.DecodeHintType?.POSSIBLE_FORMATS, formats);

    const reader = new ZX.BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromImageElement(img);
    URL.revokeObjectURL(url);

    if (result?.getText()) {
      const raw = result.getText();
      const sn  = parseSerialNo(raw);
      if (sn) {
        searchInput.value = sn;
        hint.textContent = `อ่านได้: ${raw} → ค้นหาด้วย S/N: ${sn}`;
        document.getElementById("searchBtn").click();
      } else {
        hint.textContent = `อ่านได้: ${raw} แต่ parse S/N ไม่ได้`;
      }
    }
  } catch (e) {
    document.getElementById("searchHint").textContent =
      "⚠ อ่านไม่สำเร็จ — ลองถ่ายรูปให้ชัดขึ้นหรือใกล้ขึ้น";
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

// ── Close on backdrop ─────────────────────────────────────────
scanModal.addEventListener("click", (e) => { if (e.target === scanModal) closeCamera(); });
