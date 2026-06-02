// scanner.js v4 — ส่งรูปไป Backend Python อ่าน DataMatrix

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
let frameCount  = 0;

// ── ส่งรูปไป Backend decode ───────────────────────────────────
async function decodeViaBackend(blob) {
  const form = new FormData();
  form.append("file", blob, "scan.jpg");
  const res = await fetch(`${API_BASE}/decode-datamatrix`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "decode failed");
  }
  return res.json(); // { raw, serial_no }
}

// ── แปลง video frame เป็น Blob ───────────────────────────────
function videoFrameToBlob(video) {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width  = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    c.toBlob(resolve, "image/jpeg", 0.92);
  });
}

// ── Camera scan ───────────────────────────────────────────────
scanCameraBtn.addEventListener("click", openCamera);
closeScan.addEventListener("click", closeCamera);

async function openCamera() {
  scanModal.style.display = "flex";
  setStatus("กำลังเปิดกล้อง...", "dim");
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }
    });
    scanVideo.srcObject = mediaStream;
    await scanVideo.play();
    scanning   = true;
    frameCount = 0;
    setStatus("พร้อมสแกน — ส่องกล้องไปที่ Data Matrix", "dim");
    scanLoop();
  } catch(e) {
    setStatus("⚠ เปิดกล้องไม่ได้: " + e.message, "danger");
  }
}

async function scanLoop() {
  if (!scanning) return;
  frameCount++;

  // decode ทุก 30 frame (~1 วินาที) เพื่อไม่ให้ backend รับ request ถี่เกิน
  if (frameCount % 30 === 0 && scanVideo.readyState >= 2) {
    setStatus("กำลังอ่าน DataMatrix...", "dim");
    try {
      const blob   = await videoFrameToBlob(scanVideo);
      const result = await decodeViaBackend(blob);
      if (result.serial_no) {
        onScanResult(result.raw, result.serial_no);
        return;
      }
    } catch(e) {
      // ยังไม่เจอ → scan ต่อ
    }
    setStatus("พร้อมสแกน — ส่องกล้องไปที่ Data Matrix", "dim");
  }

  animFrame = requestAnimationFrame(scanLoop);
}

function onScanResult(raw, sn) {
  scanning = false;
  setStatus("✓ พบ S/N: " + sn, "success");
  setTimeout(() => {
    closeCamera();
    searchInput.value = sn;
    document.getElementById("searchHint").textContent =
      "สแกนได้: " + raw + " → S/N: " + sn;
    document.getElementById("searchBtn").click();
  }, 700);
}

function closeCamera() {
  scanning = false;
  frameCount = 0;
  if (animFrame)   { cancelAnimationFrame(animFrame); animFrame = null; }
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
  hint.textContent = "กำลังส่งรูปให้ Backend อ่าน DataMatrix...";
  try {
    const result = await decodeViaBackend(file);
    if (result.serial_no) {
      searchInput.value = result.serial_no;
      hint.textContent  = "อ่านได้: " + result.raw + " → S/N: " + result.serial_no;
      document.getElementById("searchBtn").click();
    } else {
      hint.textContent = "อ่านได้: " + result.raw + " แต่ parse S/N ไม่ได้";
    }
  } catch(e) {
    hint.textContent = "⚠ " + e.message + " — ลองถ่ายรูปให้ชัดและใกล้ขึ้น";
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
