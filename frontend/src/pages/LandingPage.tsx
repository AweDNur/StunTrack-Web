import { type CSSProperties, useState, useEffect } from "react";
import {
  Activity,
  Apple,
  HeartPulse,
  LogIn,
  TrendingDown,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { apiUrl } from "../lib/api";

import logo from "../assets/logo-stuntrack.png";

import GambarHasilStunting from "../assets/hasilstunting.png";
import GambarHasilNormal from "../assets/hasilnormal.png";
import GambarGrafikPertumbuhan from "../assets/grafikpertumbuhan.png";

const indonesiaBounds: [[number, number], [number, number]] = [[-11.5, 94], [6.5, 141.5]];
const mapCenter: [number, number] = [-2.5, 118];

function IndonesiaMapView() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(indonesiaBounds);
    map.setMinZoom(4);
    map.setMaxZoom(14);
  }, [map]);
  return null;
}

type MapPoint = { region_code: string; region_name: string; city_code: string; city_name: string; province_name: string; total: number; latitude: number | null; longitude: number | null };

const provinceCenters: Record<string, [number, number]> = {
  "11": [4.2, 96.8], "12": [2.3, 99.5], "13": [-0.7, 100.6], "14": [0.5, 101.7], "15": [-1.6, 103.6], "16": [-3.2, 104.5], "17": [-3.8, 102.3], "18": [-5.1, 105.3], "19": [-2.2, 106.1], "21": [0.7, 104.4],
  "31": [-6.2, 106.8], "32": [-6.9, 107.6], "33": [-7.3, 110.1], "34": [-7.9, 110.4], "35": [-7.8, 112.7], "36": [-6.4, 106.1], "51": [-8.4, 115.1], "52": [-8.6, 117.4], "53": [-9.7, 119.2], "61": [0.1, 109.5], "62": [-1.7, 113.4], "63": [-3.0, 115.4], "64": [0.6, 116.5], "65": [2.1, 117.0], "71": [0.7, 124.0], "72": [-1.4, 121.4], "73": [-3.7, 119.4], "74": [-4.0, 122.0], "75": [0.7, 122.4], "76": [-2.5, 119.0], "81": [-3.1, 129.2], "82": [1.4, 128.2], "91": [-4.3, 138.7], "92": [-0.9, 134.0],
};

const cityCenters: Record<string, [number, number]> = {
  "3171": [-6.2, 106.82], "3172": [-6.23, 106.9], "3173": [-6.16, 106.75], "3174": [-6.3, 106.85], "3175": [-6.35, 106.8],
  "3273": [-6.9175, 107.6191], "3276": [-6.2383, 106.9756], "3277": [-6.4025, 106.7942], "3278": [-6.595, 106.8167],
  "3374": [-7.0051, 110.4381], "3471": [-7.7956, 110.3695], "3578": [-7.2575, 112.7521], "3573": [-7.9797, 112.6304], "3579": [-7.8167, 112.0111],
  "5171": [-8.65, 115.2167], "5271": [-8.5833, 116.1167], "7371": [-5.1477, 119.4327], "6471": [-0.5022, 117.1536], "7171": [1.4748, 124.8421],
};

type MetricKey = "stunting" | "nutrition";

