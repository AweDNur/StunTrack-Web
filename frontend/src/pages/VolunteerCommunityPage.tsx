import { useEffect, useState } from "react";
import { Crown, Loader2, Medal, Trophy, Users } from "lucide-react";
import { apiUrl } from "../lib/api";

type Leader = { rank: number; id: number; name: string; contribution_count: number };
type LeaderboardResponse = { leaderboard: Leader[]; current_rank: number | null; current_contribution_count: number };

export default function VolunteerCommunityPage() {
  const [data, setData] = useState<LeaderboardResponse>({ leaderboard: [], current_rank: null, current_contribution_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
    fetch(apiUrl("/api/volunteer/leaderboard"), { headers: { Authorization: `Bearer ${session.token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || "Gagal mengambil leaderboard.");
        setData(result);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Gagal memuat leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={30} /></div>;

  return <div className="mx-auto w-full max-w-[1000px]">
    <div className="mb-7"><p className="text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Community</p><h2 className="mt-1 text-2xl font-black text-[#303b45]">Leaderboard kontribusi volunteer</h2><p className="mt-1 text-sm text-[#71838d]">Lihat kontribusi komunitas dan posisi Anda berdasarkan jumlah dataset yang dikirim.</p></div>
    {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <section className="mb-5 rounded-xl border border-[#dce6ef] bg-gradient-to-r from-[#1c5fbd] to-[#3478d2] p-6 text-white shadow-[0_10px_30px_rgba(28,95,189,0.2)]"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-white/15"><Trophy size={28} /></div><div><p className="text-sm font-bold text-blue-100">Posisi Anda saat ini</p><p className="mt-1 text-3xl font-black">{data.current_rank ? `#${data.current_rank}` : "Belum masuk peringkat"}</p><p className="mt-1 text-sm text-blue-100">{data.current_contribution_count} dataset dikontribusikan</p></div></div></section>
    <section className="overflow-hidden rounded-xl border border-[#dce6ef] bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-[#edf1f5] px-6 py-5"><Users className="text-[#1c5fbd]" size={22} /><div><h3 className="font-black text-[#303b45]">Peringkat volunteer</h3><p className="mt-1 text-sm text-[#71838d]">Diurutkan berdasarkan jumlah dataset terbanyak.</p></div></div><div className="divide-y divide-[#edf1f5]">{data.leaderboard.map((item) => { const isCurrent = item.rank === data.current_rank; const RankIcon = item.rank === 1 ? Crown : item.rank <= 3 ? Medal : null; return <div key={item.id} className={`flex items-center gap-4 px-6 py-4 ${isCurrent ? "bg-[#eaf2ff]" : "bg-white"}`}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${item.rank === 1 ? "bg-[#fff0b8] text-[#9a7100]" : item.rank === 2 ? "bg-[#edf1f5] text-[#647482]" : item.rank === 3 ? "bg-[#f8dfc5] text-[#9a5f25]" : "bg-[#f5f8fc] text-[#607178]"}`}>{RankIcon ? <RankIcon size={18} /> : item.rank}</div><div className="min-w-0 flex-1"><p className="truncate font-black text-[#303b45]">{item.name}{isCurrent && <span className="ml-2 rounded-full bg-[#1c5fbd] px-2 py-1 text-[10px] font-black uppercase text-white">Anda</span>}</p><p className="mt-1 text-xs font-semibold text-[#8a9aa6]">Volunteer</p></div><div className="text-right"><p className="font-black text-[#1c5fbd]">{item.contribution_count}</p><p className="text-xs font-semibold text-[#8a9aa6]">dataset</p></div></div>; })}{!data.leaderboard.length && <div className="px-6 py-12 text-center text-sm text-[#8a9aa6]">Belum ada data kontribusi volunteer.</div>}</div></section>
  </div>;
}
