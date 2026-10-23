import { useEffect, useState } from "react";
import { FileText, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminCMSPage() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mengambil data saat ini dari backend
  useEffect(() => {
    async function fetchAbout() {
      try {
        const res = await fetch("http://localhost:3000/api/about");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Gagal mengambil data about");
        }
        
        setContent(data.content || "");
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoading(false);
      }
    }

    fetchAbout();
  }, []);

  // Menyimpan pembaruan ke backend
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setMessage({ type: "error", text: "Konten tidak boleh kosong." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
      const res = await fetch("http://localhost:3000/api/admin/about", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal menyimpan pembaruan");
      }

      setMessage({ type: "success", text: "Konten About Web berhasil diperbarui!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Terjadi kesalahan server" });
    } finally {
      setSaving(false);
      // Menghilangkan pesan sukses setelah 3 detik
      setTimeout(() => setMessage(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#1c5fbd]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[#303b45]">Kelola Konten Landing Page</h2>
        <p className="mt-1 text-sm text-[#71838d]">
          Pembaruan yang Anda simpan di sini akan langsung tampil pada halaman utama pengunjung (Guest).
        </p>
      </div>

      <div className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-[#e3eaf2] pb-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[#1c5fbd]">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#303b45]">Bagian "Tentang Kami" (About)</h3>
            <p className="text-xs font-semibold text-[#8a9aa6]">Edit teks deskripsi website StunTrack</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-[#303b45]">
              Isi Konten About
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan deskripsi tentang website StunTrack di sini..."
              className="w-full rounded-xl border border-[#d1dbe5] bg-[#f8fafc] p-4 text-sm font-medium text-[#303b45] transition focus:border-[#1c5fbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1c5fbd]/10"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#1c5fbd] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#154b96] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} /> Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}