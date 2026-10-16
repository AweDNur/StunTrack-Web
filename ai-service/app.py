"""
StunTrack — Flask Web Application
Pipeline: B3 Late Fusion Tab+MediaPipe + BorderlineSMOTE + Logistic Regression
"""

import os
import re
import math
import warnings
import numpy as np
from flask import Flask, request, jsonify, render_template, send_from_directory
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
# Constants (mirror build model.py)
# ─────────────────────────────────────────────────────────────────────────────
IMAGE_SIZE      = 512
MP_FEAT_DIM     = 69
CALIB_H2H       = 0.82
CALIB_SEG       = 0.80
CALIB_REF_CM    = 75.0
CLASS_NAMES     = ["Stunting", "Tidak Stunting"]
IDX_TO_CLASS    = {0: "Stunting", 1: "Tidak Stunting"}
TABULAR_FEATURES = ["usia_bulan", "jk", "bb_kg", "lk_cm", "ll_cm"]

ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "bmp", "tiff", "tif",
    "gif", "webp", "avif", "heic", "heif",
    "jp2", "jfif", "ppm", "pgm", "pbm",
}

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "stuntrack_v13_b3_lr_model.joblib"
)

# ─────────────────────────────────────────────────────────────────────────────
# Flask app
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024   # 32 MB upload limit
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Model loading
# ─────────────────────────────────────────────────────────────────────────────
_artifacts = None

def load_model():
    global _artifacts
    if _artifacts is not None:
        return _artifacts
    if not JOBLIB_OK:
        return None
    path = MODEL_PATH
    if not os.path.isfile(path):
        return None
    try:
        _artifacts = joblib.load(path)
        print(f"[StunTrack] Model loaded from {path}")
        return _artifacts
    except Exception as e:
        print(f"[StunTrack] ERROR loading model: {e}")
        return None


def model_is_ready():
    return load_model() is not None


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
    return float(math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2))


def _mid(a, b):
    return Landmark((a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2)


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


def extract_mp_features_from_image(img_path, height_alpha=0.0, height_beta=1.0):
    """Extract MediaPipe features from a single image. Returns (features, detected)."""
    if not (PIL_OK and CV2_OK and MP_OK):
        return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False

    try:
        img = preprocess_image(img_path)
        arr = np.array(img)

        # Try legacy API first
        try:
            pose_module = mp.solutions.pose
            with pose_module.Pose(
                static_image_mode=True, model_complexity=2,
                enable_segmentation=False, min_detection_confidence=0.25,
            ) as pose:
                result = pose.process(arr)
                lm_list = list(result.pose_landmarks.landmark) if result.pose_landmarks else None
        except AttributeError:
            # Tasks API
            from mediapipe.tasks import python as mpt
            from mediapipe.tasks.python import vision as mpv
            model_path = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")
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
            with mpv.PoseLandmarker.create_from_options(opts) as landmarker:
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=arr.astype(np.uint8))
                result = landmarker.detect(mp_img)
                lm_list = list(result.pose_landmarks[0]) if (result.pose_landmarks and len(result.pose_landmarks) > 0) else None

        if lm_list is not None:
            feats = compute_mediapipe_features(lm_list, height_alpha, height_beta)
            return feats, True
        else:
            return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False

    except Exception as e:
        print(f"[StunTrack] MP extraction error: {e}")
        return np.full(MP_FEAT_DIM, np.nan, dtype=np.float64), False


