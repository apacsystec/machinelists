// scanner.js — Data Matrix scanner (camera + file upload)
// Data Matrix format: "A08581 W24HD9U80P WAVE 224"
//                      S/N    Article    Type...
// S/N = ค่าแรกก่อน space แรก

// ── Parse S/N from Data Matrix string ────────────────────────
function parseSerialNo(rawText) {
  if (!rawText) return null;
  const trimmed = rawText.trim();
  // ค่าแรกก่อน space คือ S/N
  const sn = trimmed.split(/\s+/)[0];
  return sn || null;
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

let codeReader = null;
let scanning   = false;
let stream     = null;

// ── Camera scan ───────────────────────────────────────────────
scanCameraBtn.addEventListener("click", openCamera);
closeScan.addEventListener("click", closeCamera);

async function openCamera() {
  scanModal.style.display = "flex";
  scanStatus.textContent  = "กำลังเปิดกล้อง...";
  scanStatus.style.color  = "var(--text-dim)";

  try {
    // ขอสิทธิ์กล้อง — ใช้กล้องหลัง (environment) ถ้ามี
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }
    });
    scanVideo.srcObject = stream;
    await scanVideo.play();
    scanning = true;
    scanStatus.textContent = "พร้อมสแกน — ส่องกล้องไปที่ Data Matrix";

    // เริ่มอ่าน Data Matrix
    if (window.ZXing) {
      codeReader = new ZXing.BrowserDataMatrixCodeReader();
      scanContinuous();
    } else {
      scanStatus.textContent = "⚠ ZXing library โหลดไม่สำเร็จ";
    }
  } catch (e) {
    scanStatus.textContent = "⚠ ไม่สามารถเปิดกล้องได้: " + e.message;
    scanStatus.style.color = "var(--danger)";
  }
}

async function scanContinuous() {
  if (!scanning || !codeReader) return;
  try {
    const result = await codeReader.decodeOnceFromVideoElement(scanVideo);
    if (result && result.getText()) {
      const raw = result.getText();
      const sn  = parseSerialNo(raw);
      if (sn) {
        onScanSuccess(sn, raw);
        return; // หยุดหลังเจอแล้ว
      }
    }
  } catch (e) {
    // NotFoundException = ยังไม่เจอ code → scan ต่อ
  }
  if (scanning) requestAnimationFrame(scanContinuous);
}

function onScanSuccess(sn, rawText) {
  scanning = false;
  // แสดงผล
  scanStatus.textContent = `✓ พบ S/N: ${sn}`;
  scanStatus.style.color = "var(--success)";

  setTimeout(() => {
    closeCamera();
    // ใส่ S/N ลงช่องค้นหาแล้ว search เลย
    searchInput.value = sn;
    document.getElementById("searchHint").textContent = `สแกนได้: ${rawText} → ค้นหาด้วย S/N: ${sn}`;
    // trigger search
    document.getElementById("searchBtn").click();
  }, 800);
}

function closeCamera() {
  scanning = false;
  if (codeReader) { try { codeReader.reset(); } catch(e){} codeReader = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  scanVideo.srcObject = null;
  scanModal.style.display = "none";
  scanStatus.textContent = "กำลังเปิดกล้อง...";
  scanStatus.style.color = "var(--text-dim)";
}

// ── File upload scan ──────────────────────────────────────────
scanFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("searchHint").textContent = "กำลังอ่าน Data Matrix จากรูป...";

  if (!window.ZXing) {
    document.getElementById("searchHint").textContent = "⚠ ZXing library โหลดไม่สำเร็จ";
    return;
  }

  try {
    // แปลงไฟล์เป็น URL
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise(res => { img.onload = res; });

    const reader = new ZXing.BrowserDataMatrixCodeReader();
    const result = await reader.decodeFromImageElement(img);
    URL.revokeObjectURL(url);

    if (result && result.getText()) {
      const raw = result.getText();
      const sn  = parseSerialNo(raw);
      if (sn) {
        searchInput.value = sn;
        document.getElementById("searchHint").textContent =
          `อ่านได้: ${raw} → ค้นหาด้วย S/N: ${sn}`;
        document.getElementById("searchBtn").click();
      } else {
        document.getElementById("searchHint").textContent = `อ่านได้: ${raw} แต่ parse S/N ไม่ได้`;
      }
    }
  } catch (e) {
    document.getElementById("searchHint").textContent =
      "⚠ อ่าน Data Matrix ไม่สำเร็จ — ลองถ่ายรูปใหม่ให้ชัดขึ้น";
  }

  // reset input เพื่อให้เลือกไฟล์เดิมได้อีก
  fileInput.value = "";
});

// ── Close modal on backdrop click ────────────────────────────
scanModal.addEventListener("click", (e) => {
  if (e.target === scanModal) closeCamera();
});
