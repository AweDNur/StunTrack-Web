import React, { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";

export default function TrainingDataPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gender, setGender] = useState<string>("L"); // State baru untuk gender
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [headCircCm, setHeadCircCm] = useState<string>("");
  const [armCircCm, setArmCircCm] = useState<string>("");
  const [manualLabel, setManualLabel] = useState<string>("Stunting");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return setMessage({ type: "error", text: "Silakan pilih foto bayi terlebih dahulu." });
    
    setLoading(true);
    setMessage(null);

    const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("gender", gender); // Append gender ke form data
    formData.append("height_cm", heightCm);
    formData.append("weight_kg", weightKg);
    formData.append("head_circ_cm", headCircCm);
    formData.append("arm_circ_cm", armCircCm);
    formData.append("manual_label", manualLabel);
    formData.append("notes", notes);

    try {
      const res = await fetch("http://localhost:3000/api/volunteer/training", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Gagal mengunggah data");

      setMessage({ type: "success", text: "Data training berhasil dikirim untuk pelatihan AI!" });
      setPhoto(null);
      setPreview(null);
      setHeightCm("");
      setWeightKg("");
      setHeadCircCm("");
      setArmCircCm("");
      setNotes("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Terjadi kesalahan server" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-black text-[#303b45]">Upload Training Data AI</h2>
        <p className="mt-1 text-sm text-[#71838d]">
          Kontribusi Anda membantu meningkatkan akurasi pendeteksian stunting pada model AI StunTrack.
        </p>

        {message && (
          <div className={`mt-4 flex items-center gap-3 rounded-xl p-4 text-sm font-semibold ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
            {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* FOTO */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#303b45]">Foto Bayi / Balita *</label>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d1dbe5] p-6 transition hover:border-[#1c5fbd]">
              {preview ? (
                <div className="relative w-full max-w-xs text-center">
                  <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-lg object-cover" />
                  <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="mt-3 text-xs font-bold text-red-500 hover:underline">
                    Hapus & ganti foto
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center">
                  <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-[#eaf2ff] text-[#1c5fbd]">
                    <ImageIcon size={24} />
                  </div>
                  <span className="text-sm font-bold text-[#1c5fbd]">Klik untuk upload foto</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* GENDER */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#303b45]">Jenis Kelamin *</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            {/* LABEL */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#303b45]">Label Diagnosis *</label>
              <select value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none">
                <option value="Stunting">Stunting</option>
                <option value="Kurang Nutrisi">Kurang Nutrisi</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>

          {/* PENGUKURAN FISIK */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-[#303b45]">Pengukuran Fisik</h3>
              <p className="mt-1 text-xs text-[#71838d]">Opsional. Masukkan angka dalam satuan cm dan kg.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="training-height" className="mb-2 block text-sm font-semibold text-[#50616b]">Tinggi badan (cm)</label>
                <input id="training-height" type="number" min="0" step="0.01" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="Contoh: 85.50" className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none" />
              </div>
              <div>
                <label htmlFor="training-weight" className="mb-2 block text-sm font-semibold text-[#50616b]">Berat badan (kg)</label>
                <input id="training-weight" type="number" min="0" step="0.01" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Contoh: 12.30" className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none" />
              </div>
              <div>
                <label htmlFor="training-head-circ" className="mb-2 block text-sm font-semibold text-[#50616b]">Lingkar kepala (cm)</label>
                <input id="training-head-circ" type="number" min="0" step="0.01" value={headCircCm} onChange={(e) => setHeadCircCm(e.target.value)} placeholder="Contoh: 48.00" className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none" />
              </div>
              <div>
                <label htmlFor="training-arm-circ" className="mb-2 block text-sm font-semibold text-[#50616b]">Lingkar lengan / LiLA (cm)</label>
                <input id="training-arm-circ" type="number" min="0" step="0.01" value={armCircCm} onChange={(e) => setArmCircCm(e.target.value)} placeholder="Contoh: 14.50" className="w-full rounded-xl border border-[#d1dbe5] bg-white px-4 py-3 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none" />
              </div>
            </div>
          </div>
          {/* CATATAN */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#303b45]">Catatan Tambahan (Opsional)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Balita di Desa X, umur 12 bulan..." className="w-full rounded-xl border border-[#d1dbe5] bg-white p-4 text-sm font-semibold text-[#303b45] focus:border-[#1c5fbd] focus:outline-none" />
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c5fbd] py-3.5 text-sm font-bold text-white transition hover:bg-[#154b96] disabled:opacity-50">
            <Upload size={18} />
            {loading ? "Mengunggah..." : "Submit Training Data"}
          </button>
        </form>
      </div>
    </div>
  );
}