const chartSeries = {
  stunting: {
    label: "Stunting",
    description: "Anak usia di bawah 5 tahun dengan tinggi badan menurut usia di bawah standar pertumbuhan yang diharapkan.",
    color: "#1c5fbd",
    softColor: "#fff0ec",
    source: "Laporan prevalensi publik SSGBI / SSGI / SKI",
    sources: [
      { label: "Kemenkes/BKPK – Tren stunting 2013–2023", href: "https://www.badankebijakan.kemkes.go.id/repositori/id/eprint/5535/1/06%20factsheet%20Gizi%20SKI_bahasa.pdf" },
      { label: "SSGI 2024", href: "https://www.kemkes.go.id/id/ssgi-2024-prevalensi-stunting-nasional-turun-menjadi-198" },
    ],
    values: [
      { year: "2019", value: 27.7 },
      { year: "2021", value: 24.4 },
      { year: "2022", value: 21.6 },
      { year: "2023", value: 21.5 },
      { year: "2024", value: 19.8 },
    ],
  },
  nutrition: {
    label: "Kurang Gizi",
    description: "Prevalensi wasting atau kekurangan gizi akut pada anak usia di bawah 5 tahun.",
    color: "#3B75C8",
    softColor: "#eaf8f5",
    source: "Laporan prevalensi publik SSGI / SKI",
    sources: [
      { label: "Profil Kesehatan Indonesia 2022", href: "https://www.kemkes.go.id/app_asset/file_content_download/1702958336658115008345c5.53299420.pdf" },
      { label: "Hasil Utama SKI 2023", href: "https://www.badankebijakan.kemkes.go.id/daftar-frequently-asked-question-seputar-hasil-utama-ski-2023/hasil-utama-ski-2023/" },
      { label: "SSGI 2024", href: "https://www.kemkes.go.id/id/ssgi-2024-prevalensi-stunting-nasional-turun-menjadi-198" },
    ],
    values: [
      { year: "2019", value: 7.4 },
      { year: "2021", value: 7.1 },
      { year: "2022", value: 7.7 },
      { year: "2023", value: 8.5 },
      { year: "2024", value: 7.4 },
    ],
  },
} as const;

const primaryActionClass =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#c7d9f5] bg-white px-4 text-[1.05rem] font-extrabold leading-none text-[#1c5fbd] shadow-[0_2px_0_#b8cdef] transition hover:text-[#164a96]";

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="mb-[7px] text-[0.82rem] font-extrabold uppercase tracking-normal text-[#557078]">
      {children}
    </p>
  );
}

