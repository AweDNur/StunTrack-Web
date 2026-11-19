/* ══════════════════════════════════════════════════════════════
   StunTrack — Production JavaScript
   Features:
   1. B3 Late Fusion Stacking Inference (100% Trained Model)
   2. MediaPipe Landmark & Original Image Visualizer
   3. Strict Non-Human & Non-Baby Image Validation Alert
   4. 2-Step Verification Modal with Animated Pose Demonstration
   ══════════════════════════════════════════════════════════════ */
"use strict";

// ── DOM References ──────────────────────────────────────────
const statusDot           = document.getElementById("statusDot");
const statusText          = document.getElementById("statusText");
const alertBar            = document.getElementById("alertBar");
const alertText           = document.getElementById("alertText");

const form                = document.getElementById("predictForm");
const btnSubmit           = document.getElementById("btnSubmit");
const btnLabel            = document.getElementById("btnLabel");
const btnLoading          = document.getElementById("btnLoading");

const imageInput          = document.getElementById("imageInput");
const uploadZone          = document.getElementById("uploadZone");
const uploadIdle          = document.getElementById("uploadIdle");
const uploadValidating    = document.getElementById("uploadValidating");
const uploadDone          = document.getElementById("uploadDone");
const previewImg          = document.getElementById("previewImg");
const previewName         = document.getElementById("previewName");
const previewBadge        = document.getElementById("previewBadge");
const removeImg           = document.getElementById("removeImg");
const btnOpenGuideDirect  = document.getElementById("btnOpenGuideDirect");

// Guide Modal DOM
const guideModal          = document.getElementById("guideModal");
const btnCloseGuide       = document.getElementById("btnCloseGuide");
const btnCancelGuide      = document.getElementById("btnCancelGuide");
const chkConfirmGuide     = document.getElementById("chkConfirmGuide");
const btnProceedUpload    = document.getElementById("btnProceedUpload");

// Invalid Image Alert Modal DOM
const invalidImageModal   = document.getElementById("invalidImageModal");
const invalidImageMsg     = document.getElementById("invalidImageMsg");
const btnRetryPhoto       = document.getElementById("btnRetryPhoto");
const btnCloseInvalidModal= document.getElementById("btnCloseInvalidModal");

// Result Panel DOM
const stateIdle           = document.getElementById("stateIdle");
const stateOutput         = document.getElementById("stateOutput");
const stateError          = document.getElementById("stateError");

const verdictBox          = document.getElementById("verdictBox");
const verdictEmoji        = document.getElementById("verdictEmoji");
const verdictLabel        = document.getElementById("verdictLabel");
const verdictDesc         = document.getElementById("verdictDesc");
const tagConf             = document.getElementById("tagConf");
const tagArch             = document.getElementById("tagArch");

const mpResultSection     = document.getElementById("mpResultSection");
const mpBadgeCount        = document.getElementById("mpBadgeCount");
const resOriginalImg      = document.getElementById("resOriginalImg");
const resAnnotatedImg     = document.getElementById("resAnnotatedImg");

const errTitle            = document.getElementById("errTitle");
const errMsg              = document.getElementById("errMsg");
const btnReset            = document.getElementById("btnReset");
const btnResetErr         = document.getElementById("btnResetErr");

// ── State Variables ──────────────────────────────────────────
let MODEL_READY = false;
let userVerifiedGuidelines = false;
let pendingDroppedFile = null;

