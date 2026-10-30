import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Activity, AlertCircle, Baby, CheckCircle2, ImagePlus, Info, RotateCcw, Save, Sparkles, Upload, X } from "lucide-react";

type Session = { token?: string; role?: "orang_tua" | "volunteer" | "admin"; name?: string };
type BabyProfile = { id: number; name: string; gender: string; birth_date: string };
type Prediction = {
  prediction: string;
  is_stunting: boolean;
  confidence?: number;
  mp_detected?: boolean;
  proba_stunting?: number;
  proba_tidak_stunting?: number;
};

const inputClass = "h-12 w-full rounded-lg border border-[#cbd8df] bg-white px-4 font-medium text-[#24313a] outline-none transition placeholder:text-[#9aa8af] focus:border-[#1c5fbd] focus:ring-4 focus:ring-[#1c5fbd]/10";

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function DetectionPage() {
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as Session | null;
  const formRef = useRef<HTMLFormElement>(null);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState("");
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const today = todayInputValue();

  useEffect(() => {
    fetch("/ai-api/status")
      .then((response) => response.json())
      .then((data: { model_ready?: boolean }) => setIsReady(Boolean(data.model_ready)))
      .catch(() => setIsReady(false));
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    fetch("/api/user/babies", { headers: { Authorization: `Bearer ${session.token}` } })
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

  function selectImage(file?: File) {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectImage(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    selectImage(event.dataTransfer.files?.[0]);
  }

  function clearImage() {
    setImage(null);
    setPreview("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaveMessage("");
    setPrediction(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const submittedBirthDate = String(form.get("birth_date") ?? "");
    if (submittedBirthDate > today) {
      setError("Tanggal lahir tidak boleh lebih dari hari ini.");
      setIsSubmitting(false);
      return;
    }
    if (image) form.set("image", image);
    else form.delete("image");

    try {
      const response = await fetch("/ai-api/predict", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as Prediction & { error?: string };
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
    setSaveMessage("");
    setIsSaving(true);
    const form = new FormData(formRef.current);
    const selectedGender = String(form.get("jk") ?? gender);

    try {
      let babyId = Number(selectedBabyId);
      if (!babyId) {
        const babyResponse = await fetch("/api/user/babies", {
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

      const scanResponse = await fetch("/api/user/scans", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: scanForm,
      });
      const scanResult = (await scanResponse.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!scanResponse.ok) throw new Error(scanResult.message || scanResult.error || "Data scan gagal disimpan.");

      setSaveMessage(scanResult.message || "Data bayi dan hasil scan berhasil disimpan.");
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
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="usia_bulan">Usia <span className="font-normal text-[#8a9aa6]">(bulan)</span><input className={inputClass} id="usia_bulan" name="usia_bulan" type="number" placeholder="cth. 24" min="0" max="60" step="0.1" required /></label>
              <fieldset className="grid gap-2"><legend className="text-sm font-extrabold text-[#405155]">Jenis Kelamin</legend><div className="grid gap-3 sm:grid-cols-2"><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="jk" value="0" checked={gender === "0"} onChange={(event) => setGender(event.target.value)} required /><span className="flex h-12 items-center justify-center rounded-lg border border-[#cbd8df] font-bold text-[#65747b] transition peer-checked:border-[#1c5fbd] peer-checked:bg-[#eef5ff] peer-checked:text-[#1c5fbd]">♀ Perempuan</span></label><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="jk" value="1" checked={gender === "1"} onChange={(event) => setGender(event.target.value)} /><span className="flex h-12 items-center justify-center rounded-lg border border-[#cbd8df] font-bold text-[#65747b] transition peer-checked:border-[#1c5fbd] peer-checked:bg-[#eef5ff] peer-checked:text-[#1c5fbd]">♂ Laki-laki</span></label></div></fieldset>
              <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="bb_kg">Berat Badan <span className="font-normal text-[#8a9aa6]">(kg)</span><input className={inputClass} id="bb_kg" name="bb_kg" type="number" placeholder="cth. 12.5" min="0.1" max="30" step="0.01" required /></label><label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="lk_cm">Lingkar Kepala <span className="font-normal text-[#8a9aa6]">(cm)</span><input className={inputClass} id="lk_cm" name="lk_cm" type="number" placeholder="cth. 46" min="5" max="70" step="0.1" required /></label></div>
              <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="ll_cm">Lingkar Lengan Atas <span className="font-normal text-[#8a9aa6]">(LILA, cm)</span><input className={inputClass} id="ll_cm" name="ll_cm" type="number" placeholder="cth. 14" min="3" max="40" step="0.1" required /></label>
              <div className="grid gap-2 text-sm font-extrabold text-[#405155]"><span>Foto Anak <span className="font-normal text-[#8a9aa6]">(opsional · meningkatkan akurasi)</span></span><label className="relative flex min-h-[150px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#b8cddd] bg-[#f8fbff] p-4 text-center transition hover:border-[#1c5fbd]" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>{preview ? <><img className="h-[130px] max-w-full rounded-lg object-cover" src={preview} alt="Preview foto anak" /><button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white text-[#a43b2c] shadow" type="button" onClick={(event) => { event.preventDefault(); clearImage(); }} aria-label="Hapus foto"><X size={16} /></button></> : <span className="grid justify-items-center gap-2 text-[#71838d]"><Upload className="text-[#1c5fbd]" size={25} /><strong className="text-[#405155]">Klik atau seret foto ke sini</strong><small>PNG · JPG · HEIC · WebP · BMP · TIFF · dan lainnya</small></span>}<input className="absolute inset-0 cursor-pointer opacity-0" type="file" id="imageInput" name="image" accept="image/*" onChange={handleFileChange} /></label></div>
              {error && <p className="flex gap-2 rounded-lg border border-[#f1c5be] bg-[#fff1ee] px-4 py-3 text-sm font-semibold text-[#a43b2c]" role="alert"><AlertCircle size={18} />{error}</p>}
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] font-black text-white shadow-[0_3px_0_#124a98] transition hover:bg-[#174f9d] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSubmitting || isReady === false}><Sparkles size={18} />{isSubmitting ? "Menganalisis..." : "Prediksi Sekarang"}</button>
            </form>
          </section>

          <section className="min-h-[420px] rounded-xl border border-[#dce6ef] bg-white p-5 shadow-[0_8px_30px_rgba(35,63,90,0.06)] sm:p-7"><div className="mb-7 flex items-center gap-3 border-b border-[#edf1f5] pb-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf8f5] text-[#168679]"><ImagePlus size={23} /></div><div><h2 className="text-xl font-black text-[#303b45]">Hasil Prediksi</h2><p className="text-sm text-[#71838d]">Ringkasan analisis AI</p></div></div>{prediction ? <div className="grid gap-5"><div className={`rounded-xl p-6 text-center ${prediction.is_stunting ? "bg-[#fff1ee] text-[#a43b2c]" : "bg-[#effaf7] text-[#167564]"}`}><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white">{prediction.is_stunting ? <AlertCircle size={30} /> : <CheckCircle2 size={30} />}</div><p className="text-2xl font-black">{prediction.prediction}</p><p className="mt-2 text-sm font-semibold">Confidence {prediction.confidence ?? "-"}%</p></div><div className="flex gap-2 rounded-lg border border-[#f1d9a2] bg-[#fff8e7] p-3 text-xs leading-relaxed text-[#765e24]"><Info className="shrink-0" size={16} />Hasil ini merupakan pendukung keputusan klinis, bukan pengganti diagnosis dokter atau tenaga kesehatan.</div>{saveMessage && <p className="rounded-lg border border-[#b8ded4] bg-[#effaf7] px-4 py-3 text-sm font-semibold text-[#167564]" role="status">{saveMessage}</p>}<div className="grid gap-3 sm:grid-cols-2"><button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] font-black text-white shadow-[0_3px_0_#124a98] transition hover:bg-[#174f9d] disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleSave} disabled={isSaving}><Save size={16} />{isSaving ? "Menyimpan..." : "Simpan Data"}</button><button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd8df] font-black text-[#405155] hover:border-[#1c5fbd] hover:text-[#1c5fbd]" type="button" onClick={() => { setPrediction(null); setSaveMessage(""); }}><RotateCcw size={16} />Prediksi Ulang</button></div></div> : <div className="grid min-h-[300px] place-items-center text-center text-[#8a9aa6]"><div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f1f6fb] text-[#1c5fbd]"><Activity size={30} /></div><p className="font-black text-[#405155]">Belum ada hasil</p><p className="mt-2 max-w-[270px] text-sm leading-relaxed">Isi data klinis anak lalu tekan Prediksi Sekarang untuk melihat hasil analisis.</p></div></div>}</section>
    </div>
  );
}

export default DetectionPage;
