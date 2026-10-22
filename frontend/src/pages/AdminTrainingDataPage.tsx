import { useEffect, useState } from "react";
import { Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Grid2X2, List } from "lucide-react";

interface TrainingData {
  id: number;
  volunteer_id: number;
  photo_url: string;
  manual_label: string;
  notes: string;
  created_at: string;
}

export default function AdminTrainingDataPage() {
  const [data, setData] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // State untuk Lightbox/Gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
        const res = await fetch("http://localhost:3000/api/admin/training", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.message || "Gagal mengambil data dari server");
        }

        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Keyboard navigation untuk Lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedImageIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPrevious();
      if (e.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    // Mencegah scroll body saat lightbox terbuka
    document.body.style.overflow = selectedImageIndex !== null ? "hidden" : "auto";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [selectedImageIndex, data.length]);

  function closeLightbox() {
    setSelectedImageIndex(null);
  }

  function showNext() {
    if (selectedImageIndex !== null) {
      // Jika di gambar terakhir, kembali ke gambar pertama (0)
      setSelectedImageIndex((selectedImageIndex + 1) % data.length);
    }
  }

  function showPrevious() {
    if (selectedImageIndex !== null) {
      // Jika di gambar pertama, pergi ke gambar terakhir
      setSelectedImageIndex(selectedImageIndex === 0 ? data.length - 1 : selectedImageIndex - 1);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#1c5fbd]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 flex flex-col items-center justify-center text-center">
        <AlertCircle size={32} className="mb-2 opacity-80" />
        <p className="font-bold">Terjadi Kesalahan</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#303b45]">Review Training Data AI</h2>
          <p className="mt-1 text-sm text-[#71838d]">
            Kumpulan dataset foto yang diunggah oleh relawan untuk meningkatkan akurasi AI.
          </p>
        </div>
        <div className="flex items-center gap-3"><div className="text-sm font-bold text-[#1c5fbd] bg-white border border-[#e3eaf2] px-4 py-2 rounded-lg shadow-sm">Total Data: {data.length}</div><button type="button" onClick={() => setViewMode((mode) => mode === "grid" ? "list" : "grid")} className="grid h-10 w-10 place-items-center rounded-lg border border-[#e3eaf2] bg-white text-[#53626b] shadow-sm transition hover:border-[#1c5fbd] hover:text-[#1c5fbd]" aria-label={viewMode === "grid" ? "Tampilkan sebagai list" : "Tampilkan sebagai grid"} title={viewMode === "grid" ? "Tampilkan sebagai list" : "Tampilkan sebagai grid"}>{viewMode === "grid" ? <List size={19} /> : <Grid2X2 size={19} />}</button></div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-[#e3eaf2] bg-white p-10 text-center text-[#8a9aa6]">
          <p className="font-bold">Belum ada data training yang diunggah.</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid grid-cols-1 gap-3"}>
          {data.map((item, index) => (
            <div 
              key={item.id} 
              className={viewMode === "grid" ? "overflow-hidden rounded-2xl border border-[#e3eaf2] bg-white shadow-sm transition hover:shadow-md cursor-pointer group" : "flex overflow-hidden rounded-xl border border-[#e3eaf2] bg-white shadow-sm transition hover:shadow-md cursor-pointer group"}
              onClick={() => setSelectedImageIndex(index)}
            >
              <div className={viewMode === "grid" ? "aspect-square w-full bg-gray-100 relative overflow-hidden" : "relative h-28 w-28 shrink-0 overflow-hidden bg-gray-100 sm:h-32 sm:w-32"}>
                <img
                  src={`http://localhost:3000${item.photo_url}`}
                  alt={`Label: ${item.manual_label}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Overlay saat di-hover (opsional agar lebih interaktif) */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                
                <div className={`${viewMode === "grid" ? "absolute top-3 right-3" : "hidden"} bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-black text-[#303b45] shadow-sm uppercase tracking-wide`}>
                  {item.manual_label}
                </div>
              </div>
<div className={viewMode === "list" ? "flex w-44 shrink-0 items-center border-x border-[#edf1f5] px-5" : "hidden"}><span className="rounded-md bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#1c5fbd]">{item.manual_label}</span></div>              <div className="min-w-0 flex-1 p-4">
                <p className="text-xs font-semibold text-[#8a9aa6] mb-1">
                  {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-[#303b45] line-clamp-2">
                  <span className="font-bold">Catatan:</span> {item.notes || "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8">
          {/* Tombol Tutup */}
          <button 
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 p-2 text-white/70 transition hover:text-white hover:bg-white/10 rounded-full"
            aria-label="Tutup"
          >
            <X size={32} />
          </button>

          {/* Tombol Previous */}
          {data.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); showPrevious(); }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 text-white/70 transition hover:text-white bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md"
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          {/* Konten Gambar */}
          <div className="relative flex flex-col items-center max-w-5xl w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={`http://localhost:3000${data[selectedImageIndex].photo_url}`}
              alt={`Data ${selectedImageIndex}`}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
            />
            
            {/* Info di bawah gambar */}
            <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 w-full text-white">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-md text-sm font-bold uppercase tracking-widest ${
                  data[selectedImageIndex].manual_label === 'Stunting' ? 'bg-red-500' : 
                  data[selectedImageIndex].manual_label === 'Kurang Nutrisi' ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  {data[selectedImageIndex].manual_label}
                </span>
                <span className="text-sm font-semibold text-white/70">
                  {selectedImageIndex + 1} / {data.length}
                </span>
              </div>
              <p className="text-sm">
                <span className="font-bold text-white/70">Catatan:</span> {data[selectedImageIndex].notes || "Tidak ada catatan."}
              </p>
              <p className="text-xs text-white/50 mt-2">
                Diunggah pada: {new Date(data[selectedImageIndex].created_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Tombol Next */}
          {data.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); showNext(); }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 p-3 text-white/70 transition hover:text-white bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md"
              aria-label="Next image"
            >
              <ChevronRight size={36} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
