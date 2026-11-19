"""
StunTrack — Flask Web Application & Inference Service
Pipeline: B3 Late Fusion Tabular + MediaPipe Pose + BorderlineSMOTE + Logistic Regression Meta-Learner
Model: Trained on 100% data (346 samples) based on Penelitian_Pak_Yoh.ipynb analysis (Winning scenario: B3 AUC=0.8862)
"""

import os
import re
import math
import uuid
import base64
import threading
import warnings
import numpy as np
from flask import Flask, request, jsonify, render_template, make_response
from werkzeug.utils import secure_filename

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# Optional heavy imports — gracefully degrade when model not yet exported
# ─────────────────────────────────────────────────────────────────────────────
try:
    import joblib
    JOBLIB_OK = True
except ImportError:
    JOBLIB_OK = False

try:
    import cv2
    CV2_OK = True
except ImportError:
    CV2_OK = False

try:
    from PIL import Image, ImageOps, ImageFile
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    PIL_OK = True
except ImportError:
    PIL_OK = False

try:
    import mediapipe as mp
    MP_OK = True
except ImportError:
    MP_OK = False

# ─────────────────────────────────────────────────────────────────────────────
# Constants (mirror build model.py exactly)
# ─────────────────────────────────────────────────────────────────────────────
IMAGE_SIZE       = 512
MP_FEAT_DIM      = 69
CALIB_H2H        = 0.82
CALIB_SEG        = 0.80
CALIB_REF_CM     = 75.0
CLASS_NAMES      = ["Stunting", "Tidak Stunting"]
IDX_TO_CLASS     = {0: "Stunting", 1: "Tidak Stunting"}
TABULAR_FEATURES = ["usia_bulan", "jk", "bb_kg", "lk_cm", "ll_cm"]
FIELD_ALIASES = {
    "usia_bulan": ["usia_bulan", "usia", "age_months", "age"],
    "jk":         ["jk", "gender", "sex", "jenis_kelamin"],
    "bb_kg":      ["bb_kg", "bb", "weight_kg", "weight", "berat_badan"],
    "lk_cm":      ["lk_cm", "lk", "head_circ_cm", "head_circumference", "lingkar_kepala"],
    "ll_cm":      ["ll_cm", "ll", "arm_circ_cm", "arm_length", "lila", "lingkar_lengan"],
}
BASE_MODEL_KEYS  = ["SVM_RBF", "DecisionTree", "RandomForest", "GradientBoosting", "LogisticRegression", "MLP"]

ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "bmp", "tiff", "tif",
    "gif", "webp", "avif", "heic", "heif",
    "jp2", "jfif", "ppm", "pgm", "pbm",
}

MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "stuntrack_v13_b3_lr_model.joblib")
)
TASK_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "pose_landmarker.task")
)

# ─────────────────────────────────────────────────────────────────────────────
# Flask app
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024   # 32 MB upload limit
app.config["UPLOAD_FOLDER"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Model loading
# ─────────────────────────────────────────────────────────────────────────────
_artifacts = None

def load_model():
    global _artifacts
    if _artifacts is not None:
        return _artifacts
    if not JOBLIB_OK:
        print("[StunTrack] joblib is not available")
        return None
    if not os.path.isfile(MODEL_PATH):
        print(f"[StunTrack] Model file not found at {MODEL_PATH}")
        return None
    try:
        _artifacts = joblib.load(MODEL_PATH)
        print(f"[StunTrack] Model loaded successfully from {MODEL_PATH}")
        return _artifacts
    except Exception as e:
        print(f"[StunTrack] ERROR loading model: {e}")
        return None


def model_is_ready():
    return load_model() is not None

# Pre-load model on module initialization
try:
    load_model()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# MediaPipe helpers (mirrors build model.py exactly)
# ─────────────────────────────────────────────────────────────────────────────

class Landmark:
    __slots__ = ("x", "y", "z", "visibility")

    def __init__(self, x, y, z, visibility=1.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        self.visibility = float(visibility)


def _dist(a, b):
    return float(math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + (a.z - b.z)**2))


def _dist2d(a, b):
    return float(math.hypot(a.x - b.x, a.y - b.y))


def _mid(a, b):
    return Landmark((a.x + b.x) / 2.0, (a.y + b.y) / 2.0, (a.z + b.z) / 2.0)


def _div(n, d, eps=1e-7):
    return float(n) / (float(d) + eps)


def preprocess_image(path):
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    arr = np.array(img)
    lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l_ch)
    lab_eq = cv2.merge([l_eq, a_ch, b_ch])
    arr = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2RGB)
    img = Image.fromarray(arr)
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    return img


