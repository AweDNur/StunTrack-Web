import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Activity, AlertCircle, AlertTriangle, Baby, Check, CheckCircle2, ImagePlus, Info, RotateCcw, Save, Sparkles, Upload, X } from "lucide-react";
import { aiApiUrl, apiUrl } from "../../lib/api";

type Session = { token?: string; role?: "orang_tua" | "volunteer" | "admin"; name?: string };
type BabyProfile = { id: number; name: string; gender: string; birth_date: string };
type Prediction = {
  prediction: string;
  is_stunting: boolean;
  confidence?: number;
  mp_detected?: boolean;
  proba_stunting?: number;
  proba_tidak_stunting?: number;
  landmark_count?: number;
  landmarks_detected?: boolean;
  original_image?: string | null;
  annotated_image?: string | null;
};

const inputClass = "h-12 w-full rounded-lg border border-[#cbd8df] bg-white px-4 font-medium text-[#24313a] outline-none transition placeholder:text-[#9aa8af] focus:border-[#1c5fbd] focus:ring-4 focus:ring-[#1c5fbd]/10";

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function measurementLimitError(form: FormData) {
  const limits = [
    ["usia_bulan", "Usia", 60, "bulan"],
    ["bb_kg", "Berat badan", 35, "kg"],
    ["lk_cm", "Lingkar kepala", 60, "cm"],
    ["ll_cm", "Lingkar lengan atas (LiLA)", 30, "cm"],
  ] as const;
  const invalidLimit = limits.find(([field, , maximum]) => Number(form.get(field)) > maximum);
  return invalidLimit ? `${invalidLimit[1]} maksimal ${invalidLimit[2]} ${invalidLimit[3]}.` : "";
}