function GrowthChart() {
  const [metric, setMetric] = useState<MetricKey>("stunting");
  const activeSeries = chartSeries[metric];
  const values = activeSeries.values;
  const width = 760;
  const height = 310;
  const padding = { top: 28, right: 38, bottom: 52, left: 58 };
  const maxValue = 32;
  const minValue = 0;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = values.map((item, index) => {
    const x = padding.left + (index / (values.length - 1)) * chartWidth;
    const y = padding.top + ((maxValue - item.value) / (maxValue - minValue)) * chartHeight;

    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const delta = Number((latest.value - previous.value).toFixed(1));

  return (
    <section
      className="grid gap-8 border-y border-[#ede4dc] bg-[#f7fbf8] px-6 py-8 md:px-12 md:py-10 lg:grid-cols-[minmax(260px,0.48fr)_minmax(0,1fr)]"
      aria-labelledby="chart-title"
      style={{ "--series": activeSeries.color, "--series-soft": activeSeries.softColor } as CSSProperties}
    >
      <div className="self-center">
        <Eyebrow>Gambaran Indonesia</Eyebrow>
        <h2 id="chart-title" className="font-serif text-[1.58rem] font-bold uppercase text-[#303b45]">
          Tren risiko pertumbuhan anak
        </h2>
        <p className="mt-4 leading-relaxed text-[#53626b]">
          Pilih antara prevalensi stunting nasional dan kekurangan gizi akut untuk membandingkan
          perubahan indikator pertumbuhan anak dari tahun ke tahun.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5" aria-label="Pilih indikator grafik">
          {(Object.keys(chartSeries) as MetricKey[]).map((key) => {
            const item = chartSeries[key];
            const isActive = metric === key;

            return (
              <button
                aria-pressed={isActive}
                className={`min-h-[42px] cursor-pointer rounded-lg border px-4 font-black shadow-[0_2px_0_#d0d8d6] transition ${isActive
                  ? "border-[var(--series)] bg-[var(--series)] text-white shadow-[0_2px_0_#d0d8d6]"
                  : "border-[#bdcac8] bg-white text-[#405155] hover:border-[var(--series)]"
                  }`}
                key={key}
                onClick={() => setMetric(key)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-[22px] grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#e0e8e5] bg-white p-[15px]">
            <span className="block text-[0.82rem] font-extrabold text-[#708085]">Terbaru</span>
            <strong className="my-1 block text-[1.8rem] leading-none text-[var(--series)]">{latest.value}%</strong>
            <small className="block text-[0.82rem] font-extrabold text-[#708085]">{latest.year}</small>
          </div>
          <div className="rounded-lg border border-[#e0e8e5] bg-white p-[15px]">
            <span className="block text-[0.82rem] font-extrabold text-[#708085]">Perubahan tahunan</span>
            <strong className="my-1 block text-[1.8rem] leading-none text-[var(--series)]">
              {delta > 0 ? "+" : ""}
              {delta}%
            </strong>
            <small className="block text-[0.82rem] font-extrabold text-[#708085]">dibanding {previous.year}</small>
          </div>
        </div>
      </div>

      <div key={metric} className="metric-chart-flip min-w-0 rounded-lg border border-[#d7e3de] bg-[linear-gradient(180deg,var(--series-soft),#ffffff_46%)] p-4 shadow-[0_15px_34px_rgba(45,68,67,0.1)] sm:p-[22px_22px_16px]">
        <div className="flex w-full flex-col gap-[18px] text-[var(--series)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[1.1rem] font-black text-[#263744]">{activeSeries.label}</span>
            <p className="mt-1.5 leading-snug text-[#607178]">{activeSeries.description}</p>
          </div>
          <TrendingDown size={26} className="shrink-0" />
        </div>

        <svg
          className="mt-2 h-auto w-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Grafik garis prevalensi ${activeSeries.label} di Indonesia`}
        >
          {[0, 8, 16, 24, 32].map((tick) => {
            const y = padding.top + ((maxValue - tick) / (maxValue - minValue)) * chartHeight;

            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-[#dde6e3]" />
                <text
                  x={padding.left - 14}
                  y={y + 5}
                  className="fill-[#728186] text-[13px] font-extrabold"
                  textAnchor="end"
                >
                  {tick}%
                </text>
              </g>
            );
          })}
          <path className="fill-[var(--series)] opacity-10" d={areaPath} />
          <path
            className="fill-none stroke-[var(--series)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:6]"
            d={path}
          />
          {points.map((point) => (
            <g key={point.year}>
              <circle
                cx={point.x}
                cy={point.y}
                r="7"
                className="fill-white stroke-[var(--series)] [stroke-width:5]"
              />
              <text
                x={point.x}
                y={point.y - 14}
                className="fill-[#263744] text-[15px] font-extrabold"
                textAnchor="middle"
              >
                {point.value}%
              </text>
              <text
                x={point.x}
                y={height - 18}
                className="fill-[#53626b] text-sm font-extrabold"
                textAnchor="middle"
              >
                {point.year}
              </text>
            </g>
          ))}
        </svg>

        <p className="m-0 text-[0.83rem] leading-snug text-[#78868a]">
          Catatan data: {activeSeries.source}. Prevalensi nasional bukan diagnosis individu.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.83rem] leading-snug text-[#78868a]">
          <span className="font-black text-[#53626b]">Sumber:</span>
          {activeSeries.sources.map((source, index) => <span key={source.href}>{index > 0 && <span className="mr-2">·</span>}<a className="font-bold text-[#1c5fbd] underline decoration-[#9db9e8] underline-offset-2 hover:text-[#164a96]" href={source.href} target="_blank" rel="noreferrer">{source.label}</a></span>)}
        </div>
      </div>
    </section>
  );
}

function BrandLogo() {
  return (
    <a className="inline-flex items-center gap-3 text-[#1c5fbd]" href="/" aria-label="StunTrack home">
      <img className="h-[50px] w-[50px] shrink-0 object-contain" src={logo} alt="" />
      <span className="grid gap-0.5 leading-none">
        <strong className="text-[1.28rem] font-black text-[#1d61bc]">StunTrack</strong>
        <small className="text-xs font-extrabold uppercase text-[#657b86]">Baby growth monitor</small>
      </span>
    </a>
  );
}

function HeroVisual() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleSlides, setVisibleSlides] = useState(1);

  const slides = [
    {
      image: GambarHasilStunting,
      alt: "Gambar Hasil Scan Stunting",
    },
    {
      image: GambarHasilNormal,
      alt: "Gambar Hasil Scan Normal",
    },
    {
      image: GambarGrafikPertumbuhan,
      alt: "Gambar Grafik Pertumbuhan",
    },
    {
      image: GambarHasilStunting,
      alt: "Gambar Hasil Scan Stunting 2",
    },
    {
      image: GambarHasilNormal,
      alt: "Gambar Hasil Scan Normal 2",
    },
    {
      image: GambarGrafikPertumbuhan,
      alt: "Gambar Grafik Pertumbuhan 2",
    },
  ];

  const slideCount = Math.max(1, Math.floor(slides.length - visibleSlides + 1));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % slideCount);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [slideCount]);

  useEffect(() => {
    function updateVisibleSlides() {
      setVisibleSlides(window.innerWidth >= 1024 ? 2.25 : window.innerWidth >= 640 ? 1.55 : 1);
      setCurrentSlide(0);
    }
    updateVisibleSlides();
    window.addEventListener("resize", updateVisibleSlides);
    return () => window.removeEventListener("resize", updateVisibleSlides);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[#c9ddd8] bg-[#dff2ed] p-3 sm:p-5"
      aria-label="Baby growth and nutrition image slider"
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{
          width: `${(slides.length / visibleSlides) * 100}%`,
          transform: `translateX(-${currentSlide * (100 / slides.length)}%)`,
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.alt}
            className="relative aspect-[5/4] shrink-0 px-1"
            style={{ width: `${100 / slides.length}%` }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              className={`h-full w-full rounded-lg border border-[#c9ddd8] bg-white object-contain p-2 shadow-sm`}
            />

            {/* Soft overlay to match the StunTrack design */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-[#173f3d]/20" />
          </div>
        ))}
      </div>

      <div className="absolute right-1 top-1 z-10 flex items-center gap-1.5 rounded-full border border-[#ecd481] bg-[#fff8df]/95 px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-[#866313] shadow-[0_10px_24px_rgba(36,49,58,0.1)] sm:right-3 sm:top-3 sm:text-xs">
        <Apple size={15} />
        Preview Aplikasi
      </div>

      <div
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 sm:bottom-6 sm:right-6"
        aria-label="Slide indicators"
      >
        {Array.from({ length: slideCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentSlide(index)}
            aria-label={`Show slide group ${index + 1}`}
            aria-pressed={currentSlide === index}
            className={`h-2.5 rounded-full border border-white/80 transition-all duration-300 ${currentSlide === index
              ? "w-7 bg-[#168679]"
              : "w-2.5 bg-white/80 hover:bg-white"
              }`}
          />
        ))}
      </div>
    </div>
  );
}

function IndonesiaMap() {
  const [points, setPoints] = useState<MapPoint[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/public/map-summary"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((data: MapPoint[]) => setPoints(Array.isArray(data) ? data : []))
      .catch(() => setPoints([]));
  }, []);

  function pointPosition(point: MapPoint): [number, number] {
    if (point.latitude !== null && point.longitude !== null) return [point.latitude, point.longitude];
    if (cityCenters[point.city_code]) return cityCenters[point.city_code];
    const provinceCode = point.region_code.slice(0, 2);
    return provinceCenters[provinceCode] || mapCenter;
  }

  function countIcon(total: number) {
    const size = total > 99 ? 48 : total > 9 ? 42 : 36;
    return L.divIcon({ className: "stuntrack-count-marker", html: `<span>${total}</span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  return <section className="border-t border-[#ede4dc] bg-[#f7fbf8] px-6 py-8 md:px-12 md:py-10" aria-labelledby="map-title">
    <div className="mb-5 text-center"><Eyebrow>Community Coverage</Eyebrow><h2 id="map-title" className="font-serif text-[1.58rem] font-bold uppercase text-[#303b45]">StunTrack di Indonesia</h2><p className="mx-auto mt-2 max-w-2xl text-[#607178]">Pinpoint menunjukkan jumlah dataset berdasarkan wilayah yang dipilih volunteer.</p></div>
    <div className="overflow-hidden rounded-xl border border-[#c9ddd8] bg-white p-2 shadow-[0_15px_34px_rgba(45,68,67,0.1)]"><MapContainer center={mapCenter} zoom={4} minZoom={4} maxZoom={14} maxBounds={indonesiaBounds} maxBoundsViscosity={1} scrollWheelZoom className="h-[360px] w-full rounded-lg sm:h-[460px]"><IndonesiaMapView /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{points.map((point) => <Marker key={point.region_code} position={pointPosition(point)} icon={countIcon(point.total)}><Popup><strong>{point.region_name}</strong><br />{point.city_name}<br />{point.province_name}<br /><b>{point.total}</b> dataset</Popup></Marker>)}</MapContainer></div>
    <p className="mt-3 text-center text-xs text-[#78868a]">Lokasi marker dibuat sebagai perkiraan wilayah untuk menjaga privasi.</p>
  </section>;
}

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f3efea] bg-[linear-gradient(135deg,rgba(18,132,122,0.12),transparent_34%),linear-gradient(315deg,rgba(219,94,68,0.13),transparent_31%)] px-3 py-3 text-[#24313a] sm:px-5 sm:py-7 sm:pb-14">
      <section
        className="mx-auto w-full max-w-[1138px] overflow-hidden rounded-lg border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_18px_60px_rgba(70,53,39,0.13)]"
        aria-labelledby="hero-title"
      >
        <nav
          className="flex flex-col items-start justify-between gap-5 border-b border-[#e7dfd7] bg-white/75 px-5 py-4 md:flex-row md:items-center md:px-7"
          aria-label="Site"
        >
          <BrandLogo />
          <div className="inline-flex flex-wrap justify-end gap-x-[22px] gap-y-2.5">
            <Link className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" to="/labels">
              Label
            </Link>
            <Link className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" to="/login">
              Sign In
            </Link>
            <Link className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" to="/register">
              Register
            </Link>
          </div>
        </nav>

        <header className="bg-[#fffaf3] bg-[linear-gradient(90deg,rgba(255,255,255,0.97),rgba(255,255,255,0.72))] px-[18px] py-[34px] md:px-12 md:py-[54px_48px_48px]">
          <div className="flex min-w-0 flex-col items-center text-center">
            <Eyebrow>Baby Growth & Nutrition</Eyebrow>
            <h1 id="hero-title" className="m-0 text-[clamp(3.4rem,6.4vw,6rem)] font-black leading-[0.95] tracking-normal text-[#1d61bc]">
              StunTrack
            </h1>
            <h2 className="mt-3.5 max-w-3xl text-[clamp(1.45rem,2.6vw,2.35rem)] font-extrabold leading-[1.08] tracking-normal text-[#333d47]">
              Pahami gizi anak, ukur tumbuh kembangnya.
            </h2>
            <p className="mt-3.5 max-w-3xl text-[1.08rem] leading-normal text-[#263744]">
              Portal modern bagi keluarga, relawan, dan admin untuk memahami risiko stunting, menyiapkan catatan gizi, serta mendukung pemeriksaan foto bayi berbantuan AI di masa mendatang.
            </p>

            <nav className="mt-6 flex flex-wrap justify-center gap-x-[34px] gap-y-3.5" aria-label="Primary">
              <Link className={primaryActionClass} to="/login">
                <LogIn size={21} />
                Sign In
              </Link>
              <Link className={primaryActionClass} to="/register">
                <UserPlus size={21} />
                Register
              </Link>
              <Link className={primaryActionClass} to="/about">
                <HeartPulse size={21} />
                About
              </Link>
            </nav>
          </div>

          <div className="mt-10 w-full"><HeroVisual /></div>
        </header>

        <IndonesiaMap />
        <div id="chart">
          <GrowthChart />
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
