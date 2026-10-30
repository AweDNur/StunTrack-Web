import { useEffect, useState } from "react";
import { Baby, ChevronRight, ClipboardPlus, Frown, Smile, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type BabyProfile = { id: number; name: string; gender: string; birth_date: string };
type Scan = { ai_result: unknown; created_at: string; age_months: number; weight_kg?: number; head_circ_cm?: number; arm_circ_cm?: number };
type Session = { token?: string };
type AiResult = { prediction?: string; is_stunting?: boolean; confidence?: number; proba_stunting?: number; proba_tidak_stunting?: number };

function parseAiResult(value: unknown): AiResult {
  if (!value) return {};
  if (typeof value === "object") return value as AiResult;

  const text = String(value).trim();
  const candidates = [
    text,
    text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x20;/g, " "),
    text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim(),
  ];

  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as AiResult; } catch { /* Try the next representation. */ }
  }

  const prediction = text.match(/"?prediction"?\s*:\s*"([^"]+)"/i)?.[1];
  const isStunting = text.match(/"?is_stunting"?\s*:\s*(true|false)/i)?.[1];
  return { prediction: prediction || text, is_stunting: isStunting ? isStunting.toLowerCase() === "true" : text.toLowerCase() === "stunting" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

function OverviewPage() {
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as Session | null;
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [latest, setLatest] = useState<{ baby: BabyProfile; scan: Scan } | null>(null);
  const [latestScans, setLatestScans] = useState<{ baby: BabyProfile; scan: Scan }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    const headers = { Authorization: `Bearer ${session.token}` };
    fetch("/api/user/babies", { headers })
      .then((response) => response.json())
      .then(async (profiles: BabyProfile[]) => {
        setBabies(profiles);
        const scans = await Promise.all(profiles.map(async (baby) => {
          const response = await fetch(`/api/user/babies/${baby.id}/scans`, { headers });
          const data = (await response.json().catch(() => [])) as Scan[];
          const latestScan = [...data].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0];
          return latestScan ? { baby, scan: latestScan } : null;
        }));
        const withScans = scans.filter((item): item is { baby: BabyProfile; scan: Scan } => item !== null);
        setLatestScans([...withScans].sort((left, right) => left.baby.name.localeCompare(right.baby.name)));
        setLatest([...withScans].sort((left, right) => Date.parse(right.scan.created_at) - Date.parse(left.scan.created_at))[0] || null);
      })
      .finally(() => setIsLoading(false));
  }, [session?.token]);

  const result = parseAiResult(latest?.scan.ai_result);
  const isConcern = result.is_stunting === true || result.prediction?.toLowerCase() === "stunting";
  const resultLabel = result.prediction || (isConcern ? "Stunting" : "Tidak stunting");

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-7"><p className="text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Overview</p><h2 className="mt-1 text-2xl font-black text-[#303b45]">Ringkasan pertumbuhan keluarga</h2></div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-[#71838d]">Total bayi terdaftar</p><p className="mt-2 text-4xl font-black text-[#1c5fbd]">{isLoading ? "–" : babies.length}</p></div><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#eaf2ff] text-[#1c5fbd]"><Baby size={24} /></div></div></div>
        <div className="rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]"><p className="text-sm font-bold text-[#71838d]">Scan terbaru</p>{latest ? <div className="mt-4 flex items-start gap-4"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${isConcern ? "bg-[#fff1ee] text-[#b43f30]" : "bg-[#effaf7] text-[#168679]"}`}>{isConcern ? <Frown size={28} /> : <Smile size={28} />}</div><div className="min-w-0"><p className="text-xl font-black text-[#303b45]">{latest.baby.name}</p><p className={`mt-1 font-black ${isConcern ? "text-[#a43b2c]" : "text-[#167564]"}`}>{resultLabel}</p><p className="mt-1 text-xs font-semibold text-[#8a9aa6]">{formatDate(latest.scan.created_at)} · usia {latest.scan.age_months} bulan</p></div></div> : <p className="mt-3 text-[#8a9aa6]">Belum ada hasil scan</p>}</div>
      </div>
      {latest && <div className="mt-5 rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]"><div className="flex items-center justify-between gap-4"><div><p className="font-black text-[#303b45]">Detail hasil AI</p><p className="mt-1 text-sm text-[#71838d]">{latest.baby.name}</p></div><div className={`rounded-full px-3 py-1 text-xs font-black ${isConcern ? "bg-[#fff1ee] text-[#a43b2c]" : "bg-[#effaf7] text-[#167564]"}`}>{isConcern ? "Perlu diperhatikan" : "Tidak terindikasi"}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f5f8fc] p-4"><p className="text-xs font-bold text-[#71838d]">Confidence</p><p className="mt-1 text-lg font-black text-[#303b45]">{result.confidence ?? "–"}%</p></div><div className="rounded-lg bg-[#f5f8fc] p-4"><p className="text-xs font-bold text-[#71838d]">Probabilitas stunting</p><p className="mt-1 text-lg font-black text-[#303b45]">{result.proba_stunting ?? "–"}%</p></div><div className="rounded-lg bg-[#f5f8fc] p-4"><p className="text-xs font-bold text-[#71838d]">Probabilitas tidak stunting</p><p className="mt-1 text-lg font-black text-[#303b45]">{result.proba_tidak_stunting ?? "–"}%</p></div></div></div>}
{latestScans.length > 0 && <section className="mt-5 rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]"><div className="flex items-center justify-between"><div><p className="font-black text-[#303b45]">Informasi Anak</p><p className="mt-1 text-sm text-[#71838d]">Ringkasan data terbaru setiap anak</p></div><Baby className="text-[#1c5fbd]" size={22} /></div><div style={latestScans.length > 4 ? { height: 428, overflowY: "auto", gridAutoRows: "204px" } : undefined} className={`${latestScans.length > 4 ? "h-[860px] md:h-[440px] overflow-y-auto pr-2" : ""} mt-4 grid gap-4 md:grid-cols-2`}>{latestScans.map(({ baby, scan }) => <article className="rounded-xl border border-[#e4ebf1] bg-[#fbfdff] p-4" key={baby.id}><div className="flex items-center justify-between gap-3"><div><p className="text-lg font-black text-[#303b45]">{baby.name}</p><p className="text-xs font-bold text-[#71838d]">{baby.gender || "Jenis kelamin belum diisi"} · scan {formatDate(scan.created_at)}</p></div><div className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#1c5fbd]">Data terbaru</div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs font-bold text-[#8a9aa6]">Usia</p><p className="mt-1 font-black text-[#303b45]">{scan.age_months ?? "–"} bulan</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Berat badan</p><p className="mt-1 font-black text-[#303b45]">{scan.weight_kg ?? "–"} kg</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Lingkar kepala</p><p className="mt-1 font-black text-[#303b45]">{scan.head_circ_cm ?? "–"} cm</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">LiLA</p><p className="mt-1 font-black text-[#303b45]">{scan.arm_circ_cm ?? "–"} cm</p></div></div></article>)}</div></section>}      <div className="mt-6 rounded-xl border border-[#dce6ef] bg-white p-6 shadow-[0_8px_30px_rgba(35,63,90,0.06)]"><p className="font-black text-[#303b45]">Aksi cepat</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link className="flex items-center justify-between rounded-lg bg-[#1c5fbd] px-4 py-3 font-black text-white hover:bg-[#174f9d]" to="/dashboard/orang_tua/detection"><span className="inline-flex items-center gap-2"><Sparkles size={18} />Mulai deteksi baru</span><ChevronRight size={18} /></Link><Link className="flex items-center justify-between rounded-lg border border-[#cbd8df] px-4 py-3 font-black text-[#405155] hover:border-[#1c5fbd] hover:text-[#1c5fbd]" to="/dashboard/orang_tua/growth"><span className="inline-flex items-center gap-2"><ClipboardPlus size={18} />Lihat Child Growth</span><ChevronRight size={18} /></Link></div></div>
    </div>
  );
}

export default OverviewPage;