function PhotoGuideModal({ onClose, onProceed, allowProceed }: { onClose: () => void; onProceed: () => void; allowProceed: boolean }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#13243a]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Panduan foto bayi" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="photo-modal-pop relative w-full max-w-[860px] rounded-[22px] bg-white p-6 shadow-[0_24px_70px_rgba(15,35,60,0.35)] sm:p-7">
        <button type="button" onClick={onClose} className="absolute -right-1 -top-1 z-10 grid h-10 w-10 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#405155] shadow-lg transition hover:text-[#1c5fbd]" aria-label="Tutup panduan"><X size={21} /></button>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#b9ceff] bg-[#f1f5ff] px-3 py-1.5 text-xs font-bold text-[#4b6cf7]"><span>Langkah 1 dari 2</span><span className="text-[#9bb1e8]">|</span><span>Verifikasi Standar Citra Bayi</span></div>
        <h2 className="text-2xl font-black text-[#172554] sm:text-[25px]">Panduan Standar Citra Bayi</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-[242px_minmax(0,1fr)]">
          <div className="photo-guide-preview-box flex min-h-[340px] items-center justify-center overflow-hidden rounded-[18px] border border-[#cbdcff] bg-gradient-to-b from-[#f4f8ff] via-[#eef6ff] to-[#e6faf1] p-4 shadow-[0_12px_28px_rgba(75,108,247,0.08)]">
            <div className="photo-guide-aura" /><div className="photo-guide-laser-scanner"><div className="photo-guide-beam-glow" /></div>
            <svg className="photo-guide-baby-svg h-[310px] w-full" viewBox="0 0 200 320" role="img" aria-label="Ilustrasi posisi tubuh bayi">
              <defs><linearGradient id="guideBodyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0071E3" stopOpacity=".08" /><stop offset="100%" stopColor="#34C759" stopOpacity=".12" /></linearGradient><linearGradient id="guideLine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0071E3" /><stop offset="100%" stopColor="#34C759" /></linearGradient></defs>
              <ellipse cx="100" cy="55" rx="26" ry="32" fill="url(#guideBodyFill)" stroke="#4b8cff" strokeWidth="1.8" strokeDasharray="4,4" />
              <path d="M66 94 C66 86 78 84 100 84 C122 84 134 86 134 94 L128 176 C128 184 120 188 100 188 C80 188 72 184 72 176Z" fill="url(#guideBodyFill)" stroke="#4b8cff" strokeWidth="1.8" strokeDasharray="4,4" />
              <g stroke="url(#guideLine)" strokeWidth="3" strokeLinecap="round"><line x1="72" y1="98" x2="128" y2="98" /><line x1="72" y1="98" x2="78" y2="175" /><line x1="128" y1="98" x2="122" y2="175" /><line x1="78" y1="175" x2="122" y2="175" /><line x1="72" y1="98" x2="52" y2="135" /><line x1="52" y1="135" x2="42" y2="170" /><line x1="128" y1="98" x2="148" y2="135" /><line x1="148" y1="135" x2="158" y2="170" /><line x1="78" y1="175" x2="74" y2="235" /><line x1="74" y1="235" x2="70" y2="285" /><line x1="122" y1="175" x2="126" y2="235" /><line x1="126" y1="235" x2="130" y2="285" /></g>
              <g className="photo-guide-dot-pulse photo-guide-dot-joint"><circle cx="72" cy="98" r="5" /><circle cx="128" cy="98" r="5" /><circle cx="78" cy="175" r="5" /><circle cx="122" cy="175" r="5" /><circle cx="74" cy="235" r="4" /><circle cx="126" cy="235" r="4" /></g><g className="photo-guide-dot-pulse photo-guide-dot-limb"><circle cx="52" cy="135" r="4" /><circle cx="148" cy="135" r="4" /><circle cx="42" cy="170" r="4" /><circle cx="158" cy="170" r="4" /></g><g className="photo-guide-dot-pulse photo-guide-dot-head"><circle cx="100" cy="55" r="5" /><circle cx="86" cy="48" r="3.5" /><circle cx="114" cy="48" r="3.5" /></g><g className="photo-guide-dot-pulse photo-guide-dot-foot"><circle cx="70" cy="285" r="4" /><circle cx="130" cy="285" r="4" /></g>
            </svg>
          </div>
          <div className="grid gap-3">
            <section className="rounded-[14px] border border-[#a7e6c0] bg-[#effcf3] p-4 text-[#456080]"><h3 className="flex items-center gap-2 text-sm font-black text-[#16834a]"><Check size={18} strokeWidth={3} />Kriteria Gambar yang DITERIMA</h3><ul className="mt-3 grid gap-2 text-[13px] leading-5"><li><b className="text-[#40577d]">• Foto seluruh tubuh (Full-Body):</b> tampak utuh dari kepala hingga telapak kaki tanpa terpotong.</li><li><b className="text-[#40577d]">• Posisi tegak/lurus:</b> bayi berbaring lurus (supine) pada alas datar atau berdiri menghadap kamera.</li><li><b className="text-[#40577d]">• Pencahayaan terang &amp; jelas:</b> tidak buram, tidak backlight, dan tidak gelap.</li><li><b className="text-[#40577d]">• Pakaian minim/ringan:</b> persendian siku, pinggul, dan lutut terlihat agar pengukuran presisi.</li></ul></section>
            <section className="rounded-[14px] border border-[#ffb9c0] bg-[#fff1f2] p-4 text-[#6a5265]"><h3 className="flex items-center gap-2 text-sm font-black text-[#d51e2e]"><span className="grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-[#d51e2e] text-xs">×</span>Kriteria Gambar yang DITOLAK (Gagal Prediksi)</h3><ul className="mt-3 grid gap-2 text-[13px] leading-5"><li><b className="text-[#6b455d]">• Bukan manusia / bukan bayi</b> (hewan, kendaraan, kartun, pemandangan, benda).</li><li><b className="text-[#6b455d]">• Foto terpotong</b> (hanya wajah/pasfoto, setengah badan, atau terhalang selimut).</li><li><b className="text-[#6b455d]">• Foto sangat gelap/buram berat</b> sehingga sendi tubuh tidak dapat dikenali AI.</li></ul></section>
          </div>
        </div>
        {allowProceed ? <div className="mt-5 border-t border-[#e3eaf2] pt-4"><label className="flex cursor-pointer items-start gap-3 text-sm text-[#53626b]"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1c5fbd]" /><span><b className="text-[#303b45]">Saya telah paham &amp; membaca panduan</b> dan memastikan foto yang saya unggah memenuhi seluruh kriteria di atas.</span></label><div className="mt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-[#cbd8df] px-4 py-2.5 text-sm font-black text-[#53626b] transition hover:border-[#1c5fbd] hover:text-[#1c5fbd]">Batal</button><button type="button" disabled={!confirmed} onClick={onProceed} className="inline-flex items-center gap-2 rounded-lg bg-[#1c5fbd] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#174f9d] disabled:cursor-not-allowed disabled:opacity-40"><Upload size={16} />Saya Telah Paham, Pilih Foto</button></div></div> : <div className="mt-5 flex justify-end border-t border-[#e3eaf2] pt-4"><button type="button" onClick={onClose} className="rounded-lg bg-[#1c5fbd] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#174f9d]">Tutup Panduan</button></div>}
      </div>
    </div>
  );
}

