import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Save } from "lucide-react";
import RichTextEditor from "../components/RichTextEditor";
import { apiUrl } from "../lib/api";

type SectionKey = "main" | "theSite" | "story" | "credits" | "people" | "papers" | "press";
type AboutSections = Record<SectionKey, string>;

const sectionFields: Array<{ key: SectionKey; title: string; description: string; rows: number }> = [
  { key: "main", title: "About Utama", description: "Judul dan pengantar utama halaman About.", rows: 6 },
  { key: "theSite", title: "The Site", description: "Penjelasan mengenai fitur dan cara kerja website.", rows: 7 },
  { key: "story", title: "Story", description: "Cerita, latar belakang, dan perjalanan StunTrack.", rows: 10 },
  { key: "credits", title: "Credits", description: "Kontributor, dukungan, dan pihak yang membantu.", rows: 7 },
  { key: "people", title: "People", description: "Daftar orang atau tim yang terlibat.", rows: 7 },
  { key: "papers", title: "Papers", description: "Publikasi, referensi, atau penelitian terkait.", rows: 8 },
  { key: "press", title: "Press", description: "Berita, publikasi media, atau tautan press.", rows: 7 },
];

const initialSections: AboutSections = { main: "", theSite: "", story: "", credits: "", people: "", papers: "", press: "" };

export default function AdminCMSPage() {
  const [sections, setSections] = useState<AboutSections>(initialSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchAbout() {
      try {
        const response = await fetch(apiUrl("/api/about"));
        const data = await response.json();
        setSections({ ...initialSections, ...(data.sections || {}), main: data.sections?.main || data.content || "" });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Gagal mengambil data About." });
      } finally {
        setLoading(false);
      }
    }
    void fetchAbout();
  }, []);

  function updateSection(key: SectionKey, value: string) {
    setSections((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!sections.main.trim()) {
      setMessage({ type: "error", text: "Konten About Utama tidak boleh kosong." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
      const response = await fetch(apiUrl("/api/admin/about"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ content: sections.main, the_site: sections.theSite, story: sections.story, credits: sections.credits, people: sections.people, papers: sections.papers, press: sections.press }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Gagal menyimpan pembaruan.");
      setMessage({ type: "success", text: "Semua section About berhasil diperbarui." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan server." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={32} /></div>;

  return (
    <div className="mx-auto min-h-0 w-full max-w-7xl">
      <div className="mb-6"><h2 className="text-2xl font-black text-[#303b45]">Kelola About Page</h2><p className="mt-1 text-sm text-[#71838d]">Kelola setiap bagian About secara terpisah dan lihat preview sebelum menyimpan.</p></div>
      {message && <div className={`mb-6 flex items-center gap-3 rounded-xl p-4 text-sm font-semibold ${message.type === "success" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"}`}>{message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}<span>{message.text}</span></div>}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
        <form onSubmit={handleSave} className="min-w-0">
          {sectionFields.map((field) => <section key={field.key} className="rounded-2xl border border-[#e3eaf2] bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3 border-b border-[#e3eaf2] pb-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[#1c5fbd]"><FileText size={20} /></div><div><h3 className="font-black text-[#303b45]">{field.title}</h3><p className="mt-1 text-xs font-semibold text-[#8a9aa6]">{field.description}</p></div></div><RichTextEditor rows={field.rows} value={sections[field.key]} onChange={(value) => updateSection(field.key, value)} placeholder={`Tulis konten ${field.title}...`} /></section>)}
          <button type="submit" disabled={saving} className="sticky bottom-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c5fbd] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#154b96] disabled:opacity-50">{saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Semua Perubahan</>}</button>
        </form>

        <aside className="min-w-0"><div className="overflow-hidden rounded-xl border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_12px_35px_rgba(70,53,39,0.12)]"><div className="border-b border-[#e7dfd7] bg-white/80 px-5 py-4"><p className="text-xs font-black uppercase tracking-wider text-[#71838d]">Live Preview</p><h3 className="mt-1 text-xl font-black text-[#1d61bc]">About StunTrack</h3></div><div className="about-rich-preview px-5 py-6"><section className="border-b border-[#e7dfd7] pb-5"><div className="prose prose-sm max-w-none text-[#405155]" dangerouslySetInnerHTML={{ __html: sections.main || "<p>Preview About Utama...</p>" }} /></section>{sectionFields.slice(1).map((field) => <section key={field.key} className="border-b border-[#e7dfd7] py-5 last:border-b-0"><h4 className="mb-2 text-sm font-black uppercase tracking-wide text-[#303b45]">{field.title}</h4><div className="prose prose-sm max-w-none text-[#405155]" dangerouslySetInnerHTML={{ __html: sections[field.key] || `<p>Preview ${field.title}...</p>` }} /></section>)}</div></div></aside>
      </div>
    </div>
  );
}