# ─────────────────────────────────────────────────────────────────────────────
# Inference pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_inference(tabular_dict, img_path=None):
    """
    tabular_dict: { usia_bulan, jk, bb_kg, lk_cm, ll_cm }
    img_path: absolute path to uploaded image (optional)
    Returns dict with prediction info.
    """
    art = load_model()
    if art is None:
        return {"error": "Model belum tersedia. Jalankan build model.py terlebih dahulu untuk mengekspor model."}

    cfg            = art["config"]
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

    # --- Tabular ---
    tab_vals = []
    for feat in TABULAR_FEATURES:
        v = tabular_dict.get(feat, None)
        tab_vals.append(float(v) if v not in (None, "", "nan") else np.nan)

    X_tab_raw = np.array(tab_vals, dtype=np.float64).reshape(1, -1)
    X_tab_imp = knn_tab.transform(X_tab_raw)
    X_tab_sc  = sc_tab.transform(X_tab_imp)
    X_tab_vt  = vt_tab.transform(X_tab_sc)

    # --- MediaPipe ---
    mp_detected = False
    if img_path is not None:
        mp_feats, mp_detected = extract_mp_features_from_image(img_path, h_alpha, h_beta)
    else:
        mp_feats = np.full(MP_FEAT_DIM, np.nan, dtype=np.float64)

    # Step 1: knn_mp di-fit pada 69 fitur RAW (tanpa detection flag) — sama seperti training
    mp_raw_1 = mp_feats.reshape(1, -1)            # shape (1, 69)
    mp_imp   = knn_mp.transform(mp_raw_1)          # shape (1, 69)

    # Step 2: Tambah detection flag setelah imputasi — sama seperti training
    mp_full  = np.hstack([mp_imp,                  # (1, 69)
                          np.array([[float(mp_detected)]])])  # → (1, 70)

    # Step 3: scaler_mp dan vt_mp di-fit pada 70 fitur (setelah flag ditambahkan)
    mp_sc    = sc_mp.transform(mp_full)            # (1, 70)
    mp_vt    = vt_mp.transform(mp_sc)             # (1, n_after_vt)

    # --- Meta-features ---
    proba_tab = np.hstack([m.predict_proba(X_tab_vt) for m in base_tab.values()])
    proba_mp  = np.hstack([m.predict_proba(mp_vt)    for m in base_mp_models.values()])
    X_meta    = sc_meta.transform(np.hstack([proba_tab, proba_mp]))

    pred_idx  = int(meta_lr.predict(X_meta)[0])
    proba_all = meta_lr.predict_proba(X_meta)[0]
    label     = IDX_TO_CLASS.get(pred_idx, str(pred_idx))
    conf_pct  = float(proba_all[pred_idx]) * 100.0

    return {
        "prediction":   label,
        "is_stunting":  (pred_idx == 0),
        "confidence":   round(conf_pct, 2),
        "proba_stunting":     round(float(proba_all[0]) * 100, 2),
        "proba_tidak_stunting": round(float(proba_all[1]) * 100, 2),
        "mp_detected":  mp_detected,
        "model_ready":  True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify({
        "model_ready": model_is_ready(),
        "mediapipe_ok": MP_OK,
        "opencv_ok": CV2_OK,
        "pil_ok": PIL_OK,
        "model_path": MODEL_PATH,
    })


@app.route("/api/predict", methods=["POST"])
def api_predict():
    # ── Tabular fields ──
    tabular = {}
    for feat in TABULAR_FEATURES:
        tabular[feat] = request.form.get(feat, None)

    # ── Image (optional) ──
    img_path = None
    if "image" in request.files:
        f = request.files["image"]
        if f and f.filename and allowed_file(f.filename):
            fname = secure_filename(f.filename)
            img_path = os.path.join(app.config["UPLOAD_FOLDER"], fname)
            f.save(img_path)

    try:
        result = run_inference(tabular, img_path)
    except Exception as e:
        result = {"error": str(e)}
    finally:
        # Clean up uploaded file
        if img_path and os.path.isfile(img_path):
            try:
                os.remove(img_path)
            except Exception:
                pass

    return jsonify(result)


if __name__ == "__main__":
    print("=" * 60)
    print("  StunTrack — Web Inference Server")
    print("=" * 60)
    print(f"  Model path : {MODEL_PATH}")
    print(f"  Model ready: {model_is_ready()}")
    print(f"  MediaPipe  : {MP_OK}")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