def compute_mediapipe_features(lm, height_alpha=0.0, height_beta=1.0):
    nose         = lm[0]
    l_ear, r_ear = lm[7],  lm[8]
    l_sh,  r_sh  = lm[11], lm[12]
    l_el,  r_el  = lm[13], lm[14]
    l_wr,  r_wr  = lm[15], lm[16]
    l_hp,  r_hp  = lm[23], lm[24]
    l_kn,  r_kn  = lm[25], lm[26]
    l_ank, r_ank = lm[27], lm[28]
    l_hl,  r_hl  = lm[29], lm[30]
    l_ft,  r_ft  = lm[31], lm[32]

    mid_ear = _mid(l_ear, r_ear)
    mid_sh  = _mid(l_sh,  r_sh)
    mid_hp  = _mid(l_hp,  r_hp)
    mid_hl  = _mid(l_hl,  r_hl)

    hip_w     = _dist(l_hp, r_hp) + 1e-7
    sh_w      = _dist(l_sh, r_sh)
    ear_w     = _dist(l_ear, r_ear)
    head_h    = _dist(nose, mid_ear)
    neck_len  = _dist(mid_ear, mid_sh)
    torso_len = _dist(mid_sh, mid_hp)

    l_thigh = _dist(l_hp,  l_kn);  r_thigh = _dist(r_hp,  r_kn)
    l_shin  = _dist(l_kn,  l_ank); r_shin  = _dist(r_kn,  r_ank)
    l_foot  = _dist(l_ank, l_ft);  r_foot  = _dist(r_ank, r_ft)
    l_leg   = l_thigh + l_shin;    r_leg   = r_thigh + r_shin
    l_full  = l_thigh + l_shin + l_foot
    r_full  = r_thigh + r_shin + r_foot

    l_uarm = _dist(l_sh, l_el); r_uarm = _dist(r_sh, r_el)
    l_farm = _dist(l_el, l_wr); r_farm = _dist(r_el, r_wr)
    l_arm  = l_uarm + l_farm;   r_arm  = r_uarm + r_farm

    avg_thigh = (l_thigh + r_thigh) / 2
    avg_shin  = (l_shin  + r_shin)  / 2
    avg_leg   = (l_leg   + r_leg)   / 2
    avg_full  = (l_full  + r_full)  / 2
    avg_arm   = (l_arm   + r_arm)   / 2
    avg_uarm  = (l_uarm  + r_uarm)  / 2
    avg_farm  = (l_farm  + r_farm)  / 2
    avg_foot  = (l_foot  + r_foot)  / 2

    sitting_h  = head_h + neck_len + torso_len
    body_total = sitting_h + avg_full

    blk_a = np.array([
        _div(head_h,     hip_w), _div(neck_len,   hip_w), _div(torso_len,  hip_w),
        _div(sitting_h,  hip_w), _div(avg_thigh,  hip_w), _div(avg_shin,   hip_w),
        _div(avg_leg,    hip_w), _div(avg_full,   hip_w), _div(avg_arm,    hip_w),
        _div(avg_uarm,   hip_w), _div(avg_farm,   hip_w), _div(sh_w,       hip_w),
        _div(ear_w,      hip_w), _div(body_total, hip_w),
        _div(head_h,     body_total), _div(torso_len, body_total),
        _div(avg_leg,    body_total), _div(avg_full,  body_total),
        _div(sitting_h,  body_total), _div(avg_arm,   body_total),
        _div(avg_thigh,  avg_leg),    _div(avg_shin,  avg_leg),
        _div(avg_thigh,  avg_shin),   _div(avg_leg,   torso_len),
        _div(avg_leg,    sitting_h),  _div(avg_arm,   avg_leg),
        _div(avg_uarm,   avg_arm),    _div(avg_farm,  avg_arm),
        _div(sh_w,       torso_len),  _div(sh_w,      avg_leg),
        _div(l_thigh, l_leg) if l_leg > 1e-6 else 0.0,
        _div(r_thigh, r_leg) if r_leg > 1e-6 else 0.0,
        _div(head_h,  torso_len),   _div(head_h,  avg_leg),
        _div(neck_len, torso_len),  _div(avg_leg, avg_arm),
        _div(avg_shin, avg_thigh),  _div(avg_full, avg_arm),
        _div(torso_len, avg_thigh), _div(ear_w,   sh_w),
    ], dtype=np.float64)

    h2h_y    = abs(nose.y - mid_hl.y) + 1e-7
    h2h_3d   = _dist(nose, mid_hl) + 1e-7
    seg_full = head_h + neck_len + torso_len + avg_thigh + avg_shin + avg_foot
    seg_nof  = head_h + neck_len + torso_len + avg_thigh + avg_shin

    est_y_raw   = _div(h2h_y,    CALIB_H2H) * CALIB_REF_CM
    est_seg_raw = _div(seg_full, CALIB_SEG) * CALIB_REF_CM
    est_nof_raw = _div(seg_nof,  CALIB_SEG) * CALIB_REF_CM
    est_comb_raw = (est_y_raw + est_seg_raw) / 2

    est_y    = height_alpha + height_beta * est_y_raw
    est_seg  = height_alpha + height_beta * est_seg_raw
    est_nof  = height_alpha + height_beta * est_nof_raw
    est_comb = height_alpha + height_beta * est_comb_raw

    blk_b = np.array([
        h2h_y, h2h_3d, seg_full, seg_nof,
        est_y, est_seg, est_nof, est_comb,
        _div(sitting_h,  hip_w) * 12.0,
        _div(avg_full,   hip_w) * 12.0,
        _div(body_total, hip_w) * 12.0,
        abs(nose.y - mid_hl.y) / (h2h_3d + 1e-7),
    ], dtype=np.float64)

    sym_arm   = _div(abs(l_arm-r_arm),     max(l_arm,r_arm)+1e-7)
    sym_leg   = _div(abs(l_leg-r_leg),     max(l_leg,r_leg)+1e-7)
    sym_thigh = _div(abs(l_thigh-r_thigh), max(l_thigh,r_thigh)+1e-7)
    sym_shin  = _div(abs(l_shin-r_shin),   max(l_shin,r_shin)+1e-7)
    sym_uarm  = _div(abs(l_uarm-r_uarm),   max(l_uarm,r_uarm)+1e-7)
    sym_farm  = _div(abs(l_farm-r_farm),   max(l_farm,r_farm)+1e-7)

    blk_c = np.array([
        sym_arm, sym_leg, sym_thigh, sym_shin, sym_uarm, sym_farm,
        abs(l_sh.y  - r_sh.y),
        abs(l_hp.y  - r_hp.y),
        abs(mid_sh.x - mid_hp.x) / hip_w,
    ], dtype=np.float64)

    shr = _div(sitting_h, body_total)
    llr = _div(avg_full,  body_total)

    blk_d = np.array([
        shr, llr,
        _div(shr,       llr),
        _div(avg_leg,   body_total),
        _div(avg_thigh, body_total),
        _div(sh_w,      avg_leg),
        shr,
        _div(avg_leg,   sitting_h),
    ], dtype=np.float64)

    return np.concatenate([blk_a, blk_b, blk_c, blk_d])


