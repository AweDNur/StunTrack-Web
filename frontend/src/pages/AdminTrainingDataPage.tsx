import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface TrainingData {
  id: number;
  volunteer_id: number;
  volunteer_name: string | null;
  gender: "L" | "P";
  height_cm: number | null;
  weight_kg: number | null;
  head_circ_cm: number | null;
  arm_circ_cm: number | null;
  photo_url: string;
  manual_label: string;
  notes: string;
  created_at: string;
}

interface Category {
  gender: "L" | "P";
  label: string;
}

interface TrainingResponse {
  data: TrainingData[];
  total: number;
  hasMore: boolean;
  categories: Array<{ gender: "L" | "P"; label: string; count: number }>;
  message?: string;
}

export default function AdminTrainingDataPage() {
  const [data, setData] = useState<TrainingData[]>([]);
  const [totalData, setTotalData] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk navigasi kategori dan lightbox
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
        const res = await fetch("http://localhost:3000/api/admin/training", {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const result = (await res.json()) as TrainingResponse;
        if (!res.ok) throw new Error(result.message || "Gagal mengambil data dari server");
        setData(result.data || []);
        setTotalData(result.total || 0);
        setCategoryCounts(Object.fromEntries((result.categories || []).map((category) => [`${category.gender}-${category.label}`, Number(category.count)])));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredData = selectedCategory
    ? data.filter((d) => d.gender === selectedCategory.gender && d.manual_label === selectedCategory.label)
    : [];
  const orderedFilteredData = useMemo(() => [...filteredData].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)), [filteredData]);
  const firstDataset = orderedFilteredData[0];
  const exampleDatasets = orderedFilteredData;

  async function loadCategory(category: Category, offset = 0, append = false) {
    const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
    setIsCategoryLoading(true);
    try {
      const params = new URLSearchParams({ gender: category.gender, label: category.label, limit: "5", offset: String(offset) });
      const response = await fetch(`http://localhost:3000/api/admin/training?${params.toString()}`, { headers: { Authorization: `Bearer ${session.token}` } });
      const result = (await response.json()) as TrainingResponse;
      if (!response.ok) throw new Error(result.message || "Gagal mengambil dataset kategori.");
      setData((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setCategoryTotal(result.total || 0);
      setHasMore(Boolean(result.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal mengambil dataset kategori.");
    } finally {
      setIsCategoryLoading(false);
    }
  }

  function handleSelectCategory(category: Category) {
    setSelectedCategory(category);
    setSelectedImageIndex(null);
    void loadCategory(category);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedImageIndex === null) return;
      if (e.key === "Escape") setSelectedImageIndex(null);
      if (e.key === "ArrowLeft") setSelectedImageIndex(prev => prev !== null ? (prev === 0 ? filteredData.length - 1 : prev - 1) : null);
      if (e.key === "ArrowRight") setSelectedImageIndex(prev => prev !== null ? ((prev + 1) % filteredData.length) : null);
    }
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = selectedImageIndex !== null ? "hidden" : "auto";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [selectedImageIndex, filteredData.length]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={32} /></div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 text-center"><AlertCircle size={32} className="mx-auto mb-2" /><p className="font-bold">Terjadi Kesalahan</p><p className="text-sm">{error}</p></div>;

  if (selectedCategory && firstDataset) {
    return (
      <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-6 flex items-center gap-4 border-b border-[#e3eaf2] pb-4">
          <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 rounded-lg border border-[#e3eaf2] bg-white px-4 py-2 text-sm font-bold text-[#303b45] shadow-sm transition hover:bg-gray-50"><ArrowLeft size={16} /> Kembali</button>
          <h3 className="text-lg font-black text-[#1c5fbd]">Detail Dataset</h3>
        </div>
        <section className="rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]">
          <h1 className="border-b border-[#a8b2bd] pb-5 text-3xl font-black uppercase tracking-wide text-[#303b45]">{selectedCategory.gender === "L" ? "Laki-laki" : "Perempuan"} - {selectedCategory.label}</h1>
          <div className="mt-6 text-[#303b45]"><p><span className="font-bold">Jenis Kelamin:</span> {selectedCategory.gender === "L" ? "Laki-laki" : "Perempuan"}</p><p><span className="font-bold">Label Diagnosis:</span> {selectedCategory.label}</p><p><span className="font-bold">Jumlah Dataset:</span> {categoryTotal}</p><p className="pt-3"><span className="font-bold">Deskripsi:</span> Dataset foto anak dengan jenis kelamin {selectedCategory.gender === "L" ? "laki-laki" : "perempuan"} dan label diagnosis {selectedCategory.label.toLowerCase()}.</p><p><span className="font-bold">Create Date:</span> {new Date(firstDataset.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <div className="mt-8 border-t border-[#e3eaf2] pt-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-[#303b45]">Example Dataset</h2><span className="text-sm font-bold text-[#71838d]">{orderedFilteredData.length} dari {categoryTotal}</span></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">{exampleDatasets.map((item, index) => <button type="button" key={item.id} onClick={() => setSelectedImageIndex(index)} className="group overflow-hidden rounded-lg border border-[#e3eaf2] bg-white text-left shadow-sm"><img src={`http://localhost:3000${item.photo_url}`} alt={`Example dataset ${index + 1}`} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}</div>{hasMore && <button type="button" disabled={isCategoryLoading} onClick={() => selectedCategory && void loadCategory(selectedCategory, data.length, true)} className="mt-5 rounded-lg border border-[#cbd8df] bg-white px-4 py-2 text-sm font-bold text-[#405155] transition hover:border-[#1c5fbd] hover:text-[#1c5fbd]">Load more...</button>}</div>
        </section>
        {selectedImageIndex !== null && orderedFilteredData[selectedImageIndex] && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"><button onClick={() => setSelectedImageIndex(null)} className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Tutup"><X size={32} /></button>{orderedFilteredData.length > 1 && <button onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + orderedFilteredData.length) % orderedFilteredData.length)} className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:left-8" aria-label="Gambar sebelumnya"><ChevronLeft size={36} /></button>}<div className="relative flex max-h-full w-full max-w-5xl flex-col items-center"><img src={`http://localhost:3000${orderedFilteredData[selectedImageIndex].photo_url}`} alt="Dataset" className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl" /><div className="mt-4 max-h-[30vh] w-full overflow-y-auto rounded-xl bg-white/10 p-4 text-white"><div className="mb-3 flex items-center justify-between"><span className="rounded-md bg-blue-500 px-3 py-1 text-sm font-bold uppercase tracking-widest">{orderedFilteredData[selectedImageIndex].manual_label}</span><span className="text-sm font-semibold text-white/70">{selectedImageIndex + 1} / {orderedFilteredData.length}</span></div><div className="mb-4 rounded-lg border border-blue-300/30 bg-blue-500/20 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-blue-200">Uploaded by</p><p className="mt-1 text-lg font-black text-white">{orderedFilteredData[selectedImageIndex].volunteer_name || "Volunteer"}</p></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><p><span className="block text-xs text-white/50">Jenis kelamin</span>{orderedFilteredData[selectedImageIndex].gender === "L" ? "Laki-laki" : "Perempuan"}</p><p><span className="block text-xs text-white/50">Tinggi badan</span>{orderedFilteredData[selectedImageIndex].height_cm ?? "–"} cm</p><p><span className="block text-xs text-white/50">Berat badan</span>{orderedFilteredData[selectedImageIndex].weight_kg ?? "–"} kg</p><p><span className="block text-xs text-white/50">Lingkar kepala</span>{orderedFilteredData[selectedImageIndex].head_circ_cm ?? "–"} cm</p><p><span className="block text-xs text-white/50">LiLA</span>{orderedFilteredData[selectedImageIndex].arm_circ_cm ?? "–"} cm</p></div><p className="mt-3 text-sm"><span className="font-bold text-white/70">Catatan:</span> {orderedFilteredData[selectedImageIndex].notes || "-"}</p><p className="mt-2 text-xs text-white/50">Diunggah pada: {new Date(orderedFilteredData[selectedImageIndex].created_at).toLocaleString("id-ID")}</p></div></div>{orderedFilteredData.length > 1 && <button onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % orderedFilteredData.length)} className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:right-8" aria-label="Gambar berikutnya"><ChevronRight size={36} /></button>}</div>}
      </div>
    );
  }

  const categories: Category[] = [
    { gender: "L", label: "Normal" },
    { gender: "L", label: "Stunting" },
    { gender: "L", label: "Kurang Nutrisi" },
    { gender: "P", label: "Normal" },
    { gender: "P", label: "Stunting" },
    { gender: "P", label: "Kurang Nutrisi" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#303b45]">Review Training Data AI</h2>
          <p className="mt-1 text-sm text-[#71838d]">Kumpulan dataset foto yang diunggah relawan.</p>
        </div>
        <div className="rounded-lg border border-[#e3eaf2] bg-white px-4 py-2 text-sm font-bold text-[#1c5fbd] shadow-sm">
          Total Keseluruhan: {totalData}
        </div>
      </div>

      {!selectedCategory ? (
        // VIEW 1: MENU KATEGORI BENTUK TABEL (Sesuai Referensi Gambar)
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="overflow-x-auto bg-white border border-[#a8b2bd]">
            <table className="w-full border-collapse text-left text-sm text-[#303b45]">
              <thead className="bg-[#f0f0f0] border-b border-[#a8b2bd]">
                <tr>
                  <th className="border-r border-[#a8b2bd] p-3 font-bold w-[25%] text-[#4a5568]">Jenis Kelamin</th>
                  <th className="border-r border-[#a8b2bd] p-3 font-bold w-[25%] text-[#4a5568]">Label Diagnosis</th>
                  <th className="border-r border-[#a8b2bd] p-3 font-bold w-[25%] text-[#4a5568]">Jumlah Dataset</th>
                  <th className="p-3 font-bold text-[#4a5568] w-[25%]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const count = categoryCounts[`${cat.gender}-${cat.label}`] || 0;
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleSelectCategory(cat)}
                      className="cursor-pointer border-b border-[#a8b2bd] transition hover:bg-[#f8fafc]"
                    >
                      {/* Warna teks merah gelap menyerupai gambar referensi pada kolom pertama */}
                      <td className="border-r border-[#a8b2bd] p-3 text-[#7a201b] font-medium">
                        {cat.gender === "L" ? "Laki-laki" : "Perempuan"}
                      </td>
                      <td className="border-r border-[#a8b2bd] p-3 text-[#303b45]">
                        {cat.label}
                      </td>
                      <td className="border-r border-[#a8b2bd] p-3 text-[#303b45]">
                        {count} Data
                      </td>
                      <td className="p-3 text-[#1c5fbd] hover:underline font-semibold">
                        Lihat Data 
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // VIEW 2: ISI DATASET (GRID FOTO)
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6 flex items-center gap-4 border-b border-[#e3eaf2] pb-4">
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#303b45] shadow-sm transition hover:bg-gray-50 border border-[#e3eaf2]">
              <ArrowLeft size={16} /> Kembali
            </button>
            <h3 className="text-lg font-black text-[#1c5fbd]">
              Dataset: {selectedCategory.gender === "L" ? "Laki-laki" : "Perempuan"} - {selectedCategory.label} ({filteredData.length})
            </h3>
          </div>

          {filteredData.length === 0 ? (
            <div className="rounded-2xl border border-[#e3eaf2] bg-white p-10 text-center text-[#8a9aa6]">
              <p className="font-bold">Belum ada data pada kategori ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredData.map((item, index) => (
                <div key={item.id} className="group cursor-pointer overflow-hidden rounded-2xl border border-[#e3eaf2] bg-white shadow-sm transition hover:border-[#1c5fbd] hover:shadow-md" onClick={() => setSelectedImageIndex(index)}>
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <img src={`http://localhost:3000${item.photo_url}`} alt="Dataset" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-xs font-semibold text-[#8a9aa6]">{new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                    <p className="line-clamp-2 text-sm text-[#303b45]"><span className="font-bold">Catatan:</span> {item.notes || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8">
          <button onClick={() => setSelectedImageIndex(null)} className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"><X size={32} /></button>
          {filteredData.length > 1 && <button onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev !== null ? (prev === 0 ? filteredData.length - 1 : prev - 1) : null); }} className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:left-8"><ChevronLeft size={36} /></button>}
          
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={`http://localhost:3000${filteredData[selectedImageIndex].photo_url}`} alt="Modal" className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl" />
            <div className="mt-4 w-full rounded-xl bg-white/10 p-4 text-white backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-blue-500 px-3 py-1 text-sm font-bold uppercase tracking-widest">{filteredData[selectedImageIndex].manual_label} ({filteredData[selectedImageIndex].gender === "L" ? "L" : "P"})</span>
                <span className="text-sm font-semibold text-white/70">{selectedImageIndex + 1} / {filteredData.length}</span>
              </div>
              <p className="text-sm"><span className="font-bold text-white/70">Catatan:</span> {filteredData[selectedImageIndex].notes || "-"}</p>
            </div>
          </div>

          {filteredData.length > 1 && <button onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev !== null ? ((prev + 1) % filteredData.length) : null); }} className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:right-8"><ChevronRight size={36} /></button>}
        </div>
      )}
    </div>
  );
}
