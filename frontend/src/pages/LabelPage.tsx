import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo-stuntrack.png";

interface TrainingData {
  id: number;
  volunteer_name: string | null;
  gender: "L" | "P";
  height_cm: number | null;
  weight_kg: number | null;
  head_circ_cm: number | null;
  arm_circ_cm: number | null;
  photo_url: string | null;
  manual_label: string;
  notes: string;
  created_at: string;
}

interface Category {
  gender: "L" | "P";
  label: string;
}

interface LabelResponse {
  data: TrainingData[];
  total: number;
  hasMore: boolean;
  categories: Array<{ gender: "L" | "P"; label: string; count: number }>;
}

const categories: Category[] = [
  { gender: "L", label: "Normal" },
  { gender: "L", label: "Stunting" },
  { gender: "L", label: "Kurang Nutrisi" },
  { gender: "P", label: "Normal" },
  { gender: "P", label: "Stunting" },
  { gender: "P", label: "Kurang Nutrisi" },
];

function imageUrl(path: string) {
  return `http://localhost:3000${path}`;
}

function datasetImageUrl(path: string | null) {
  return path ? imageUrl(path) : "";
}

export default function LabelPage() {
  const [data, setData] = useState<TrainingData[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("http://localhost:3000/api/labels");
        const result = (await response.json()) as LabelResponse;
        if (!response.ok) throw new Error("Gagal mengambil label dataset.");
        setCategoryCounts(Object.fromEntries((result.categories || []).map((item) => [`${item.gender}-${item.label}`, Number(item.count)])));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Gagal mengambil label dataset.");
      } finally {
        setLoading(false);
      }
    }
    void fetchCategories();
  }, []);

  const filteredData = selectedCategory
    ? data.filter((item) => item.gender === selectedCategory.gender && item.manual_label === selectedCategory.label)
    : [];
  const orderedData = useMemo(
    () => [...filteredData].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)),
    [filteredData]
  );
  const selectedDataset = orderedData[selectedImageIndex] || orderedData[0];

  async function loadCategory(category: Category, offset = 0, append = false) {
    setIsCategoryLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ gender: category.gender, label: category.label, limit: "5", offset: String(offset) });
      const response = await fetch(`http://localhost:3000/api/labels?${params.toString()}`);
      const result = (await response.json()) as LabelResponse;
      if (!response.ok) throw new Error("Gagal mengambil dataset label.");
      const availableData = (result.data || []).filter((item) => Boolean(item.photo_url));
      setData((current) => append ? [...current, ...availableData] : availableData);
      setCategoryTotal(result.total || 0);
      setHasMore(Boolean(result.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal mengambil dataset label.");
    } finally {
      setIsCategoryLoading(false);
    }
  }

  function selectCategory(category: Category) {
    setSelectedCategory(category);
    setSelectedImageIndex(0);
    setData([]);
    void loadCategory(category);
  }

  function goToLabelHome() {
    setSelectedCategory(null);
    setSelectedImageIndex(0);
    setData([]);
    setCategoryTotal(0);
    setHasMore(false);
    setError(null);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f3f7fb]"><Loader2 className="animate-spin text-[#1c5fbd]" size={32} /></div>;

  return (
    <main className="min-h-screen bg-[#f3efea] bg-[linear-gradient(135deg,rgba(18,132,122,0.12),transparent_34%),linear-gradient(315deg,rgba(219,94,68,0.13),transparent_31%)] px-3 py-3 text-[#24313a] sm:px-5 sm:py-7 sm:pb-14">
      <section className="mx-auto w-full max-w-[900px] overflow-hidden rounded-lg border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_18px_60px_rgba(70,53,39,0.13)]">
        <nav className="flex items-center justify-between border-b border-[#e7dfd7] bg-white/75 px-5 py-4 md:px-7">
          <div className="flex items-center gap-3"><Link to="/" className="flex items-center gap-3 text-[#1d61bc]"><img className="h-[40px] w-[40px] shrink-0 object-contain" src={logo} alt="StunTrack Logo" /><strong className="text-xl font-black text-[#1d61bc]">StunTrack</strong></Link><Link to="/labels" onClick={goToLabelHome} className="ml-2 rounded-lg border border-[#b4ccef] bg-[#eaf2ff] px-5 py-2.5 text-base font-black text-[#1c5fbd] shadow-[0_3px_0_#9db9e8] transition hover:-translate-y-0.5 hover:bg-[#dceaff] hover:shadow-[0_4px_0_#8eafe4]">Label</Link></div>
          <Link to="/about" className="inline-flex items-center gap-2 font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]"><ArrowLeft size={18} /> Kembali ke About</Link>
        </nav>

        <div className="px-6 py-10 sm:px-12 sm:py-14">
          {error && <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertCircle size={18} />{error}</div>}
          {!selectedCategory ? (
            <>
              <div className="mb-8 border-b border-[#e7dfd7] pb-6"><h1 className="text-3xl font-black text-[#1d61bc]">Label Dataset AI</h1><p className="mt-1 text-sm font-extrabold uppercase tracking-wide text-[#657b86]">Kategori dataset StunTrack</p></div>
              <div className="overflow-x-auto border border-[#a8b2bd]">
                <table className="w-full border-collapse text-left text-sm text-[#303b45]">
                  <thead className="border-b border-[#a8b2bd] bg-[#f0f0f0]"><tr><th className="border-r border-[#a8b2bd] p-3">Jenis Kelamin</th><th className="border-r border-[#a8b2bd] p-3">Label Diagnosis</th><th className="border-r border-[#a8b2bd] p-3">Jumlah Dataset</th><th className="p-3">Aksi</th></tr></thead>
                  <tbody>{categories.map((category) => <tr key={`${category.gender}-${category.label}`} onClick={() => selectCategory(category)} className="cursor-pointer border-b border-[#a8b2bd] transition hover:bg-[#f8fafc]"><td className="border-r border-[#a8b2bd] p-3 font-medium text-[#7a201b]">{category.gender === "L" ? "Laki-laki" : "Perempuan"}</td><td className="border-r border-[#a8b2bd] p-3">{category.label}</td><td className="border-r border-[#a8b2bd] p-3">{categoryCounts[`${category.gender}-${category.label}`] || 0}</td><td className="p-3"><button type="button" onClick={(event) => { event.stopPropagation(); selectCategory(category); }} className="font-semibold text-[#1c5fbd] hover:underline">Lihat Data</button></td></tr>)}</tbody>
                </table>
              </div>
            </>
          ) : selectedDataset ? (
            <>
              <div className="mb-6 flex items-center gap-4 border-b border-[#e3eaf2] pb-4"><button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 rounded-lg border border-[#e3eaf2] bg-white px-4 py-2 text-sm font-bold text-[#303b45] shadow-sm hover:bg-gray-50"><ArrowLeft size={16} /> Kembali</button><h2 className="text-lg font-black text-[#1c5fbd]">Detail Dataset</h2></div>
              <section className="rounded-xl border border-[#dce6ef] bg-white p-6 shadow-sm"><h1 className="border-b border-[#a8b2bd] pb-5 text-3xl font-black uppercase tracking-wide text-[#303b45]">{selectedCategory.gender === "L" ? "Laki-laki" : "Perempuan"} - {selectedCategory.label}</h1><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-3 text-[#303b45]"><p><b>Jenis Kelamin:</b> {selectedCategory.gender === "L" ? "Laki-laki" : "Perempuan"}</p><p><b>Label Diagnosis:</b> {selectedCategory.label}</p><p><b>Jumlah Dataset:</b> {categoryTotal}</p><p className="pt-3"><b>Deskripsi:</b> Dataset foto anak dengan jenis kelamin {selectedCategory.gender === "L" ? "laki-laki" : "perempuan"} dan label diagnosis {selectedCategory.label.toLowerCase()}.</p><p><b>Create Date:</b> {new Date(orderedData[0].created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p><p><b>Uploaded by:</b> {selectedDataset.volunteer_name || "Volunteer"}</p></div><div className="overflow-hidden rounded-lg border-4 border-[#1c5fbd] bg-[#f5f8fc]"><img src={datasetImageUrl(selectedDataset.photo_url)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} className="aspect-square w-full object-cover" /></div></div><div className="mt-8 border-t border-[#e3eaf2] pt-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#303b45]">Example Dataset</h2><span className="text-sm font-bold text-[#71838d]">{orderedData.length} dari {categoryTotal}</span></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">{orderedData.map((item, index) => <button key={item.id} type="button" onClick={() => setSelectedImageIndex(index)} className={`group overflow-hidden rounded-lg border-4 bg-white text-left shadow-sm ${index === selectedImageIndex ? "border-[#1c5fbd]" : "border-[#e3eaf2]"}`}><img src={datasetImageUrl(item.photo_url)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}</div>{hasMore && <button type="button" disabled={isCategoryLoading} onClick={() => void loadCategory(selectedCategory, data.length, true)} className="mt-5 rounded-lg border border-[#cbd8df] bg-white px-4 py-2 text-sm font-bold text-[#405155] hover:border-[#1c5fbd] hover:text-[#1c5fbd]">Load more...</button>}</div></section>
            </>
          ) : <div className="py-16 text-center text-[#71838d]">Belum ada dataset untuk kategori ini.</div>}
        </div>
      </section>
    </main>
  );
}