# ─────────────────────────────────────────────────────────────────────────────
# Human Baby / Pediatric Image Validation (Point 3)
# ─────────────────────────────────────────────────────────────────────────────

def validate_human_baby_pose(lm_list):
    """
    Validates whether the detected pose genuinely represents a human infant/toddler
    (0-60 months) suitable for stunting biometric assessment. Rejects non-human images
    (animals, objects, graphics) and strictly rejects adult humans (mature skeletal frame,
    elongated limbs, broad biacromial diameter, or half-body cropped portraits/selfies).
    Returns (is_valid: bool, reason_message: str).
    """
    if not lm_list or len(lm_list) < 33:
        return False, "Tidak terdeteksi postur tubuh manusia pada gambar. Sistem mendeteksi bahwa gambar yang diunggah bukan foto bayi/manusia."

    def vis(idx):
        lm = lm_list[idx]
        return getattr(lm, "visibility", 1.0)

    # 1. Essential anatomical landmarks check
    nose = lm_list[0]
    l_ear, r_ear = lm_list[7], lm_list[8]
    l_sh, r_sh = lm_list[11], lm_list[12]
    l_hp, r_hp = lm_list[23], lm_list[24]
    l_kn, r_kn = lm_list[25], lm_list[26]
    l_ank, r_ank = lm_list[27], lm_list[28]
    l_ft, r_ft = lm_list[31], lm_list[32]

    sh_vis = max(vis(11), vis(12))
    hp_vis = max(vis(23), vis(24))
    kn_vis = max(vis(25), vis(26))
    ank_vis = max(vis(27), vis(28))
    ft_vis = max(vis(31), vis(32))

    if sh_vis < 0.20:
        return False, "Bahu bayi tidak terdeteksi dengan jelas. Pastikan tubuh bagian atas terlihat jelas tanpa tertutup selimut atau pakaian tebal."

    if hp_vis < 0.20:
        return False, "Pinggul bayi tidak terdeteksi. Pastikan area torso dan pinggul terlihat untuk pengukuran proporsi tubuh."

    # Full-body verification: knees and ankles must be detected
    if kn_vis < 0.20 or ank_vis < 0.18:
        return False, "Kaki atau tungkai bawah bayi tidak terdeteksi lengkap. Penilaian stunting membutuhkan foto seluruh tubuh dari puncak kepala hingga ujung kaki (full-body)."

    # 2. Vertical span & framing coverage check
    ys = [float(lm.y) for lm in lm_list]
    xs = [float(lm.x) for lm in lm_list]
    span_y = max(ys) - min(ys)
    span_x = max(xs) - min(xs)

    if span_y < 0.22 and span_x < 0.15:
        return False, "Sosok tubuh terlalu kecil pada gambar. Harap ambil foto dari jarak yang proporsional sehingga seluruh tubuh terlihat jelas."

    # Check for truncated lower body (adult portraits / waist-up cropped photos / selfies)
    if min(l_ank.y, r_ank.y) > 0.985 or max(l_ank.y, r_ank.y) > 1.05:
        return False, "Foto terpotong di bagian tungkai/kaki. Penilaian stunting memerlukan foto seluruh tubuh dari puncak kepala hingga ujung kaki (full-body)."

    if max(l_kn.y, r_kn.y) > 0.94 and ank_vis < 0.28:
        return False, "Foto terpotong di bagian bawah tubuh. Penilaian stunting memerlukan foto seluruh tubuh dari puncak kepala hingga ujung kaki (full-body)."

    # 3. Geometric & Anatomical sanity check
    hip_w = _dist(l_hp, r_hp)
    sh_w = _dist(l_sh, r_sh)
    torso_len = _dist(_mid(l_sh, r_sh), _mid(l_hp, r_hp))

    if hip_w < 0.012 or sh_w < 0.015:
        return False, "Lebar bahu atau pinggul tidak proporsional untuk anatomi manusia. Sistem mendeteksi gambar bukan foto tubuh manusia/bayi yang valid."

    if torso_len < 0.025:
        return False, "Panjang torso tubuh tidak proporsional. Pastikan bayi berada dalam posisi lurus menghadap kamera."

    # Extreme asymmetry / distortion check
    l_arm_len = _dist(l_sh, lm_list[13]) + _dist(lm_list[13], lm_list[15])
    r_arm_len = _dist(r_sh, lm_list[14]) + _dist(lm_list[14], lm_list[16])
    l_leg_len = _dist(l_hp, l_kn) + _dist(l_kn, l_ank)
    r_leg_len = _dist(r_hp, r_kn) + _dist(r_kn, r_ank)

    sym_arm = _div(abs(l_arm_len - r_arm_len), max(l_arm_len, r_arm_len) + 1e-7)
    sym_leg = _div(abs(l_leg_len - r_leg_len), max(l_leg_len, r_leg_len) + 1e-7)

    if sym_arm > 0.88 or sym_leg > 0.88:
        return False, "Struktur rangka sendi sangat asimetris atau terdistorsi tidak wajar. Gambar terdeteksi bukan foto postur bayi yang valid."

    # 4. Strict Pediatric vs Adult Human Differentiation
    # Cephalocaudal Development & Anthropometrics:
    # - Balita (0-60 mo): Large cranium, short arms (arm/torso 0.65-1.15), short legs (leg/torso 0.70-1.45), narrow shoulders.
    # - Adults: Small cranium fraction (1/8 stature), elongated limbs (arm/torso 1.25-1.60, leg/torso 1.55-2.10),
    #   broad biacromial shoulders (sh/ear > 2.30, sh/eye > 6.2).
    mid_sh = _mid(l_sh, r_sh)
    mid_hp = _mid(l_hp, r_hp)
    mid_ear = _mid(l_ear, r_ear)

    sh_w_2d = _dist2d(l_sh, r_sh)
    hip_w_2d = _dist2d(l_hp, r_hp)
    torso_2d = _dist2d(mid_sh, mid_hp)
    head_h_2d = _dist2d(nose, mid_ear)
    neck_2d = _dist2d(mid_ear, mid_sh)
    ear_w_2d = _dist2d(l_ear, r_ear)
    eye_w_2d = _dist2d(lm_list[2], lm_list[5])

    # Reject close-up selfies / portraits where head fills the frame and lower body is absent
    if head_h_2d > 0.16 and (kn_vis < 0.35 or ank_vis < 0.35):
        return False, "Foto terdeteksi sebagai foto potret/selfie jarak dekat. Penilaian stunting memerlukan foto seluruh tubuh (full-body) dari kepala hingga ujung kaki."

    l_arm_2d = _dist2d(l_sh, lm_list[13]) + _dist2d(lm_list[13], lm_list[15])
    r_arm_2d = _dist2d(r_sh, lm_list[14]) + _dist2d(lm_list[14], lm_list[16])
    avg_arm_2d = (l_arm_2d + r_arm_2d) / 2.0

    l_leg_2d = _dist2d(l_hp, l_kn) + _dist2d(l_kn, l_ank)
    r_leg_2d = _dist2d(r_hp, r_kn) + _dist2d(r_kn, r_ank)
    avg_leg_2d = (l_leg_2d + r_leg_2d) / 2.0

    sitting_2d = head_h_2d + neck_2d + torso_2d
    body_2d = sitting_2d + avg_leg_2d

    leg_torso_2d = avg_leg_2d / (torso_2d + 1e-7)
    arm_torso_2d = avg_arm_2d / (torso_2d + 1e-7)
    sh_ear_2d = sh_w_2d / (ear_w_2d + 1e-7) if ear_w_2d > 0.008 else 0.0
    sh_eye_ratio = sh_w_2d / (eye_w_2d + 1e-7) if eye_w_2d > 0.004 else 0.0
    face_stature_2d = ear_w_2d / (body_2d + 1e-7) if ear_w_2d > 0.008 else 0.0
    shr_2d = sitting_2d / (body_2d + 1e-7)
    leg_stature_2d = avg_leg_2d / (body_2d + 1e-7)

    # Gross distortion check (leg_torso > 3.0 or leg_torso < 0.25)
    if leg_torso_2d > 3.0 or leg_torso_2d < 0.25:
        return False, "Proporsi tubuh terdeteksi tidak wajar atau bukan bayi/balita. Sistem StunTrack dikhususkan untuk deteksi stunting pada bayi dan balita."

    # ── A. Definitive Infant Anthropometric Safeguards ──
    # 1. Torso-dominant infant body: Sitting height >= 58% and short legs <= 42%
    # An adult human cannot physically possess this proportion regardless of head angle.
    if shr_2d >= 0.580 and leg_stature_2d <= 0.420 and leg_torso_2d <= 1.25:
        return True, "Valid"

    # 2. Infant short-limb pediatric proportion: leg/torso <= 1.20 with infant body mass
    if leg_torso_2d <= 1.20 and shr_2d >= 0.540 and leg_stature_2d <= 0.460:
        return True, "Valid"

    # 3. Cranium-dominant infant head: Large cranium (> 12.5% stature) and narrow infant shoulders
    if face_stature_2d > 0.125 and (sh_ear_2d < 2.20 or sh_eye_ratio < 3.80):
        return True, "Valid"

    # ── B. Multi-Domain Adult Biological Indicators ──
    # Mature cranial proportion (adult cranium width < 12.5% stature)
    is_adult_head = (face_stature_2d > 0.0 and face_stature_2d < 0.125)
    # Broad biacromial shoulders relative to head/eyes
    is_adult_shoulder = (sh_ear_2d > 2.15) or (sh_eye_ratio > 4.60)
    # Leg-dominant stature (adult SHR < 55.0%, leg stature > 45.0%)
    is_adult_shr = (shr_2d < 0.550) and (leg_stature_2d > 0.450)
    # Elongated adult arm (arm/torso > 1.15)
    is_adult_arm = (arm_torso_2d > 1.15)
    # Elongated adult leg (leg/torso > 1.45)
    is_adult_leg = (leg_torso_2d > 1.45)

    # ── C. Standalone Fatal Conjunctions (Confirmed Adult Anatomy) ──
    # Broad shoulders + adult head ratio + non-infant body
    if is_adult_shoulder and is_adult_head and (shr_2d < 0.580 or leg_stature_2d > 0.420):
        return False, "Gambar terdeteksi postur orang dewasa (bahu lebar dan proporsi kranium dewasa). Sistem StunTrack hanya menerima foto balita (0–60 bulan)."

    # Adult leg-dominant stature + cranial/shoulder/leg elongation
    if is_adult_shr and (is_adult_head or is_adult_shoulder or is_adult_leg):
        return False, "Gambar terdeteksi postur orang dewasa (proporsi kranium mikro dan tungkai bawah dominan dewasa). Sistem StunTrack hanya menerima foto balita (0–60 bulan)."

    # Adult arm elongation + shoulder/head/leg trait
    if is_adult_arm and (is_adult_shoulder or is_adult_shr or is_adult_head or is_adult_leg):
        return False, "Gambar terdeteksi postur orang dewasa (lengan panjang khas dewasa). Sistem StunTrack hanya menerima foto balita (0–60 bulan)."

    # Adult leg elongation + shoulder/shr/arm trait
    if is_adult_leg and (is_adult_shoulder or is_adult_shr or is_adult_arm):
        return False, "Gambar terdeteksi postur orang dewasa (tungkai kaki panjang khas dewasa). Sistem StunTrack hanya menerima foto balita (0–60 bulan)."

    # ── D. Multi-Domain Conjunction Scoring ──
    adult_score = sum([is_adult_head, is_adult_shoulder, is_adult_shr, is_adult_arm, is_adult_leg])
    if adult_score >= 2:
        return False, "Gambar terdeteksi postur orang dewasa (kombinasi proporsi biometrik orang dewasa). Sistem StunTrack hanya menerima foto balita (0–60 bulan)."

    return True, "Valid"


