# StunTrack v13 — Web Application

Aplikasi web inferensi untuk prediksi stunting anak menggunakan model **B3 Late Fusion** (Tabular + MediaPipe Pose → Logistic Regression Meta-Learner).

---

## Struktur File

```
website/
├── app.py                  ← Flask backend (inferensi)
├── requirements.txt        ← Dependensi Python
├── README.md
├── templates/
│   └── index.html          ← Halaman utama
├── static/
│   ├── css/
│   │   └── style.css       ← Styling premium dark UI
│   └── js/
│       └── main.js         ← JavaScript frontend
└── uploads/                ← Folder sementara upload gambar (auto-dibuat)
```

---

## Cara Menjalankan

### 1. Ekspor model terlebih dahulu
Jalankan `build model.py` di Google Colab hingga selesai. Unduh file:
- `stuntrack_v13_b3_lr_model.joblib`

Letakkan file tersebut di **satu folder di atas** folder `website/`, yaitu di:
```
2 kelas/stuntrack_v13_b3_lr_model.joblib
```

### 2. Install dependensi
```bash
cd website
pip install -r requirements.txt
```

> **Catatan**: `mediapipe` tidak tercantum di `requirements.txt` karena versinya perlu dicoba bertahap. Install manual:
> ```bash
> pip install mediapipe
> ```

### 3. Jalankan server
```bash
python app.py
```

Server berjalan di: **http://localhost:5000**

---

## Input yang Diterima

### Tabular (wajib — 5 fitur)
| Field | Nama | Satuan | Rentang |
|-------|------|--------|---------|
| `usia_bulan` | Usia anak | bulan | 0–60 |
| `jk` | Jenis kelamin | P=0, L=1 | 0 atau 1 |
| `bb_kg` | Berat badan | kg | 0.1–30 |
| `lk_cm` | Lingkar kepala | cm | 5–70 |
| `ll_cm` | Lingkar lengan atas | cm | 3–40 |

### Gambar (opsional — meningkatkan akurasi)
Format yang didukung: `PNG, JPG, JPEG, BMP, TIFF, GIF, WebP, HEIC, AVIF, JP2, JFIF, PPM, PGM`

Gambar diproses dengan:
- CLAHE color enhancement
- Resize 512×512
- MediaPipe Pose Landmarker → 69 fitur geometri tubuh

---

## Output Prediksi

```json
{
  "prediction": "Stunting",
  "is_stunting": true,
  "confidence": 87.5,
  "proba_stunting": 87.5,
  "proba_tidak_stunting": 12.5,
  "mp_detected": true,
  "model_ready": true
}
```

---

## Catatan

- Jika model belum tersedia, server tetap berjalan dan menampilkan pesan informatif di UI.
- File gambar yang diunggah dihapus otomatis setelah prediksi.
- Aplikasi ini **hanya untuk keperluan akademis/penelitian**, bukan pengganti diagnosis medis.
