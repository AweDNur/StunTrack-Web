# StunTrack v13 — AI Service & Inference Platform

Layanan inferensi AI untuk deteksi risiko stunting anak menggunakan model **B3 Late Fusion Stacking** (Tabular + MediaPipe Pose + BorderlineSMOTE → Logistic Regression Meta-Learner), dilatih pada **100% dataset** (346 sampel) berdasarkan hasil analisis penelitian pada `Penelitian_Pak_Yoh.ipynb`.

---

## Fitur Utama

1. **Model AI Terbaik (100% Data Training)**:
   - Skenario pemenang: **B3 Late Fusion Stacking** (AUC = 0.8862, Acc = 83.65%, BalAcc = 84.34%, Spec = 91.49%).
   - Dilatih pada 100% data DS1 (StunTrack) + DS2 (Neonatal), total 346 sampel fisik anak.
   - Menggabungkan probabilitas out-of-fold dari 6 base tabular models dan 6 base mediapipe pose models ke dalam 24d meta-features yang diimbangi dengan BorderlineSMOTE, lalu diprediksi oleh Logistic Regression meta-learner terkalibrasi.
2. **Visualisasi Citra Asli & MediaPipe Keypoints (33 Landmark Sendi)**:
   - Mengembalikan citra asli dan citra hasil anotasi 33 titik sendi MediaPipe secara berdampingan (side-by-side).
   - Menampilkan koneksi rangka biometrik bercahaya (cyan/emerald) dan titik sendi anatomis berwarna.
3. **Validasi Ketat Gambar Non-Manusia & Non-Bayi**:
   - Menolak secara otomatis gambar yang bukan manusia (hewan, kendaraan, pemandangan, dokumen/kartun, pola acak).
   - Memvalidasi kelengkapan sendi tubuh (bahu, pinggul, tungkai kaki) dan proporsi pediatrik (bayi/balita).
   - Menampilkan alert peringatan penolakan gambar dan mencegah prediksi salah jika gambar tidak valid.
4. **Verifikasi 2 Langkah & Panduan Interaktif Sebelum Unggah Citra**:
   - Muncul sebelum browser membuka folder file picker.
   - Menampilkan animasi interaktif simulasi pelacakan sendi tubuh bayi dengan pemindai laser (laser scanner).
   - Menampilkan panduan kriteria gambar valid vs gambar ditolak.
   - Tombol buka folder file picker hanya aktif setelah pengguna mengonfirmasi pemahaman panduan.

---

## Struktur File

```
ai-service/
├── app.py                            ← Flask backend & API inferensi
├── requirements.txt                  ← Dependensi Python (pinned scikit-learn==1.6.1)
├── pose_landmarker.task              ← Model MediaPipe Pose Landmarker (Heavy)
├── stuntrack_v13_b3_lr_model.joblib  ← Model AI final B3 Late Fusion (100% data)
├── stuntrack_v13_model_artifacts.json← Metadata artefak model
├── README.md
├── templates/
│   └── index.html                    ← Web UI dengan modal verifikasi 2 langkah
└── static/
    ├── css/
    │   └── style.css                 ← Styling modern & animasi laser scanner
    └── js/
        └── main.js                   ← Logika interaktif verifikasi & visualisasi
```

---

## Cara Menjalankan

### 1. Buat Virtual Environment & Pasang Dependensi
```bash
cd "Website Final/ai-service"
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> **Penting**: Gunakan `scikit-learn==1.6.1` sesuai `requirements.txt` agar artefak model joblib dapat dimuat tanpa kendala modul `_loss`.

### 2. Jalankan Server
```bash
python app.py
```

Server berjalan di: **http://localhost:5000**

---

## Endpoint API

- `GET /api/status` atau `GET /status`: Status kesiapan model AI dan pustaka (MediaPipe, OpenCV, PIL).
- `POST /api/validate-image`: Pra-validasi cepat citra sebelum unggah; menolak citra bukan bayi, bukan manusia, atau manusia dewasa (HTTP 400). Mengembalikan jumlah landmark dan citra beranotasi keypoints jika valid (HTTP 200).
- `POST /api/predict` atau `POST /predict`: Melakukan inferensi stunting multimodal (menerima form-data 5 parameter klinis tabular dan opsional berkas gambar). Mendukung alias nama field (cth. `gender` / `jk`, `age_months` / `usia_bulan`). Mengembalikan prediksi, confidence, probabilitas, dan visualisasi side-by-side citra asli vs anotasi MediaPipe.