# ─────────────────────────────────────────────────────────────────────────────
# Landmark Visualization & Drawing (Point 2)
# ─────────────────────────────────────────────────────────────────────────────

def draw_pose_landmarks(image_rgb, lm_list):
    """
    Renders 33 anatomical landmarks and skeleton connections on the image.
    Uses clinical emerald-cyan glow and coral joint dots for high clarity.
    Returns RGB numpy array.
    """
    img_bgr = cv2.cvtColor(np.array(image_rgb), cv2.COLOR_RGB2BGR)
    h, w = img_bgr.shape[:2]

    # MediaPipe pose connections
    POSE_CONNECTIONS = [
        # Head / Facial features
        (0, 1), (1, 2), (2, 3), (3, 7),
        (0, 4), (4, 5), (5, 6), (6, 8),
        (9, 10),
        # Upper body & Arms
        (11, 12),
        (11, 13), (13, 15),
        (12, 14), (14, 16),
        # Torso & Core
        (11, 23), (12, 24), (23, 24),
        # Lower body & Legs
        (23, 25), (25, 27), (27, 29), (29, 31), (27, 31),
        (24, 26), (26, 28), (28, 30), (30, 32), (28, 32),
    ]

    # Draw skeleton lines (glowing emerald-cyan lines)
    for s_idx, e_idx in POSE_CONNECTIONS:
        if s_idx < len(lm_list) and e_idx < len(lm_list):
            p1 = lm_list[s_idx]
            p2 = lm_list[e_idx]
            x1, y1 = int(p1.x * w), int(p1.y * h)
            x2, y2 = int(p2.x * w), int(p2.y * h)
            x1 = max(0, min(w - 1, x1))
            y1 = max(0, min(h - 1, y1))
            x2 = max(0, min(w - 1, x2))
            y2 = max(0, min(h - 1, y2))
            # Outer line
            cv2.line(img_bgr, (x1, y1), (x2, y2), (0, 215, 120), 3, cv2.LINE_AA)
            # Inner bright line
            cv2.line(img_bgr, (x1, y1), (x2, y2), (240, 255, 255), 1, cv2.LINE_AA)

    # Draw anatomical keypoint circles
    for idx, lm in enumerate(lm_list):
        cx, cy = int(lm.x * w), int(lm.y * h)
        cx = max(0, min(w - 1, cx))
        cy = max(0, min(h - 1, cy))

        if idx <= 10:
            outer_color = (0, 220, 255)      # Head/Face: Yellow-Gold
        elif idx in [11, 12, 23, 24]:
            outer_color = (255, 130, 0)      # Shoulders/Hips: Electric Blue
        elif idx in [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]:
            outer_color = (0, 195, 255)      # Arms: Cyan
        else:
            outer_color = (40, 60, 255)      # Legs & Feet: Coral-Red

        cv2.circle(img_bgr, (cx, cy), 5, outer_color, -1, cv2.LINE_AA)
        cv2.circle(img_bgr, (cx, cy), 2, (255, 255, 255), -1, cv2.LINE_AA)

    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def image_to_base64(img_input):
    """Encodes a PIL Image or RGB numpy array into a base64 JPEG data URL."""
    try:
        if isinstance(img_input, np.ndarray):
            arr = np.asarray(img_input, dtype=np.uint8)
            img_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
            success, buffer = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
            if success:
                return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")
        elif isinstance(img_input, Image.Image):
            import io
            buf = io.BytesIO()
            img_input.save(buf, format="JPEG", quality=88)
            return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as e:
        print(f"[StunTrack] base64 encode error: {e}")
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Thread-Safe MediaPipe Landmarker Singleton (Fast <30ms Inference)
# ─────────────────────────────────────────────────────────────────────────────
_landmarker_lock = threading.Lock()
_landmarker_instance = None


