import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Baby, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type BabyProfile = { id: number; name: string; gender: string; birth_date: string };
type Scan = { age_months: number; weight_kg: number; head_circ_cm: number; arm_circ_cm: number; ai_result: string; created_at: string };
type Metric = "weight_kg" | "head_circ_cm" | "arm_circ_cm";
type TimeGrouping = "day" | "week" | "month";
type Session = { token?: string };
type GroupedScan = { key: string; label: string; period: number; scan: Scan };

const metrics: Record<Metric, { label: string; unit: string; max: number; ticks: number[] }> = {
  weight_kg: { label: "Berat badan", unit: "kg", max: 20, ticks: [0, 5, 10, 15, 20] },
  head_circ_cm: { label: "Lingkar kepala", unit: "cm", max: 60, ticks: [0, 15, 30, 45, 60] },
  arm_circ_cm: { label: "Lingkar lengan", unit: "cm", max: 20, ticks: [0, 5, 10, 15, 20] },
};

const chart = { width: 760, height: 380, left: 64, right: 24, top: 22, bottom: 58 };

function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function groupScans(scans: Scan[], grouping: TimeGrouping, selectedMonth: string): GroupedScan[] {
  const sorted = [...scans].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
  const firstScanTime = Date.parse(sorted[0]?.created_at || "");
  const groups = new Map<string, GroupedScan>();

  sorted.forEach((scan) => {
    const date = new Date(scan.created_at);
    if ((grouping === "day" || grouping === "week") && monthKey(scan.created_at) !== selectedMonth) return;
    const period = grouping === "day"
      ? date.getDate()
      : grouping === "week"
        ? Math.floor((date.getDate() - 1) / 7) + 1
        : (date.getFullYear() - new Date(firstScanTime).getFullYear()) * 12
          + date.getMonth() - new Date(firstScanTime).getMonth() + 1;
    const key = grouping === "month" ? `${grouping}-${period}` : `${grouping}-${selectedMonth}-${period}`;
    // If there are multiple scans in one period, keep the latest one.
    groups.set(key, { key, label: String(period), period, scan });
  });

  return Array.from(groups.values()).sort((left, right) => left.period - right.period);
}