// ── Check Model Status ──────────────────────────────────────
async function checkStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    MODEL_READY = Boolean(data.model_ready);

    if (MODEL_READY) {
      statusDot.className = "status-dot ready";
      if (statusText) {
        statusText.textContent = "";
        statusText.style.display = "none";
      }
      alertBar.style.display = "none";
      btnSubmit.disabled = false;
      btnSubmit.title = "";
    } else {
      statusDot.className = "status-dot error";
      statusText.textContent = "Model Belum Tersedia";
      alertBar.style.display = "flex";
      alertText.textContent = "Artefak stuntrack_v13_b3_lr_model.joblib belum dimuat.";
      btnSubmit.disabled = true;
      btnSubmit.title = "Model belum tersedia";
    }
  } catch (err) {
    MODEL_READY = false;
    statusDot.className = "status-dot error";
    statusText.textContent = "Server Tidak Terhubung";
    btnSubmit.disabled = true;
    btnSubmit.title = "Server Flask belum aktif di port 5000";
  }
}
checkStatus();

// ── 2-Step Verification Modal Logic (Point 4) ───────────────

function openGuideModal(droppedFile = null) {
  pendingDroppedFile = droppedFile;
  chkConfirmGuide.checked = false;
  btnProceedUpload.disabled = true;

  if (droppedFile) {
    btnProceedUpload.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Saya Telah Paham, Gunakan Foto Ini
    `;
  } else {
    btnProceedUpload.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2zM12 11v6m-3-3l3-3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Saya Telah Paham, Buka Folder &amp; Pilih Foto
    `;
  }

  guideModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeGuideModal() {
  pendingDroppedFile = null;
  guideModal.style.display = "none";
  document.body.style.overflow = "";
}

chkConfirmGuide.addEventListener("change", () => {
  btnProceedUpload.disabled = !chkConfirmGuide.checked;
});

btnProceedUpload.addEventListener("click", () => {
  if (!chkConfirmGuide.checked) return;

  userVerifiedGuidelines = true;
  const currentPending = pendingDroppedFile;
  closeGuideModal();

  if (currentPending) {
    // Foto dari drag & drop baru diterapkan setelah diverifikasi
    const dt = new DataTransfer();
    dt.items.add(currentPending);
    imageInput.files = dt.files;
    handleFileSelected(currentPending);
  } else {
    // Foto dari klik folder: buka dialog folder/file explorer OS SEKARANG
    imageInput.click();
  }
});

btnCloseGuide.addEventListener("click", closeGuideModal);
btnCancelGuide.addEventListener("click", closeGuideModal);
btnOpenGuideDirect.addEventListener("click", () => openGuideModal(null));

// Close modal when clicking outside modal card
guideModal.addEventListener("click", (e) => {
  if (e.target === guideModal) {
    closeGuideModal();
  }
});

// Trigger guide modal on dropzone click instead of immediate file picker
uploadZone.addEventListener("click", (e) => {
  // If clicking remove button or preview is active, don't trigger upload
  if (e.target.closest("#removeImg")) return;
  if (previewImg.src && uploadDone.style.display !== "none") return;

  // Intercept and open Step 1 & 2 verification modal first!
  openGuideModal(null);
});

// Prevent any unexpected click bubbling from hidden input
imageInput.addEventListener("click", (e) => {
  e.stopPropagation();
});

// ── Image Selection & Validation (Points 3 & Adult Rejection) ──

async function handleFileSelected(file) {
  if (!file) return;

  // Show validating indicator in dropzone
  uploadIdle.style.display = "none";
  uploadDone.style.display = "none";
  if (uploadValidating) uploadValidating.style.display = "flex";

  try {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/validate-image", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.valid || data.invalid_image) {
      // Photo is adult, animal, non-human, or invalid:
      // Completely reject it and remove it from input!
      clearPreview();
      const reason = data.error || "Foto terdeteksi bukan bayi/balita. Sistem hanya menerima foto bayi atau balita.";
      showInvalidImageAlert(reason);
      return;
    }

    // Valid infant / toddler photo:
    closeInvalidImageAlert();
    if (alertBar) {
      alertBar.style.display = "none";
      if (alertText) alertText.textContent = "";
    }
    previewImg.src = URL.createObjectURL(file);
    previewName.textContent = file.name;
    if (previewBadge) {
      previewBadge.textContent = `✓ Foto Bayi Terverifikasi (${data.landmark_count || 33} Titik Sendi)`;
    }
    if (uploadValidating) uploadValidating.style.display = "none";
    uploadDone.style.display = "flex";

  } catch (err) {
    console.warn("Pre-validation check error:", err);
    clearPreview();
    showInvalidImageAlert("Gagal memvalidasi foto secara otomatis. Pastikan server AI berjalan dan foto merupakan foto seluruh tubuh (full-body) bayi/balita yang jelas.");
  }
}