def get_pose_landmarker():
    global _landmarker_instance
    if _landmarker_instance is not None:
        return _landmarker_instance
    with _landmarker_lock:
        if _landmarker_instance is not None:
            return _landmarker_instance
        try:
            from mediapipe.tasks import python as mpt
            from mediapipe.tasks.python import vision as mpv
            model_path = TASK_PATH
            if not os.path.isfile(model_path):
                import urllib.request
                urllib.request.urlretrieve(
                    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
                    "pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
                    model_path,
                )
            opts = mpv.PoseLandmarkerOptions(
                base_options=mpt.BaseOptions(model_asset_path=model_path),
                output_segmentation_masks=False, num_poses=1,
                min_pose_detection_confidence=0.25,
                min_pose_presence_confidence=0.25,
                min_tracking_confidence=0.25,
            )
            _landmarker_instance = mpv.PoseLandmarker.create_from_options(opts)
            return _landmarker_instance
        except Exception as ex_init:
            print(f"[StunTrack] Error initializing pose landmarker: {ex_init}")
            return None


# ─────────────────────────────────────────────────────────────────────────────
# Feature Extraction from Image
# ─────────────────────────────────────────────────────────────────────────────

def extract_mp_features_from_image(img_path, height_alpha=0.0, height_beta=1.0):
    """
    Extracts MediaPipe features from a single image.
    Returns (features_array, detected_bool, lm_list_or_none, preprocessed_image_rgb).
    """
    if not (PIL_OK and CV2_OK and MP_OK):
        return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False, None, None

    try:
        prep_img = preprocess_image(img_path)
        arr = np.array(prep_img, dtype=np.uint8)
        lm_list = None

        # 1. Try Legacy API first
        try:
            pose_module = mp.solutions.pose
            with pose_module.Pose(
                static_image_mode=True, model_complexity=2,
                enable_segmentation=False, min_detection_confidence=0.25,
            ) as pose:
                result = pose.process(arr)
                if result.pose_landmarks:
                    lm_list = list(result.pose_landmarks.landmark)
        except (AttributeError, Exception):
            lm_list = None

        # 2. Try Tasks API with singleton landmarker (cached, thread-safe, fast)
        if lm_list is None:
            landmarker = get_pose_landmarker()
            if landmarker is not None:
                try:
                    with _landmarker_lock:
                        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=arr)
                        result = landmarker.detect(mp_img)
                        if result.pose_landmarks and len(result.pose_landmarks) > 0:
                            lm_list = list(result.pose_landmarks[0])
                except Exception as ex_task:
                    print(f"[StunTrack] Tasks API detection error: {ex_task}")

        if lm_list is not None and len(lm_list) >= 33:
            feats = compute_mediapipe_features(lm_list, height_alpha, height_beta)
            return feats, True, lm_list, arr
        else:
            return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False, None, arr

    except Exception as e:
        print(f"[StunTrack] MP extraction error: {e}")
        return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False, None, None