function ChildGrowthPage() {
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as Session | null;
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [scans, setScans] = useState<Scan[]>([]);
  const [metric, setMetric] = useState<Metric>("weight_kg");
  const [grouping, setGrouping] = useState<TimeGrouping>("month");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isGroupingMenuOpen, setIsGroupingMenuOpen] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    fetch("/api/user/babies", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((response) => response.json())
      .then((data: BabyProfile[]) => {
        setBabies(data);
        if (data[0]) setSelectedId(String(data[0].id));
      });
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token || !selectedId) return;
    fetch(`/api/user/babies/${selectedId}/scans`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then((response) => response.json())
      .then((data: Scan[]) => setScans(Array.isArray(data) ? data : []));
  }, [selectedId, session?.token]);

  const availableMonths = useMemo(() => Array.from(new Set(scans.map((scan) => monthKey(scan.created_at)))).sort().reverse(), [scans]);

  useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(selectedMonth)) setSelectedMonth(availableMonths[0]);
  }, [availableMonths, selectedMonth]);

  const currentMetric = metrics[metric];
  const groupedScans = useMemo(() => groupScans(scans, grouping, selectedMonth), [grouping, scans, selectedMonth]);
  const plotBottom = chart.height - chart.bottom;
  const plotRight = chart.width - chart.right;
  const points = useMemo(() => {
    const plotWidth = chart.width - chart.left - chart.right;
    const plotHeight = chart.height - chart.top - chart.bottom;
    const latestPeriod = Math.max(...groupedScans.map((group) => group.period), 1);
    const defaultPeriodCount = grouping === "day" ? (selectedMonth ? daysInMonth(selectedMonth) : 31) : grouping === "week" ? (selectedMonth ? Math.ceil(daysInMonth(selectedMonth) / 7) : 5) : 60;
    const periodRange = Math.max(1, Math.max(defaultPeriodCount, latestPeriod) - 1);
    return groupedScans.map((group) => {
      const rawValue = Number(group.scan[metric]);
      const value = Math.max(0, Math.min(currentMetric.max, rawValue));
      return {
        ...group,
        value: rawValue,
        x: chart.left + ((group.period - 1) / periodRange) * plotWidth,
        y: chart.top + ((currentMetric.max - value) / currentMetric.max) * plotHeight,
      };
    }).filter((point) => Number.isFinite(point.value));
  }, [currentMetric.max, groupedScans, grouping, metric, selectedMonth]);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const selectedBaby = babies.find((baby) => String(baby.id) === selectedId);
  const latest = [...scans].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0];
  const labelStep = Math.max(1, Math.ceil(points.length / 10));
  const defaultAxisPeriodCount = grouping === "day" ? (selectedMonth ? daysInMonth(selectedMonth) : 31) : grouping === "week" ? (selectedMonth ? Math.ceil(daysInMonth(selectedMonth) / 7) : 5) : 60;
  const axisPeriodCount = Math.max(defaultAxisPeriodCount, ...groupedScans.map((group) => group.period));
  const chartData = points.map((point) => ({ period: point.period, value: point.value, label: point.label }));
  const chartWidth = Math.max(760, axisPeriodCount * 30);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Child Growth</p><h2 className="mt-1 text-2xl font-black text-[#303b45]">Riwayat pertumbuhan bayi</h2></div><label className="grid gap-2 text-sm font-extrabold text-[#405155]">Pilih bayi<select className="h-11 min-w-[220px] rounded-lg border border-[#cbd8df] bg-white px-3 font-bold text-[#303b45] outline-none focus:border-[#1c5fbd]" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Belum ada bayi</option>{babies.map((baby) => <option value={baby.id} key={baby.id}>{baby.name}</option>)}</select></label></div>
      {!selectedBaby ? <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-[#cbd8df] bg-white text-center text-[#8a9aa6]"><div><Baby className="mx-auto mb-3 text-[#1c5fbd]/50" size={32} /><p className="font-bold">Belum ada data bayi</p><p className="mt-1 text-sm">Simpan hasil deteksi pertama untuk mulai membentuk grafik.</p></div></div> : <><div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-[#dce6ef] bg-white p-5"><p className="text-sm font-bold text-[#71838d]">Nama bayi</p><p className="mt-2 text-xl font-black text-[#303b45]">{selectedBaby.name}</p></div><div className="rounded-xl border border-[#dce6ef] bg-white p-5"><p className="text-sm font-bold text-[#71838d]">Total scan</p><p className="mt-2 text-xl font-black text-[#1c5fbd]">{scans.length}</p></div><div className="rounded-xl border border-[#dce6ef] bg-white p-5"><p className="text-sm font-bold text-[#71838d]">Scan terakhir</p><p className="mt-2 text-xl font-black text-[#167564]">{latest ? `${latest[metric]} ${currentMetric.unit}` : "–"}</p></div></div><section className="rounded-xl border border-[#dce6ef] bg-white p-5 shadow-[0_8px_30px_rgba(35,63,90,0.06)] sm:p-7"><div className="flex flex-col justify-between gap-4 border-b border-[#edf1f5] pb-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf2ff] text-[#1c5fbd]"><LineChartIcon size={23} /></div><div><h3 className="text-xl font-black text-[#303b45]">Grafik pertumbuhan</h3><p className="text-sm text-[#71838d]">Interval data: {grouping === "day" ? "per hari" : grouping === "week" ? "per minggu" : "per bulan"} · {currentMetric.label} 0–{currentMetric.max} {currentMetric.unit}</p></div></div><div className="relative flex items-center gap-2"><div className="flex flex-wrap gap-2">{(Object.keys(metrics) as Metric[]).map((key) => <button className={`rounded-lg px-3 py-2 text-xs font-black ${metric === key ? "bg-[#1c5fbd] text-white" : "bg-[#f1f6fb] text-[#607178]"}`} type="button" onClick={() => setMetric(key)} key={key}>{metrics[key].label}</button>)}</div>{(grouping === "day" || grouping === "week") && availableMonths.length > 0 && <select className="h-9 rounded-lg border border-[#cbd8df] bg-white px-2 text-xs font-bold text-[#53626b]" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Pilih bulan grafik">{availableMonths.map((month) => <option value={month} key={month}>{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${month}-01`))}</option>)}</select>}<button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#cbd8df] text-[#53626b] hover:border-[#1c5fbd] hover:text-[#1c5fbd]" type="button" aria-label="Pilih interval grafik" aria-expanded={isGroupingMenuOpen} onClick={() => setIsGroupingMenuOpen((open) => !open)}><ArrowDownUp size={17} /></button>{isGroupingMenuOpen && <div className="absolute right-0 top-11 z-10 w-36 rounded-lg border border-[#dce6ef] bg-white p-1 shadow-[0_8px_24px_rgba(35,63,90,0.14)]"><p className="px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#8a9aa6]">Kelompokkan</p>{(["day", "week", "month"] as TimeGrouping[]).map((option) => <button className={`block w-full rounded-md px-3 py-2 text-left text-sm font-bold ${grouping === option ? "bg-[#eaf2ff] text-[#1c5fbd]" : "text-[#53626b] hover:bg-[#f5f8fc]"}`} type="button" onClick={() => { setGrouping(option); setIsGroupingMenuOpen(false); }} key={option}>{option === "day" ? "Per hari" : option === "week" ? "Per minggu" : "Per bulan"}</button>)}</div>}</div></div>{points.length ? <div className="mt-6 overflow-x-auto rounded-lg bg-white p-2"><div style={{ width: chartWidth, minWidth: "100%" }}><ResponsiveContainer width="100%" height={360}><LineChart data={chartData} margin={{ top: 20, right: 24, left: 18, bottom: 30 }}><CartesianGrid stroke="#dce6ef" /><XAxis dataKey="period" type="number" domain={[1, axisPeriodCount]} ticks={Array.from({ length: axisPeriodCount }, (_, index) => index + 1)} tick={{ fill: "#71838d", fontSize: 12 }} axisLine={{ stroke: "#9db1c0" }} tickLine={{ stroke: "#9db1c0" }} /><YAxis domain={[0, currentMetric.max]} ticks={currentMetric.ticks} tick={{ fill: "#71838d", fontSize: 13 }} axisLine={{ stroke: "#9db1c0" }} tickLine={{ stroke: "#9db1c0" }} label={{ value: `${currentMetric.label} (${currentMetric.unit})`, angle: -90, position: "insideLeft", fill: "#53626b", fontSize: 13 }} /><Tooltip formatter={(value) => [`${value} ${currentMetric.unit}`, currentMetric.label]} labelFormatter={(label) => `Periode ${label}`} /><Line type="monotone" dataKey="value" stroke="#1c5fbd" strokeWidth={2.5} dot={{ r: 5, fill: "#ffffff", stroke: "#1c5fbd", strokeWidth: 2.5 }} activeDot={{ r: 7 }} connectNulls={false} /><Brush dataKey="period" height={18} travellerWidth={10} stroke="#1c5fbd" fill="#eaf2ff" /></LineChart></ResponsiveContainer><p className="mt-2 text-center text-sm font-bold text-[#53626b]">Tanggal scan ({grouping === "day" ? "hari" : grouping === "week" ? "minggu" : "bulan"})</p></div></div> : <div className="grid h-[320px] place-items-center text-center text-[#8a9aa6]"><TrendingUp className="mx-auto mb-3 text-[#1c5fbd]/50" size={30} /><p className="font-bold">Belum ada riwayat scan untuk bayi ini.</p></div>}</section></>}
    </div>
  );
}

export default ChildGrowthPage;
