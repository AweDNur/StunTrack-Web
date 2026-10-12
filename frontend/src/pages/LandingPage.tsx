import { type CSSProperties, useState, useEffect } from "react";
import {
  Activity,
  Apple,
  HeartPulse,
  LogIn,
  TrendingDown,
  UserPlus,
} from "lucide-react";

import logo from "../assets/logo-stuntrack.png";

import babyImage from "../assets/gambar-1.jpg";
import nutritionImage from "../assets/gambar-2.avif";
import growthImage from "../assets/gambar-3.webp";

type MetricKey = "stunting" | "nutrition";

const chartSeries = {
  stunting: {
    label: "Stunting",
    description: "Children under 5 with height-for-age below expected growth standards.",
    color: "#d14f34",
    softColor: "#fff0ec",
    source: "SSGBI / SSGI / SKI public prevalence reports",
    values: [
      { year: "2019", value: 27.7 },
      { year: "2021", value: 24.4 },
      { year: "2022", value: 21.6 },
      { year: "2023", value: 21.5 },
      { year: "2024", value: 19.8 },
    ],
  },
  nutrition: {
    label: "Lack of Nutrition",
    description: "Wasting or acute undernutrition prevalence among children under 5.",
    color: "#168679",
    softColor: "#eaf8f5",
    source: "SSGI / SKI public prevalence reports",
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
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ddcfc6] bg-white px-4 text-[1.05rem] font-extrabold leading-none text-[#970e00] shadow-[0_2px_0_#dccfc7] transition hover:text-[#c8301b]";

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
        <Eyebrow>Indonesia Overview</Eyebrow>
        <h2 id="chart-title" className="font-serif text-[1.58rem] font-bold uppercase text-[#303b45]">
          Child growth risk trend
        </h2>
        <p className="mt-4 leading-relaxed text-[#53626b]">
          Switch between national stunting and acute undernutrition prevalence to compare how
          child growth indicators are moving year by year.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5" aria-label="Select graph metric">
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
            <span className="block text-[0.82rem] font-extrabold text-[#708085]">Latest</span>
            <strong className="my-1 block text-[1.8rem] leading-none text-[var(--series)]">{latest.value}%</strong>
            <small className="block text-[0.82rem] font-extrabold text-[#708085]">{latest.year}</small>
          </div>
          <div className="rounded-lg border border-[#e0e8e5] bg-white p-[15px]">
            <span className="block text-[0.82rem] font-extrabold text-[#708085]">Year change</span>
            <strong className="my-1 block text-[1.8rem] leading-none text-[var(--series)]">
              {delta > 0 ? "+" : ""}
              {delta}%
            </strong>
            <small className="block text-[0.82rem] font-extrabold text-[#708085]">vs {previous.year}</small>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-[#d7e3de] bg-[linear-gradient(180deg,var(--series-soft),#ffffff_46%)] p-4 shadow-[0_15px_34px_rgba(45,68,67,0.1)] sm:p-[22px_22px_16px]">
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
          aria-label={`${activeSeries.label} prevalence line chart in Indonesia`}
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
          Data note: {activeSeries.source}. National prevalence is not an individual diagnosis.
        </p>
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

  const slides = [
  {
    image: babyImage,
    alt: "Bayi sehat",
  },
  {
    image: nutritionImage,
    alt: "Makanan bergizi untuk bayi",
  },
  {
    image: growthImage,
    alt: "Pemantauan pertumbuhan bayi",
  },
];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % slides.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  return (
    <div
      className="relative min-h-[250px] overflow-hidden rounded-lg border border-[#c9ddd8] bg-[#dff2ed] md:min-h-[330px]"
      aria-label="Baby growth and nutrition image slider"
      aria-roledescription="carousel"
    >
      {/* Image slider track */}
      <div
        className="flex h-full min-h-[250px] w-full transition-transform duration-700 ease-in-out md:min-h-[330px]"
        style={{
          transform: `translateX(-${currentSlide * 100}%)`,
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.alt}
            className="relative min-h-[250px] w-full shrink-0 md:min-h-[330px]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Soft overlay to match the StunTrack design */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-[#173f3d]/20" />
          </div>
        ))}
      </div>

      {/* Nutrition badge */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[#ecd481] bg-[#fff8df]/95 px-3 py-2 text-xs font-extrabold uppercase text-[#866313] shadow-[0_10px_24px_rgba(36,49,58,0.1)] sm:right-6 sm:top-6 sm:text-sm">
        <Apple size={18} />
        Balanced Nutrition
      </div>

      {/* Slide indicators */}
      <div
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 sm:bottom-6 sm:right-6"
        aria-label="Slide indicators"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.alt}
            type="button"
            onClick={() => setCurrentSlide(index)}
            aria-label={`Show slide ${index + 1}`}
            aria-pressed={currentSlide === index}
            className={`h-2.5 rounded-full border border-white/80 transition-all duration-300 ${
              currentSlide === index
                ? "w-7 bg-[#168679]"
                : "w-2.5 bg-white/80 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
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
            <a className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" href="#chart">
              Statistics
            </a>
            <a className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" href="#signin">
              Sign In
            </a>
            <a className="inline-flex items-center font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" href="#register">
              Register
            </a>
          </div>
        </nav>

        <header className="grid min-h-[440px] gap-10 bg-[#fffaf3] bg-[linear-gradient(90deg,rgba(255,255,255,0.97),rgba(255,255,255,0.72))] px-[18px] py-[18px] md:px-12 md:py-[54px_48px_48px] lg:grid-cols-[minmax(310px,0.92fr)_minmax(330px,1fr)]">
          <div className="flex min-w-0 flex-col justify-center">
            <Eyebrow>Baby Growth & Nutrition</Eyebrow>
            <h1 id="hero-title" className="m-0 text-[clamp(3.4rem,6.4vw,6rem)] font-black leading-[0.95] tracking-normal text-[#1d61bc]">
              StunTrack
            </h1>
            <h2 className="mt-3.5 max-w-xl text-[clamp(1.45rem,2.6vw,2.35rem)] font-extrabold leading-[1.08] tracking-normal text-[#333d47]">
              Track growth signals before small concerns become serious
            </h2>
            <p className="mt-3.5 max-w-xl text-[1.08rem] leading-normal text-[#263744]">
              A modern front door for families, volunteers, and admins to understand stunting
              risk, prepare nutrition records, and support future AI-assisted baby photo checks.
            </p>

            <nav className="mt-6 flex flex-wrap gap-x-[34px] gap-y-3.5" aria-label="Primary">
              <a className={primaryActionClass} href="#signin">
                <LogIn size={21} />
                Sign In
              </a>
              <a className={primaryActionClass} href="#register">
                <UserPlus size={21} />
                Register
              </a>
              <a className={primaryActionClass} href="#about">
                <HeartPulse size={21} />
                About
              </a>
            </nav>
          </div>

          <HeroVisual />
        </header>

        <div id="chart">
          <GrowthChart />
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
