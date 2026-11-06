import { useEffect, useState } from "react";
import { ChevronRight, Database, Loader2, Medal, Trophy, Users, X } from "lucide-react";
import { apiUrl, protectedMediaUrl } from "../lib/api";

type Leader = { rank: number; id: number; name: string; email: string; contribution_count: number; latest_contribution: string | null };
type Dataset = { id: number; gender: "L" | "P"; manual_label: string; photo_url: string; created_at: string; height_cm: number | null; weight_kg: number | null; head_circ_cm: number | null; arm_circ_cm: number | null };
type DatasetResponse = { data: Dataset[]; total: number };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Belum ada kontribusi";

export default function AdminLeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selected, setSelected] = useState<Leader | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
    fetch(apiUrl("/api/admin/leaderboard"), { headers: { Authorization: `Bearer ${session.token}` } })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || result.error || "Gagal mengambil leaderboard."); setLeaders(result); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Gagal memuat leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  async function openVolunteer(leader: Leader) {
    setSelected(leader); setDatasets([]); setDatasetLoading(true); setError("");
    const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
    try {
      const response = await fetch(`${apiUrl("/api/admin/training")}?volunteer_id=${leader.id}&limit=50&offset=0`, { headers: { Authorization: `Bearer ${session.token}` } });
      const result = (await response.json()) as DatasetResponse;
      if (!response.ok) throw new Error("Gagal mengambil dataset volunteer.");
      setDatasets(result.data || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Gagal mengambil dataset volunteer."); } finally { setDatasetLoading(false); }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={30} /></div>;
  return <div className="mx-auto w-full max-w-[1180px]">
    <div className="mb-7"><p className="text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Leaderboard Admin</p><h2 className="mt-1 text-2xl font-black text-[#303b45]">Peringkat kontribusi volunteer</h2><p className="mt-1 text-sm text-[#71838d]">Klik volunteer untuk melihat dataset yang telah mereka upload.</p></div>
    {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <section className="overflow-hidden rounded-xl border border-[#dce6ef] bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-[#edf1f5] px-6 py-5"><Users className="text-[#1c5fbd]" size={22} /><div><h3 className="font-black text-[#303b45]">Semua volunteer</h3><p className="mt-1 text-sm text-[#71838d]">Urutan berdasarkan jumlah dataset.</p></div></div><div className="divide-y divide-[#edf1f5]">{leaders.map((item) => <button type="button" key={item.id} onClick={() => void openVolunteer(item)} className={`flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-[#f5f8fc] ${selected?.id === item.id ? "bg-[#eaf2ff]" : ""}`}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${item.rank === 1 ? "bg-[#fff0b8] text-[#9a7100]" : item.rank === 2 ? "bg-[#edf1f5] text-[#647482]" : item.rank === 3 ? "bg-[#f8dfc5] text-[#9a5f25]" : "bg-[#f5f8fc] text-[#607178]"}`}>{item.rank <= 3 ? (item.rank === 1 ? <Trophy size={18} /> : <Medal size={18} />) : item.rank}</div><div className="min-w-0 flex-1"><p className="truncate font-black text-[#303b45]">{item.name}</p><p className="truncate text-xs font-semibold text-[#8a9aa6]">{item.email}</p></div><div className="text-right"><p className="font-black text-[#1c5fbd]">{item.contribution_count}</p><p className="text-xs font-semibold text-[#8a9aa6]">dataset</p></div><ChevronRight className="shrink-0 text-[#8a9aa6]" size={19} /></button>)}{!leaders.length && <div className="px-6 py-12 text-center text-sm text-[#8a9aa6]">Belum ada volunteer.</div>}</div></section>
    {selected && <section className="mt-5 rounded-xl border border-[#dce6ef] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1f5] pb-5"><div><p className="text-xs font-black uppercase tracking-wider text-[#1c5fbd]">Volunteer #{selected.rank}</p><h3 className="mt-1 text-xl font-black text-[#303b45]">{selected.name}</h3><p className="mt-1 text-sm text-[#71838d]">{selected.email} · {selected.contribution_count} dataset · kontribusi terakhir {formatDate(selected.latest_contribution)}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-[#71838d] hover:bg-[#f5f8fc]" aria-label="Tutup detail"><X size={19} /></button></div>{datasetLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={25} /></div> : <div className="mt-5">{datasets.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{datasets.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[#e3eaf2] bg-[#fbfdff] shadow-sm"><div className="aspect-square overflow-hidden bg-[#f1f5f9]"><img src={protectedMediaUrl(item.photo_url, JSON.parse(localStorage.getItem("stuntrack_session") || "{}").token || "")} alt={`Dataset ${item.id}`} className="h-full w-full object-cover transition duration-300 hover:scale-105" /></div><div className="p-3"><span className="inline-flex rounded-full bg-[#eaf2ff] px-2 py-1 text-[10px] font-black uppercase text-[#1c5fbd]">{item.manual_label}</span><p className="mt-2 text-xs font-bold text-[#53626b]">{item.gender === "L" ? "Laki-laki" : "Perempuan"}</p><p className="mt-1 text-[11px] text-[#8a9aa6]">{formatDate(item.created_at)}</p></div></article>)}</div> : <p className="py-6 text-center text-sm text-[#8a9aa6]">Volunteer ini belum memiliki dataset.</p>}</div>}</section>}
  </div>;
}