function InvalidImageModal({ message, onClose, onRetry }: { message: string; onClose: () => void; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#13243a]/75 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Foto ditolak oleh sistem AI">
      <div className="photo-modal-pop relative w-full max-w-[470px] rounded-2xl bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,35,60,0.35)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff0f1] text-[#d51e2e]"><AlertTriangle size={34} strokeWidth={2.5} /></div>
        <h2 className="mt-5 text-xl font-black text-[#303b45]">Foto Ditolak oleh Sistem AI</h2>
        <p className="mt-3 text-sm leading-6 text-[#607178]">{message}</p>
        <div className="mt-5 rounded-xl border border-[#f1d9a2] bg-[#fff8e7] p-4 text-left text-xs leading-5 text-[#765e24]"><b>Saran:</b> gunakan foto bayi/balita seluruh tubuh dari kepala hingga kaki, posisi lurus, pencahayaan terang, dan tidak terpotong.</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onClose} className="rounded-lg border border-[#cbd8df] px-5 py-3 text-sm font-black text-[#53626b] transition hover:border-[#1c5fbd] hover:text-[#1c5fbd]">Tutup</button><button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] px-5 py-3 text-sm font-black text-white transition hover:bg-[#174f9d]"><Upload size={16} />Pilih Foto Lain Sesuai Panduan</button></div>
      </div>
    </div>
  );
}

