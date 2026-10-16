/* ═══════════════════════════════════════════════
   StunTrack — Main JavaScript
   ═══════════════════════════════════════════════ */
"use strict";

// ── DOM refs ──────────────────────────────────────────────────
const statusDot   = document.getElementById("statusDot");
const statusText  = document.getElementById("statusText");
const alertBar    = document.getElementById("alertBar");
const alertText   = document.getElementById("alertText");

const form        = document.getElementById("predictForm");
const btnSubmit   = document.getElementById("btnSubmit");
const btnLabel    = document.getElementById("btnLabel");
const btnLoading  = document.getElementById("btnLoading");

const imageInput  = document.getElementById("imageInput");
const uploadZone  = document.getElementById("uploadZone");
const uploadIdle  = document.getElementById("uploadIdle");
const uploadDone  = document.getElementById("uploadDone");
const previewImg  = document.getElementById("previewImg");
const previewName = document.getElementById("previewName");
const removeImg   = document.getElementById("removeImg");

const stateIdle   = document.getElementById("stateIdle");
const stateOutput = document.getElementById("stateOutput");
const stateError  = document.getElementById("stateError");

const verdictBox   = document.getElementById("verdictBox");
const verdictEmoji = document.getElementById("verdictEmoji");
const verdictLabel = document.getElementById("verdictLabel");
const verdictDesc  = document.getElementById("verdictDesc");
const errMsg       = document.getElementById("errMsg");

const btnReset     = document.getElementById("btnReset");
const btnResetErr  = document.getElementById("btnResetErr");

// ── State ─────────────────────────────────────────────────────
let MODEL_READY = false;

// ── Model status ──────────────────────────────────────────────
async function checkStatus() {
  try {
    const data = await fetch("/api/status").then(r => r.json());
    MODEL_READY = !!data.model_ready;

    if (MODEL_READY) {
      statusDot.className    = "status-dot ready";
      statusText.textContent = "Model siap";
      alertBar.style.display = "none";
      btnSubmit.disabled     = false;
      btnSubmit.title        = "";
    } else {
      statusDot.className    = "status-dot error";
      statusText.textContent = "Model tidak tersedia";
      alertBar.style.display = "flex";
      alertText.textContent  =
        "Model belum tersedia. Pastikan file stuntrack_v13_b3_lr_model.joblib " +
        "ada di dalam folder website/, lalu restart server.";
      btnSubmit.disabled = true;
      btnSubmit.title    = "Model belum tersedia";
    }
  } catch {
    MODEL_READY            = false;
    statusDot.className    = "status-dot error";
    statusText.textContent = "Server tidak terhubung";
    btnSubmit.disabled     = true;
    btnSubmit.title        = "Server tidak terhubung";
  }
}
checkStatus();

// ── Image upload & drag-drop ─────────────────────────────────
function showPreview(file) {
  previewImg.src          = URL.createObjectURL(file);
  previewName.textContent = file.name;
  uploadIdle.style.display = "none";
  uploadDone.style.display = "flex";
}

function clearPreview() {
  imageInput.value         = "";
  previewImg.src           = "";
  uploadIdle.style.display = "flex";
  uploadDone.style.display = "none";
}

imageInput.addEventListener("change", e => {
  if (e.target.files[0]) showPreview(e.target.files[0]);
});

removeImg.addEventListener("click", e => {
  e.stopPropagation();
  clearPreview();
});

uploadZone.addEventListener("dragover", e => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () =>
  uploadZone.classList.remove("drag-over")
);
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    imageInput.files = dt.files;
    showPreview(file);
  }
});

// ── Validation ────────────────────────────────────────────────
const FIELDS = [
  { id: "usia_bulan", label: "Usia",           min: 0,   max: 60 },
  { id: "bb_kg",      label: "Berat badan",    min: 0.1, max: 30 },
  { id: "lk_cm",      label: "Lingkar kepala", min: 5,   max: 70 },
  { id: "ll_cm",      label: "Lingkar lengan", min: 3,   max: 40 },
];

function setError(id, msg) {
  const wrap = document.getElementById("wrap_" + id);
  const err  = document.getElementById("err_" + id);
  if (wrap) wrap.classList.toggle("has-error", !!msg);
  if (err)  err.textContent = msg || "";
}

function validate() {
  let ok = true;

  FIELDS.forEach(({ id, label, min, max }) => {
    const el  = document.getElementById(id);
    const v   = parseFloat(el.value);
    const empty = el.value.trim() === "" || isNaN(v);
    const oob   = !empty && (v < min || v > max);

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

  const jkOk = !!document.querySelector("input[name='jk']:checked");
  document.getElementById("err_jk").textContent = jkOk ? "" : "Pilih jenis kelamin.";
  if (!jkOk) ok = false;

  return ok;
}

// Clear errors on input
FIELDS.forEach(({ id }) => {
  document.getElementById(id)?.addEventListener("input", () => setError(id, ""));
});
document.querySelectorAll("input[name='jk']").forEach(r =>
  r.addEventListener("change", () =>
    (document.getElementById("err_jk").textContent = "")
  )
);

// ── UI state ──────────────────────────────────────────────────
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

function animBar(el, pct, delay = 80) {
  setTimeout(() => (el.style.width = pct + "%"), delay);
}

// ── Render result ─────────────────────────────────────────────
function renderResult(data) {
  const isS = data.is_stunting;

  verdictBox.className     = "verdict-box " + (isS ? "v-s" : "v-n");
  verdictEmoji.textContent = isS ? "⚠️" : "✅";
  verdictLabel.textContent = data.prediction;
  verdictDesc.textContent  = isS
    ? "Anak terindikasi stunting. Segera konsultasikan dengan dokter atau tenaga kesehatan."
    : "Anak tidak terindikasi stunting. Tetap pantau tumbuh kembang secara rutin.";

  showState("output");

  // Scroll ke panel hasil di mobile
  if (window.innerWidth < 800) {
    document.getElementById("panelResult")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ── Form submit ────────────────────────────────────────────────
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!MODEL_READY) {
    errMsg.textContent =
      "Model belum tersedia. Pastikan file stuntrack_v13_b3_lr_model.joblib " +
      "sudah ada di folder website/ dan server sudah di-restart.";
    showState("error");
    return;
  }

  if (!validate()) return;

  setLoading(true);

  const fd = new FormData(form);
  if (imageInput.files[0]) fd.set("image", imageInput.files[0]);
  else fd.delete("image");

  try {
    const res  = await fetch("/api/predict", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);

    if (data.error) {
      errMsg.textContent = data.error;
      showState("error");
      return;
    }

    renderResult(data);

  } catch {
    setLoading(false);
    errMsg.textContent =
      "Tidak dapat terhubung ke server. Pastikan Flask sudah berjalan: python app.py";
    showState("error");
  }
});

// ── Reset ──────────────────────────────────────────────────────
function reset() {
  showState("idle");
}
btnReset?.addEventListener("click",    reset);
btnResetErr?.addEventListener("click", reset);

// ── Init ───────────────────────────────────────────────────────
showState("idle");