# ─────────────────────────────────────────────────────────────────────────────
# Inference Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_inference(tabular_dict, img_path=None):
    """
    tabular_dict: { usia_bulan, jk, bb_kg, lk_cm, ll_cm }
    img_path: absolute path to uploaded image (optional)
    Returns dict with prediction info, validation results, and images.
    """
    art = load_model()
    if art is None:
        return {
            "error": "Model AI belum tersedia. Pastikan artefak stuntrack_v13_b3_lr_model.joblib tersedia.",
            "model_ready": False,
        }

    cfg            = art.get("config", {})
    knn_tab        = art["knn_imputer_tabular"]
    sc_tab         = art["scaler_tabular"]
    vt_tab         = art["variance_threshold_tabular"]
    knn_mp         = art["knn_imputer_mp"]
    sc_mp          = art["scaler_mp"]
    vt_mp          = art["variance_threshold_mp"]
    base_tab       = art["base_models_tabular"]
    base_mp_models = art["base_models_mp"]
    sc_meta        = art["scaler_meta"]
    meta_lr        = art["meta_learner_lr"]
    h_cal          = art.get("height_calibration", {"alpha": 0.0, "beta": 1.0})
    h_alpha        = float(h_cal.get("alpha", 0.0))
    h_beta         = float(h_cal.get("beta",  1.0))

    # ── 1. Tabular Feature Preprocessing ──
    tab_vals = []
    for feat in TABULAR_FEATURES:
        aliases = FIELD_ALIASES.get(feat, [feat])
        v = None
        for a in aliases:
            if a in tabular_dict and tabular_dict[a] is not None:
                v = tabular_dict[a]
                break
        if v is not None and str(v).strip() != "":
            if feat == "jk":
                s_jk = str(v).strip().upper()
                if s_jk in ["0", "P", "PEREMPUAN", "FEMALE", "GIRL"]:
                    val = 0.0
                elif s_jk in ["1", "L", "LAKI-LAKI", "LAKI", "MALE", "BOY"]:
                    val = 1.0
                else:
                    try:
                        val = float(v)
                    except ValueError:
                        val = np.nan
            else:
                try:
                    clean_str = str(v).strip().replace(",", ".")
                    val = float(clean_str)
                except ValueError:
                    val = np.nan
        else:
            val = np.nan
        tab_vals.append(val)

    X_tab_raw = np.array(tab_vals, dtype=np.float64).reshape(1, -1)
    X_tab_imp = knn_tab.transform(X_tab_raw)
    X_tab_sc  = sc_tab.transform(X_tab_imp)
    X_tab_vt  = vt_tab.transform(X_tab_sc)

    # ── 2. MediaPipe Feature Extraction & Validation ──
    mp_detected = False
    original_b64 = None
    annotated_b64 = None
    landmark_count = 0

    if img_path is not None and os.path.isfile(img_path):
        mp_feats, detected, lm_list, raw_arr = extract_mp_features_from_image(img_path, h_alpha, h_beta)

        # STRICT VALIDATION: If an image is uploaded, it MUST be a valid human baby photo (Point 3)
        is_valid_baby, validation_msg = validate_human_baby_pose(lm_list)
        if not is_valid_baby:
            return {
                "error": f"Gambar tidak valid: {validation_msg}",
                "invalid_image": True,
                "model_ready": True,
            }

        mp_detected = True
        landmark_count = len(lm_list)

        # Generate visualizations (Point 2)
        if raw_arr is not None:
            original_b64 = image_to_base64(raw_arr)
            annotated_arr = draw_pose_landmarks(raw_arr, lm_list)
            annotated_b64 = image_to_base64(annotated_arr)

    else:
        mp_feats = np.full(MP_FEAT_DIM, np.nan, dtype=np.float64)

    # ── 3. MediaPipe Feature Transformation (matches build model.py) ──
    # Step 1: knn_mp transform on 69 raw features
    mp_raw_1 = mp_feats.reshape(1, -1)
    mp_imp   = knn_mp.transform(mp_raw_1)

    # Step 2: append detection_flag (shape 1, 70)
    mp_full  = np.hstack([mp_imp, np.array([[float(mp_detected)]])])

    # Step 3: scaler_mp and vt_mp transform
    mp_sc    = sc_mp.transform(mp_full)
    mp_vt    = vt_mp.transform(mp_sc)

    # ── 4. Meta-Features & Final Prediction (B3 Late Fusion) ──
    # Deterministic base model iteration order
    proba_tab = np.hstack([base_tab[m].predict_proba(X_tab_vt) for m in BASE_MODEL_KEYS if m in base_tab])
    proba_mp  = np.hstack([base_mp_models[m].predict_proba(mp_vt) for m in BASE_MODEL_KEYS if m in base_mp_models])

    X_meta    = sc_meta.transform(np.hstack([proba_tab, proba_mp]))
    pred_idx  = int(meta_lr.predict(X_meta)[0])
    proba_all = meta_lr.predict_proba(X_meta)[0]
    label     = IDX_TO_CLASS.get(pred_idx, str(pred_idx))
    conf_pct  = float(proba_all[pred_idx]) * 100.0

    return {
        "prediction":           label,
        "is_stunting":          (pred_idx == 0),
        "confidence":           round(conf_pct, 2),
        "proba_stunting":       round(float(proba_all[0]) * 100, 2),
        "proba_tidak_stunting": round(float(proba_all[1]) * 100, 2),
        "mp_detected":          mp_detected,
        "landmark_count":       landmark_count,
        "landmarks_detected":   mp_detected,
        "original_image":       original_b64,
        "annotated_image":      annotated_b64,
        "model_ready":          True,
        "model_info": {
            "name":         "StunTrack v13 B3 Late Fusion",
            "scenario":     "Tabular + MediaPipe Pose + BorderlineSMOTE + Logistic Regression",
            "auc":          0.8862,
            "trained_data": "100% Data (DS1 StunTrack + DS2 Neonatal: 346 Samples)",
            "calibrated":   h_cal.get("fitted", True),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/status")
@app.route("/api/status")
def api_status():
    art = load_model()
    return jsonify({
        "model_ready": art is not None,
        "mediapipe_ok": MP_OK,
        "opencv_ok": CV2_OK,
        "pil_ok": PIL_OK,
        "model_path": MODEL_PATH,
        "model_name": "StunTrack v13 B3 Late Fusion (100% Data)",
        "features": {
            "tabular": TABULAR_FEATURES,
            "image": "512x512 CLAHE + MediaPipe 33 Landmarks (69 features)",
        },
    })


@app.route("/api/validate-image", methods=["POST", "OPTIONS"])
def api_validate_image():
    """
    Fast pre-upload biometric validation endpoint.
    Strictly verifies whether an image is a genuine infant/toddler photo before
    permitting upload. Rejects non-human, animal, object, or adult human photos.
    """
    if request.method == "OPTIONS":
        return make_response(jsonify({"status": "ok"}), 200)

    img_path = None
    if "image" in request.files:
        f = request.files["image"]
        if not (f and f.filename and f.filename.strip()):
            return jsonify({"valid": False, "error": "File gambar kosong.", "invalid_image": True}), 400

        if not allowed_file(f.filename):
            return jsonify({
                "valid": False,
                "error": "Format file tidak didukung. Harap unggah gambar berekstensi JPG, PNG, WebP, HEIC, atau BMP.",
                "invalid_image": True,
            }), 400

        ext = f.filename.rsplit(".", 1)[1].lower() if "." in f.filename else "jpg"
        clean_name = secure_filename(f.filename)
        fname = clean_name if (clean_name and "." in clean_name) else f"upload_{uuid.uuid4().hex[:10]}.{ext}"
        img_path = os.path.join(app.config["UPLOAD_FOLDER"], f"val_{fname}")
        f.save(img_path)
    else:
        json_data = request.get_json(silent=True) or {}
        raw_b64 = json_data.get("image") or json_data.get("image_b64")
        if isinstance(raw_b64, str) and len(raw_b64) > 100:
            import uuid
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                img_bytes = base64.b64decode(raw_b64)
                fname = f"val_b64_{uuid.uuid4().hex[:10]}.jpg"
                img_path = os.path.join(app.config["UPLOAD_FOLDER"], fname)
                with open(img_path, "wb") as bf:
                    bf.write(img_bytes)
            except Exception as ex_b64:
                return jsonify({"valid": False, "error": f"Gagal membaca format gambar: {ex_b64}", "invalid_image": True}), 400
        else:
            return jsonify({"valid": False, "error": "Tidak ada file gambar yang dikirim.", "invalid_image": True}), 400

    try:
        art = load_model()
        h_cal = art.get("height_calibration", {"alpha": 0.0, "beta": 1.0}) if art else {}
        h_alpha = float(h_cal.get("alpha", 0.0))
        h_beta = float(h_cal.get("beta", 1.0))

        mp_feats, detected, lm_list, raw_arr = extract_mp_features_from_image(img_path, h_alpha, h_beta)
        is_valid, msg = validate_human_baby_pose(lm_list)
        if not is_valid:
            return jsonify({"valid": False, "error": msg, "invalid_image": True}), 400

        annotated_b64 = None
        if raw_arr is not None:
            annotated_arr = draw_pose_landmarks(raw_arr, lm_list)
            annotated_b64 = image_to_base64(annotated_arr)

        return jsonify({
            "valid": True,
            "message": "Foto bayi valid dan memenuhi syarat.",
            "landmark_count": len(lm_list) if lm_list else 0,
            "annotated_image": annotated_b64,
        }), 200
    except Exception as e:
        return jsonify({"valid": False, "error": f"Gagal memvalidasi foto: {str(e)}", "invalid_image": True}), 500
    finally:
        if img_path and os.path.isfile(img_path):
            try:
                os.remove(img_path)
            except Exception:
                pass


@app.route("/predict", methods=["POST", "OPTIONS"])
@app.route("/api/predict", methods=["POST", "OPTIONS"])
def api_predict():
    if request.method == "OPTIONS":
        return make_response(jsonify({"status": "ok"}), 200)

    json_data = request.get_json(silent=True) or {}

    # ── Tabular fields (form-data or json with alias resolution) ──
    tabular = {}
    for feat, aliases in FIELD_ALIASES.items():
        val = None
        for a in aliases:
            if a in request.form and request.form.get(a) is not None:
                val = request.form.get(a)
                break
            if a in json_data and json_data.get(a) is not None:
                val = json_data[a]
                break
        tabular[feat] = val

    # ── Image (file upload or base64 json) ──
    img_path = None
    if "image" in request.files:
        f = request.files["image"]
        if f and f.filename and f.filename.strip():
            if not allowed_file(f.filename):
                return jsonify({
                    "error": "Format file tidak didukung. Harap unggah gambar berekstensi JPG, PNG, WebP, HEIC, atau BMP.",
                    "invalid_image": True,
                }), 400

            ext = f.filename.rsplit(".", 1)[1].lower() if "." in f.filename else "jpg"
            clean_name = secure_filename(f.filename)
            fname = clean_name if (clean_name and "." in clean_name) else f"upload_{uuid.uuid4().hex[:10]}.{ext}"
            img_path = os.path.join(app.config["UPLOAD_FOLDER"], fname)
            f.save(img_path)
    elif "image" in json_data or "image_b64" in json_data:
        raw_b64 = json_data.get("image") or json_data.get("image_b64")
        if isinstance(raw_b64, str) and len(raw_b64) > 100:
            import uuid
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                img_bytes = base64.b64decode(raw_b64)
                fname = f"b64_{uuid.uuid4().hex[:10]}.jpg"
                img_path = os.path.join(app.config["UPLOAD_FOLDER"], fname)
                with open(img_path, "wb") as bf:
                    bf.write(img_bytes)
            except Exception as ex_b64:
                print(f"[StunTrack] base64 decode error: {ex_b64}")

    try:
        result = run_inference(tabular, img_path)
        status_code = 400 if ("error" in result and result.get("invalid_image")) else 200
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan pemrosesan: {str(e)}"}), 500
    finally:
        # Clean up temporary uploaded file
        if img_path and os.path.isfile(img_path):
            try:
                os.remove(img_path)
            except Exception:
                pass


if __name__ == "__main__":
    print("=" * 65)
    print("  StunTrack — Production AI Inference Server (100% Trained Model)")
    print("=" * 65)
    print(f"  Model Path : {MODEL_PATH}")
    print(f"  Model Ready: {model_is_ready()}")
    print(f"  MediaPipe  : {MP_OK}")
    print(f"  OpenCV     : {CV2_OK}")
    print("=" * 65)
    app.run(debug=True, host="0.0.0.0", port=5000, use_reloader=True)