function DetectionPage() {
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as Session | null;
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageValidationRequest = useRef(0);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState("");
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [validatedFileName, setValidatedFileName] = useState("");
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [invalidImageMessage, setInvalidImageMessage] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideUploadFlow, setIsGuideUploadFlow] = useState(false);
  const [toast, setToast] = useState({ visible: false, leaving: false, message: "" });
  const toastTimers = useRef<number[]>([]);
  const today = todayInputValue();

  function clearToastTimers() {
    toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    toastTimers.current = [];
  }

  function showSuccessToast(message: string) {
    clearToastTimers();
    setToast({ visible: true, leaving: false, message });
    toastTimers.current = [
      window.setTimeout(() => setToast((current) => ({ ...current, leaving: true })), 4200),
      window.setTimeout(() => setToast({ visible: false, leaving: false, message: "" }), 4700),
    ];
  }

  function dismissToast() {
    clearToastTimers();
    setToast((current) => ({ ...current, leaving: true }));
    toastTimers.current = [window.setTimeout(() => setToast({ visible: false, leaving: false, message: "" }), 500)];
  }

  useEffect(() => () => clearToastTimers(), []);


  useEffect(() => {
    fetch(aiApiUrl("/status"))
      .then((response) => response.json())
      .then((data: { model_ready?: boolean }) => setIsReady(Boolean(data.model_ready)))
      .catch(() => setIsReady(false));
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    fetch(apiUrl("/api/user/babies"), { headers: { Authorization: `Bearer ${session.token}` } })
      .then((response) => response.json())
      .then((data: BabyProfile[]) => setBabies(Array.isArray(data) ? data : []))
      .catch(() => setBabies([]));
  }, [session?.token]);

  function handleBabySelection(value: string) {
    setSelectedBabyId(value);
    const selected = babies.find((baby) => String(baby.id) === value);
    if (!selected) {
      setBabyName("");
      setBirthDate("");
      setGender("");
      return;
    }
    setBabyName(selected.name);
    setBirthDate(selected.birth_date.slice(0, 10));
    setGender(selected.gender === "P" || selected.gender === "0" ? "0" : "1");
  }

  async function selectImage(file?: File) {
    if (!file) return;
    const requestId = imageValidationRequest.current + 1;
    imageValidationRequest.current = requestId;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setImage(null);
    setError("");
    setInvalidImageMessage("");
    setIsValidatingImage(true);

    try {
      const validationForm = new FormData();
      validationForm.append("image", file);
      const response = await fetch(aiApiUrl("/validate-image"), { method: "POST", body: validationForm });
      const result = (await response.json().catch(() => ({}))) as { valid?: boolean; error?: string; invalid_image?: boolean; landmark_count?: number };
      if (requestId !== imageValidationRequest.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (!response.ok || !result.valid || result.invalid_image) {
        throw new Error(result.error || "Foto yang dipilih bukan foto bayi/balita yang valid.");
      }
      setImage(file);
      setValidatedFileName(file.name);
      setLandmarkCount(result.landmark_count || 33);
    } catch (validationError) {
      if (requestId !== imageValidationRequest.current) return;
      setImage(null);
      setValidatedFileName("");
      setLandmarkCount(0);
      setPreview("");
      if (imageInputRef.current) imageInputRef.current.value = "";
      URL.revokeObjectURL(objectUrl);
      if (validationError instanceof TypeError) setError("Tidak dapat memvalidasi foto. Pastikan ai-service sedang berjalan.");
      else setInvalidImageMessage(validationError instanceof Error ? validationError.message : "Foto tidak valid.");
    } finally {
      if (requestId === imageValidationRequest.current) setIsValidatingImage(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void selectImage(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    setPendingImageFile(file);
    setIsGuideUploadFlow(true);
    setIsGuideOpen(true);
  }

  function openGuideForImage() {
    if (!preview && !isValidatingImage) {
      setIsGuideUploadFlow(true);
      setIsGuideOpen(true);
    }
  }

  function proceedFromGuide() {
    setIsGuideOpen(false);
    setIsGuideUploadFlow(false);
    if (pendingImageFile) {
      const file = pendingImageFile;
      setPendingImageFile(null);
      void selectImage(file);
      return;
    }
    imageInputRef.current?.click();
  }

  function clearImage() {
    imageValidationRequest.current += 1;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImage(null);
    setValidatedFileName("");
    setLandmarkCount(0);
    setPreview("");
    setIsValidatingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPrediction(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const submittedBirthDate = String(form.get("birth_date") ?? "");
    if (submittedBirthDate > today) {
      setError("Tanggal lahir tidak boleh lebih dari hari ini.");
      setIsSubmitting(false);
      return;
    }
    const limitError = measurementLimitError(form);
    if (limitError) {
      setError(limitError);
      setIsSubmitting(false);
      return;
    }
    if (image) form.set("image", image);
    else form.delete("image");

    try {
      const response = await fetch(aiApiUrl("/predict"), { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as Prediction & { error?: string; invalid_image?: boolean };
      if (result.invalid_image) {
        setInvalidImageMessage(result.error || "Foto tidak memenuhi standar analisis bayi.");
        return;
      }
      if (!response.ok || result.error) throw new Error(result.error || "Prediksi belum berhasil.");
      setPrediction(result);
    } catch (submitError) {
      setError(submitError instanceof TypeError ? "AI service belum terhubung. Jalankan Flask ai-service di port 5000." : submitError instanceof Error ? submitError.message : "Prediksi belum berhasil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    if (!prediction || !formRef.current) return;

    const token = session?.token;
    if (!token) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    setError("");
    setIsSaving(true);
    const form = new FormData(formRef.current);
    const limitError = measurementLimitError(form);
    if (limitError) {
      setError(limitError);
      setIsSaving(false);
      return;
    }
    const selectedGender = String(form.get("jk") ?? gender);

    try {
      let babyId = Number(selectedBabyId);
      if (!babyId) {
      const babyResponse = await fetch(apiUrl("/api/user/babies"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: String(form.get("baby_name") ?? "").trim(),
            gender: selectedGender === "0" ? "P" : "L",
            birth_date: String(form.get("birth_date") ?? ""),
          }),
        });
        const babyResult = (await babyResponse.json().catch(() => ({}))) as { baby_id?: number; message?: string; error?: string };
        if (!babyResponse.ok || !babyResult.baby_id) {
          throw new Error(babyResult.message || babyResult.error || "Profil bayi gagal disimpan.");
        }
        babyId = babyResult.baby_id;
      }

      const scanForm = new FormData();
      scanForm.set("baby_id", String(babyId));
      scanForm.set("age_months", String(form.get("usia_bulan") ?? ""));
      scanForm.set("weight_kg", String(form.get("bb_kg") ?? ""));
      scanForm.set("head_circ_cm", String(form.get("lk_cm") ?? ""));
      scanForm.set("arm_circ_cm", String(form.get("ll_cm") ?? ""));
      scanForm.set("ai_result", JSON.stringify(prediction));
      if (image) scanForm.set("photo", image);

      const scanResponse = await fetch(apiUrl("/api/user/scans"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: scanForm,
      });
      const scanResult = (await scanResponse.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!scanResponse.ok) throw new Error(scanResult.message || scanResult.error || "Data scan gagal disimpan.");

      showSuccessToast(scanResult.message || "Data bayi dan hasil scan berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof TypeError ? "Tidak dapat terhubung ke backend. Pastikan backend berjalan di port 3000." : saveError instanceof Error ? saveError.message : "Data belum berhasil disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
          <section className="rounded-xl border border-[#dce6ef] bg-white p-5 shadow-[0_8px_30px_rgba(35,63,90,0.06)] sm:p-7"><div className="mb-7 flex items-center gap-3 border-b border-[#edf1f5] pb-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf2ff] text-[#1c5fbd]"><Baby size={23} /></div><div><h2 className="text-xl font-black text-[#303b45]">Data Anak</h2><p className="text-sm text-[#71838d]">Isi seluruh data klinis di bawah ini</p></div></div>
            {isReady === false && <div className="mb-5 flex gap-3 rounded-lg border border-[#f1d9a2] bg-[#fff8e7] p-4 text-sm text-[#8a671e]"><AlertCircle className="shrink-0" size={18} /><span>Model AI belum siap. Data tetap bisa diisi, tetapi prediksi belum dapat dijalankan.</span></div>}
            <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="baby_select">Pilih Bayi<select className={inputClass} id="baby_select" value={selectedBabyId} onChange={(event) => handleBabySelection(event.target.value)}><option value="">Bayi baru / tulis manual</option>{babies.map((baby) => <option value={baby.id} key={baby.id}>{baby.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="baby_name">Nama Bayi<input className={inputClass} id="baby_name" name="baby_name" type="text" placeholder="Nama lengkap bayi" value={babyName} onChange={(event) => { setBabyName(event.target.value); if (selectedBabyId) setSelectedBabyId(""); }} required /></label>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="birth_date">Tanggal Lahir<input className={inputClass} id="birth_date" name="birth_date" type="date" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); if (selectedBabyId) setSelectedBabyId(""); }} required /></label>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="usia_bulan">Usia <span className="font-normal text-[#8a9aa6]">(bulan, maks. 60)</span><input className={inputClass} id="usia_bulan" name="usia_bulan" type="number" placeholder="cth. 24" min="0" max="60" step="0.1" required /></label>
              <fieldset className="grid gap-2"><legend className="text-sm font-extrabold text-[#405155]">Jenis Kelamin</legend><div className="grid gap-3 sm:grid-cols-2"><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="jk" value="0" checked={gender === "0"} onChange={(event) => setGender(event.target.value)} required /><span className="flex h-12 items-center justify-center rounded-lg border border-[#cbd8df] font-bold text-[#65747b] transition peer-checked:border-[#1c5fbd] peer-checked:bg-[#eef5ff] peer-checked:text-[#1c5fbd]">♀ Perempuan</span></label><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="jk" value="1" checked={gender === "1"} onChange={(event) => setGender(event.target.value)} /><span className="flex h-12 items-center justify-center rounded-lg border border-[#cbd8df] font-bold text-[#65747b] transition peer-checked:border-[#1c5fbd] peer-checked:bg-[#eef5ff] peer-checked:text-[#1c5fbd]">♂ Laki-laki</span></label></div></fieldset>
              <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="bb_kg">Berat Badan <span className="font-normal text-[#8a9aa6]">(kg, maks. 35)</span><input className={inputClass} id="bb_kg" name="bb_kg" type="number" placeholder="cth. 12.5" min="0.1" max="35" step="0.01" required /></label><label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="lk_cm">Lingkar Kepala <span className="font-normal text-[#8a9aa6]">(cm, maks. 60)</span><input className={inputClass} id="lk_cm" name="lk_cm" type="number" placeholder="cth. 46" min="5" max="60" step="0.1" required /></label></div>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="ll_cm">Lingkar Lengan Atas <span className="font-normal text-[#8a9aa6]">(LILA, maks. 30 cm)</span><input className={inputClass} id="ll_cm" name="ll_cm" type="number" placeholder="cth. 14" min="3" max="30" step="0.1" required /></label>
              <div className="grid gap-2 text-sm font-extrabold text-[#405155]"><div className="flex items-center justify-between gap-3"><span>Foto Anak <span className="font-normal text-[#8a9aa6]">(opsional · meningkatkan akurasi)</span></span><button type="button" onClick={() => { setPendingImageFile(null); setIsGuideUploadFlow(false); setIsGuideOpen(true); }} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-black text-[#1c5fbd] transition hover:bg-[#eaf2ff]" aria-label="Lihat panduan foto"><Info size={14} />Lihat Panduan Foto</button></div><div className="relative flex min-h-[180px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#b8cddd] bg-[#f8fbff] p-4 text-center transition hover:border-[#1c5fbd]" onClick={openGuideForImage} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>{preview ? <><div className="flex flex-col items-center gap-2"><img className={`h-[105px] max-w-full rounded-lg object-cover ${isValidatingImage ? "opacity-40" : ""}`} src={preview} alt="Preview foto anak" />{isValidatingImage ? <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-black text-[#1c5fbd] shadow">Memeriksa foto bayi...</span> : <div className="max-w-full rounded-lg bg-white p-2 text-left shadow"><p className="max-w-[260px] truncate text-sm font-black text-[#303b45]" title={validatedFileName}>{validatedFileName}</p><span className="mt-1 inline-flex rounded-full bg-[#e9f8f3] px-2 py-1 text-xs font-black text-[#167564]">✓ Foto Bayi Terverifikasi ({landmarkCount || 33} Titik Sendi)</span></div>}</div><button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white text-[#a43b2c] shadow" type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); clearImage(); }} aria-label="Hapus foto"><X size={16} /></button></> : <span className="grid justify-items-center gap-2 text-[#71838d]"><Upload className="text-[#1c5fbd]" size={25} /><strong className="text-[#405155]">Klik atau seret foto ke sini</strong><small>PNG · JPG · HEIC · WebP · BMP · TIFF · dan lainnya</small></span>}<input ref={imageInputRef} className="absolute left-0 top-0 h-px w-px opacity-0" type="file" id="imageInput" name="image" accept="image/*" onClick={(event) => event.stopPropagation()} onChange={handleFileChange} /></div></div>
              {error && <p className="flex gap-2 rounded-lg border border-[#f1c5be] bg-[#fff1ee] px-4 py-3 text-sm font-semibold text-[#a43b2c]" role="alert"><AlertCircle size={18} />{error}</p>}
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] font-black text-white shadow-[0_3px_0_#124a98] transition hover:bg-[#174f9d] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSubmitting || isValidatingImage || isReady === false}><Sparkles size={18} />{isSubmitting ? "Menganalisis..." : isValidatingImage ? "Memeriksa foto..." : "Prediksi Sekarang"}</button>
            </form>
          </section>

          <section className="min-h-[420px] rounded-xl border border-[#dce6ef] bg-white p-5 shadow-[0_8px_30px_rgba(35,63,90,0.06)] sm:p-7"><div className="mb-7 flex items-center gap-3 border-b border-[#edf1f5] pb-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf8f5] text-[#168679]"><ImagePlus size={23} /></div><div><h2 className="text-xl font-black text-[#303b45]">Hasil Prediksi</h2><p className="text-sm text-[#71838d]">Ringkasan analisis AI</p></div></div>{prediction ? <div className="grid gap-5"><div className={`rounded-xl p-6 text-center ${prediction.is_stunting ? "bg-[#fff1ee] text-[#a43b2c]" : "bg-[#effaf7] text-[#167564]"}`}><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white">{prediction.is_stunting ? <AlertCircle size={30} /> : <CheckCircle2 size={30} />}</div><p className="text-2xl font-black">{prediction.prediction}</p><p className="mt-2 text-sm font-semibold">Confidence {prediction.confidence ?? "-"}%</p></div>{prediction.original_image && prediction.annotated_image && <section className="rounded-xl border border-[#dce6ef] bg-[#f8fbff] p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[#303b45]">Visualisasi Citra &amp; Landmark MediaPipe</h3><p className="mt-1 text-xs text-[#71838d]">Foto hasil analisis dan keypoints tubuh yang terdeteksi AI.</p></div><span className="shrink-0 rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#1c5fbd]">{prediction.landmark_count || 33} landmark terdeteksi</span></div><div className="grid gap-4 sm:grid-cols-2"><figure className="overflow-hidden rounded-lg border border-[#dce6ef] bg-white"><img src={prediction.original_image} alt="Foto hasil anak" className="h-52 w-full object-contain" /><figcaption className="border-t border-[#edf1f5] px-3 py-2 text-xs font-black text-[#53626b]">Foto hasil anak</figcaption></figure><figure className="overflow-hidden rounded-lg border border-[#dce6ef] bg-white"><img src={prediction.annotated_image} alt="Landmark keypoints MediaPipe" className="h-52 w-full object-contain" /><figcaption className="border-t border-[#edf1f5] px-3 py-2 text-xs font-black text-[#53626b]">Landmark keypoints (MediaPipe)</figcaption></figure></div></section>}<div className="flex gap-2 rounded-lg border border-[#f1d9a2] bg-[#fff8e7] p-3 text-xs leading-relaxed text-[#765e24]"><Info className="shrink-0" size={16} />Hasil ini merupakan pendukung keputusan klinis, bukan pengganti diagnosis dokter atau tenaga kesehatan.</div><div className="grid gap-3 sm:grid-cols-2"><button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] font-black text-white shadow-[0_3px_0_#124a98] transition hover:bg-[#174f9d] disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleSave} disabled={isSaving}><Save size={16} />{isSaving ? "Menyimpan..." : "Simpan Data"}</button><button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd8df] font-black text-[#405155] hover:border-[#1c5fbd] hover:text-[#1c5fbd]" type="button" onClick={() => setPrediction(null)}><RotateCcw size={16} />Prediksi Ulang</button></div></div> : <div className="grid min-h-[300px] place-items-center text-center text-[#8a9aa6]"><div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f1f6fb] text-[#1c5fbd]"><Activity size={30} /></div><p className="font-black text-[#405155]">Belum ada hasil</p><p className="mt-2 max-w-[270px] text-sm leading-relaxed">Isi data klinis anak lalu tekan Prediksi Sekarang untuk melihat hasil analisis.</p></div></div>}</section>
          {toast.visible && <div className={`fixed bottom-6 right-6 z-40 w-[min(460px,calc(100vw-2rem))] overflow-hidden rounded-xl border-2 border-[#1E60BD] bg-white p-5 text-[#111827] shadow-[0_12px_35px_rgba(35,63,90,0.22)] ${toast.leaving ? "toast-exit" : "toast-enter"}`} role="status"><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#167564] text-white"><Check size={22} strokeWidth={3} /></span><p className="flex-1 pt-1 text-base font-black leading-6 text-[#111827]">{toast.message}</p><button type="button" onClick={dismissToast} className="shrink-0 rounded-md p-1 text-[#71838d] transition hover:bg-[#eaf2ff] hover:text-[#1E60BD]" aria-label="Tutup notifikasi"><X size={19} /></button></div><div className="absolute inset-x-0 bottom-0 h-1 bg-[#dceaff]"><span className="toast-progress block h-full bg-[#1E60BD]" /></div></div>}
          {isGuideOpen && <PhotoGuideModal allowProceed={isGuideUploadFlow} onClose={() => { setPendingImageFile(null); setIsGuideUploadFlow(false); setIsGuideOpen(false); }} onProceed={proceedFromGuide} />}
          {invalidImageMessage && <InvalidImageModal message={invalidImageMessage} onClose={() => setInvalidImageMessage("")} onRetry={() => { setInvalidImageMessage(""); setPrediction(null); clearImage(); imageInputRef.current?.click(); }} />}
    </div>
  );
}

export default DetectionPage;