function clearPreview() {
  imageInput.value = "";
  previewImg.src = "";
  previewName.textContent = "";
  if (uploadValidating) uploadValidating.style.display = "none";
  uploadIdle.style.display = "flex";
  uploadDone.style.display = "none";
  closeInvalidImageAlert();
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }
}

imageInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    handleFileSelected(file);
  }
});

removeImg.addEventListener("click", (e) => {
  e.stopPropagation();
  clearPreview();
});

// Drag and drop handlers
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("drag-over");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer && e.dataTransfer.files[0];
  if (file) {
    // Cegat drag & drop: JANGAN langsung preview, tampilkan popup verifikasi terlebih dahulu!
    openGuideModal(file);
  }
});

// ── Invalid Image Alert Modal Logic (Point 3) ───────────────

function showInvalidImageAlert(errorMessage) {
  const msg = errorMessage || "Gambar tidak valid dan tidak bisa dilakukan prediksi. Gambar yang diunggah bukan foto bayi/manusia yang memenuhi kriteria.";
  invalidImageMsg.textContent = msg;
  invalidImageModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Sembunyikan alertBar banner agar tidak tertinggal/menempel di atas halaman
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }
}

function closeInvalidImageAlert() {
  invalidImageModal.style.display = "none";
  document.body.style.overflow = "";
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }
}

btnCloseInvalidModal.addEventListener("click", closeInvalidImageAlert);

btnRetryPhoto.addEventListener("click", () => {
  closeInvalidImageAlert();
  clearPreview();
  openGuideModal();
});

invalidImageModal.addEventListener("click", (e) => {
  if (e.target === invalidImageModal) {
    closeInvalidImageAlert();
  }
});

// ── Form Validation ──────────────────────────────────────────
const FIELDS = [
  { id: "usia_bulan", label: "Usia",           min: 0,   max: 60 },
  { id: "bb_kg",      label: "Berat badan",    min: 0.1, max: 30 },
  { id: "lk_cm",      label: "Lingkar kepala", min: 5,   max: 70 },
  { id: "ll_cm",      label: "Lingkar lengan", min: 3,   max: 40 },
];

function setError(id, msg) {
  const wrap = document.getElementById("wrap_" + id);
  const err  = document.getElementById("err_" + id);
  if (wrap) wrap.classList.toggle("has-error", Boolean(msg));
  if (err)  err.textContent = msg || "";
}

function validate() {
  let ok = true;

  FIELDS.forEach(({ id, label, min, max }) => {
    const el = document.getElementById(id);
    const v = parseFloat(el.value);
    const empty = el.value.trim() === "" || isNaN(v);
    const oob = !empty && (v < min || v > max);

    if (empty) {
      setError(id, `${label} wajib diisi.`);
      ok = false;
    } else if (oob) {
      setError(id, `Nilai harus antara ${min}–${max}.`);
      ok = false;
    } else {
      setError(id, "");
    }
  });

  const jkOk = Boolean(document.querySelector("input[name='jk']:checked"));
  document.getElementById("err_jk").textContent = jkOk ? "" : "Pilih jenis kelamin.";
  if (!jkOk) ok = false;

  return ok;
}

FIELDS.forEach(({ id }) => {
  document.getElementById(id)?.addEventListener("input", () => setError(id, ""));
});

