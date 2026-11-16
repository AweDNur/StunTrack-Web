import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Baby, ChevronDown, ChevronRight, Loader2, MoreHorizontal, ScanLine, Users } from "lucide-react";
import { apiUrl } from "../../lib/api";

interface ScanRecord {
  id: number;
  age_months: number | null;
  weight_kg: number | null;
  head_circ_cm: number | null;
  arm_circ_cm: number | null;
  ai_result: string | null;
  is_stunting: boolean;
  created_at: string;
}

interface ChildRecord {
  id: number;
  name: string;
  gender: "L" | "P" | null;
  birth_date: string;
  scans: ScanRecord[];
}

interface ParentRecord {
  id: number;
  name: string;
  email: string;
  children: ChildRecord[];
}

interface ParentsResponse {
  summary: { parents: number; stunting: number; not_stunting: number };
  parents: ParentRecord[];
}

function parseAiResult(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatMetric(value: unknown, suffix = "%") {
  if (typeof value !== "number" && typeof value !== "string") return "–";
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}${suffix}` : "–";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminParentsPage() {
  const [result, setResult] = useState<ParentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());
  const [expandedScans, setExpandedScans] = useState<Set<number>>(new Set());
  const [selectedChildren, setSelectedChildren] = useState<Record<number, number>>({});

  useEffect(() => {
    async function loadParents() {
      try {
        const session = JSON.parse(localStorage.getItem("stuntrack_session") || "{}");
        const response = await fetch(apiUrl("/api/admin/parents"), {
          headers: { Authorization: `Bearer ${session.token}` },
          cache: "no-store",
        });
        const data = (await response.json()) as ParentsResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "Gagal mengambil data orang tua.");
        setResult(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data orang tua.");
      } finally {
        setLoading(false);
      }
    }
    void loadParents();
  }, []);

  const cards = useMemo(() => [
    ["Akun Orang Tua", result?.summary.parents ?? "–", Users, "text-[#1c5fbd]", "bg-[#eaf2ff]"],
    ["Hasil Stunting", result?.summary.stunting ?? "–", ScanLine, "text-[#b43f30]", "bg-[#fff1ee]"],
    ["Hasil Tidak Stunting", result?.summary.not_stunting ?? "–", Baby, "text-[#167564]", "bg-[#e9f8f3]"],
  ] as const, [result]);

  function toggleParent(parentId: number) {
    setExpandedParents((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId); else next.add(parentId);
      return next;
    });
  }

  function toggleScan(scanId: number) {
    setExpandedScans((current) => {
      const next = new Set(current);
      if (next.has(scanId)) next.delete(scanId); else next.add(scanId);
      return next;
    });
  }

  function selectChild(parentId: number, childId: number) {
    setSelectedChildren((current) => ({ ...current, [parentId]: childId }));
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1c5fbd]" size={32} /></div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700"><AlertCircle className="mx-auto mb-2" size={32} /><p className="font-bold">Terjadi Kesalahan</p><p className="text-sm">{error}</p></div>;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-7">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Data Orang Tua</p>
        <h2 className="mt-1 text-2xl font-black text-[#303b45]">Akun orang tua dan histori scan</h2>
        <p className="mt-1 text-sm text-[#71838d]">Lihat ringkasan hasil deteksi dan riwayat scan setiap akun orang tua.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value, Icon, iconColor, iconBg]) => (
          <div key={label} className="rounded-xl border border-[#dce6ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-bold text-[#71838d]">{label}</p><p className="mt-2 text-3xl font-black text-[#1c5fbd]">{value}</p></div>
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${iconBg} ${iconColor}`}><Icon size={21} /></div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#dce6ef] bg-white shadow-sm">
        <div className="border-b border-[#edf1f5] px-5 py-4 sm:px-6"><h3 className="font-black text-[#303b45]">Daftar akun orang tua</h3><p className="mt-1 text-sm text-[#71838d]">Klik panah untuk membuka histori scan harian.</p></div>
        <div className="divide-y divide-[#edf1f5]">
          {(result?.parents || []).map((parent) => {
            const scans = parent.children.flatMap((child) => child.scans.map((scan) => ({ ...scan, babyName: child.name })));
            const sortedChildren = [...parent.children].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
            const selectedChildId = selectedChildren[parent.id] ?? sortedChildren[0]?.id;
            const selectedChild = sortedChildren.find((child) => child.id === selectedChildId);
            const selectedScans = [...(selectedChild?.scans || [])].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
            const isExpanded = expandedParents.has(parent.id);
            return (
              <div key={parent.id}>
                <button type="button" onClick={() => toggleParent(parent.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#f8fbff] sm:px-6">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[#1c5fbd]">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-black text-[#303b45]">{parent.name}</span><span className="block truncate text-xs text-[#71838d]">{parent.email}</span></span>
                  <span className="hidden text-xs font-bold text-[#71838d] sm:block">{parent.children.length} bayi · {scans.length} scan</span>
                </button>
                {isExpanded && (
                  <div className="max-h-[520px] overflow-y-auto border-t border-[#edf1f5] bg-[#f8fbff] px-5 py-4 sm:px-16">
                    {sortedChildren.length > 0 && <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><label className="text-sm font-black text-[#405155]" htmlFor={`child-${parent.id}`}>Pilih bayi</label><select id={`child-${parent.id}`} value={selectedChildId ?? ""} onChange={(event) => selectChild(parent.id, Number(event.target.value))} className="h-10 rounded-lg border border-[#cbd8df] bg-white px-3 text-sm font-bold text-[#303b45] outline-none focus:border-[#1c5fbd]">{sortedChildren.map((child) => <option value={child.id} key={child.id}>{child.name}</option>)}</select></div>}
                    {sortedChildren.length === 0 ? <p className="rounded-lg border border-dashed border-[#cbd8df] bg-white p-5 text-center text-sm text-[#8a9aa6]">Belum ada bayi atau histori scan.</p> : selectedScans.length === 0 ? <p className="rounded-lg border border-dashed border-[#cbd8df] bg-white p-5 text-center text-sm text-[#8a9aa6]">{selectedChild?.name} belum memiliki histori scan.</p> : (
                      <div className="space-y-3">
                        {selectedScans.map((scan, index) => {
                          const ai = parseAiResult(scan.ai_result);
                          const detailOpen = expandedScans.has(scan.id);
                          return (
                            <div key={scan.id}>
                              {index === 0 && <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0"><Baby size={16} className="text-[#1c5fbd]" /><p className="text-sm font-black text-[#303b45]">{selectedChild?.name}</p><span className="text-xs font-semibold text-[#8a9aa6]">histori scan</span></div>}
                              <div className="rounded-xl border border-[#dce6ef] bg-white shadow-sm">
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${scan.is_stunting ? "bg-[#fff1ee] text-[#b43f30]" : "bg-[#e9f8f3] text-[#167564]"}`}>{scan.is_stunting ? ":(" : ":)"}</div>
                                <div className="min-w-0 flex-1"><p className="font-black text-[#303b45]">{selectedChild?.name}</p><p className="text-xs text-[#71838d]">{formatDate(scan.created_at)} · usia {scan.age_months ?? "–"} bulan</p></div>
                                <span className={`hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${scan.is_stunting ? "bg-[#fff1ee] text-[#b43f30]" : "bg-[#e9f8f3] text-[#167564]"}`}>{scan.is_stunting ? "Stunting" : "Tidak Stunting"}</span>
                                <button type="button" onClick={() => toggleScan(scan.id)} className={`grid h-9 w-9 place-items-center rounded-lg transition ${detailOpen ? "bg-[#eaf2ff] text-[#1c5fbd]" : "text-[#71838d] hover:bg-[#f1f6fb] hover:text-[#1c5fbd]"}`} aria-label="Lihat detail scan"><MoreHorizontal size={20} /></button>
                              </div>
                              {detailOpen && <div className="border-t border-[#edf1f5] px-4 py-4"><div className="grid gap-3 sm:grid-cols-4"><div><p className="text-xs font-bold text-[#8a9aa6]">Berat badan</p><p className="mt-1 font-black text-[#303b45]">{scan.weight_kg ?? "–"} kg</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Lingkar kepala</p><p className="mt-1 font-black text-[#303b45]">{scan.head_circ_cm ?? "–"} cm</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">LiLA</p><p className="mt-1 font-black text-[#303b45]">{scan.arm_circ_cm ?? "–"} cm</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Status</p><p className={`mt-1 font-black ${scan.is_stunting ? "text-[#b43f30]" : "text-[#167564]"}`}>{scan.is_stunting ? "Stunting" : "Tidak Stunting"}</p></div></div>{ai && <div className="mt-4 grid gap-3 rounded-lg bg-[#f5f8fc] p-3 sm:grid-cols-3"><div><p className="text-xs font-bold text-[#8a9aa6]">Confidence</p><p className="mt-1 font-black text-[#303b45]">{formatMetric(ai.confidence)}</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Probabilitas stunting</p><p className="mt-1 font-black text-[#303b45]">{formatMetric(ai.proba_stunting ?? ai.stunting_probability ?? ai.stuntingProbability)}</p></div><div><p className="text-xs font-bold text-[#8a9aa6]">Probabilitas tidak stunting</p><p className="mt-1 font-black text-[#303b45]">{formatMetric(ai.proba_tidak_stunting ?? ai.non_stunting_probability ?? ai.nonStuntingProbability ?? ai.normal_probability)}</p></div></div>}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!result?.parents.length && <p className="p-8 text-center text-sm text-[#8a9aa6]">Belum ada akun dengan role orang_tua.</p>}
        </div>
      </section>
    </div>
  );
}
