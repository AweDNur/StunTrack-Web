import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

interface TrainingData {
  id: number;
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

function protectedImageUrl(photoPath: string) {
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
  const token = typeof session.token === "string" ? session.token : "";
  return `http://localhost:3000${photoPath}?token=${encodeURIComponent(token)}`;
}

export default function VolunteerHistoryPage() {
  const [data, setData] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk Lightbox/Gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
        const res = await fetch("http://localhost:3000/api/volunteer/training/history", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.message || "Gagal mengambil riwayat data");
        }

        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
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
      setSelectedImageIndex((selectedImageIndex + 1) % data.length);
    }
  }

  function showPrevious() {
    if (selectedImageIndex !== null) {
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#303b45]">Riwayat Kontribusi Anda</h2>
          <p className="mt-1 text-sm text-[#71838d]">
            Daftar foto dan label yang telah Anda unggah untuk membantu pelatihan AI StunTrack.
          </p>
        </div>
        <div className="text-sm font-bold text-[#1c5fbd] bg-white border border-[#e3eaf2] px-4 py-2 rounded-lg shadow-sm">
          Total: {data.length} Foto
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-[#e3eaf2] bg-white p-10 text-center text-[#8a9aa6]">
          <ImageIcon size={48} className="mx-auto mb-4 text-[#d1dbe5]" />
          <p className="font-bold text-lg text-[#303b45]">Belum ada riwayat kontribusi.</p>
          <p className="text-sm mt-1">Anda belum pernah mengunggah data training AI.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item, index) => (
            <div 
              key={item.id} 
              className="group flex cursor-pointer gap-4 overflow-hidden rounded-2xl border border-[#e3eaf2] bg-white p-4 shadow-sm transition hover:shadow-md hover:border-[#1c5fbd]"
              onClick={() => setSelectedImageIndex(index)}
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 relative">
                <img
                  src={protectedImageUrl(item.photo_url)}
                  alt="Kontribusi"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              </div>
              <div className="flex flex-col justify-center">
                <span className={`inline-block w-fit px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 ${
                  item.manual_label === 'Stunting' ? 'bg-red-100 text-red-700' : 
                  item.manual_label === 'Kurang Nutrisi' ? 'bg-orange-100 text-orange-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {item.manual_label}
                </span>
                <p className="text-xs font-semibold text-[#8a9aa6]">
                  {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-sm text-[#303b45] mt-1 line-clamp-2" title={item.notes}>
                  {item.notes || <span className="italic text-gray-400">Tanpa catatan</span>}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#71838d]">
                  {item.gender === "L" ? "Laki-laki" : "Perempuan"} · {item.height_cm ?? "–"} cm · {item.weight_kg ?? "–"} kg
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8">
          {/* Tombol Tutup */}
          <button 
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <X size={32} />
          </button>

          {/* Tombol Previous */}
          {data.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); showPrevious(); }}
              className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:left-8"
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          {/* Konten Gambar */}
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={protectedImageUrl(data[selectedImageIndex].photo_url)}
              alt={`Kontribusi ${selectedImageIndex}`}
              className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            
            {/* Info di bawah gambar */}
            <div className="mt-4 w-full rounded-xl bg-white/10 p-4 text-white backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-md px-3 py-1 text-sm font-bold uppercase tracking-widest ${
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
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-black/20 p-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-white/50">Jenis kelamin</p>
                  <p className="mt-1 font-semibold">{data[selectedImageIndex].gender === "L" ? "Laki-laki" : "Perempuan"}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Tinggi badan</p>
                  <p className="mt-1 font-semibold">{data[selectedImageIndex].height_cm ?? "–"} cm</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Berat badan</p>
                  <p className="mt-1 font-semibold">{data[selectedImageIndex].weight_kg ?? "–"} kg</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Lingkar kepala</p>
                  <p className="mt-1 font-semibold">{data[selectedImageIndex].head_circ_cm ?? "–"} cm</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">LiLA</p>
                  <p className="mt-1 font-semibold">{data[selectedImageIndex].arm_circ_cm ?? "–"} cm</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">
                Diunggah pada: {new Date(data[selectedImageIndex].created_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Tombol Next */}
          {data.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); showNext(); }}
              className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:right-8"
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