document.querySelectorAll("input[name='jk']").forEach((r) =>
  r.addEventListener("change", () =>
    (document.getElementById("err_jk").textContent = "")
  )
);

// ── UI State Control ─────────────────────────────────────────

function showState(s) {
  stateIdle.style.display   = s === "idle"   ? "flex" : "none";
  stateOutput.style.display = s === "output" ? "flex" : "none";
  stateError.style.display  = s === "error"  ? "flex" : "none";
}

function setLoading(on) {
  btnLabel.style.display   = on ? "none" : "flex";
  btnLoading.style.display = on ? "flex" : "none";
  btnSubmit.disabled       = on;
}

// ── Render Prediction Result (Points 1 & 2) ──────────────────

function renderResult(data) {
  closeInvalidImageAlert();
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }

  const isS = data.is_stunting;

  verdictBox.className = "verdict-box " + (isS ? "v-s" : "v-n");
  verdictEmoji.textContent = isS ? "⚠️" : "✅";
  verdictLabel.textContent = data.prediction;
  verdictDesc.textContent = isS
    ? "Anak terindikasi stunting berdasarkan integrasi biometrik & klinis. Disarankan untuk segera melakukan konsultasi dengan dokter spesialis anak atau posyandu terdekat."
    : "Anak tidak terindikasi stunting. Pertumbuhan dan proporsi tubuh berada dalam rentang normal. Tetap pantau tumbuh kembang secara berkala.";

  tagConf.textContent = `Tingkat Keyakinan: ${data.confidence ?? "-"}%`;
  if (tagArch) tagArch.style.display = "none";

  // Render original & MediaPipe landmark images (Point 2)
  if (data.mp_detected && data.annotated_image && data.original_image) {
    resOriginalImg.src = data.original_image;
    resAnnotatedImg.src = data.annotated_image;
    mpBadgeCount.textContent = `${data.landmark_count || 33} Landmark Terdeteksi`;
    mpResultSection.style.display = "block";
  } else {
    mpResultSection.style.display = "none";
  }

  showState("output");

  if (window.innerWidth < 800) {
    document.getElementById("panelResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ── Submit Prediction Form ───────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  closeInvalidImageAlert();
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }

  if (!MODEL_READY) {
    errTitle.textContent = "Model Belum Tersedia";
    errMsg.textContent = "Model belum siap. Pastikan server Flask sudah berjalan dan file model telah diekspor.";
    showState("error");
    return;
  }

  if (!validate()) return;

  setLoading(true);

  const fd = new FormData(form);
  const file = imageInput.files && imageInput.files[0];
  if (file) {
    fd.set("image", file);
  } else {
    fd.delete("image");
  }

  try {
    const res = await fetch("/api/predict", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    // If server rejects image as invalid / non-baby / adult (Point 3)
    if (data.invalid_image || (data.error && data.error.toLowerCase().includes("tidak valid"))) {
      clearPreview();
      showInvalidImageAlert(data.error || "Foto tidak memenuhi standar biometrik bayi.");
      return;
    }

    if (!res.ok || data.error) {
      errTitle.textContent = "Terjadi Kesalahan";
      errMsg.textContent = data.error || `Server mengembalikan respon galat (${res.status}).`;
      showState("error");
      return;
    }

    renderResult(data);

  } catch (networkError) {
    setLoading(false);
    errTitle.textContent = "Koneksi Terputus";
    errMsg.textContent = "Gagal menghubungi server inferensi AI. Pastikan server berjalan di http://localhost:5000.";
    showState("error");
  }
});

// ── Reset ───────────────────────────────────────────────────

function reset() {
  closeInvalidImageAlert();
  if (alertBar) {
    alertBar.style.display = "none";
    if (alertText) alertText.textContent = "";
  }
  showState("idle");
  clearPreview();
}

btnReset?.addEventListener("click", reset);
btnResetErr?.addEventListener("click", reset);

// ── Initialize ──────────────────────────────────────────────
showState("idle");
