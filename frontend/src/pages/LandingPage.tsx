import { type CSSProperties, useState } from "react";
import {
  Activity,
  Apple,
  Baby,
  BarChart3,
  Camera,
  HeartPulse,
  LogIn,
  ShieldCheck,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";

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

const roleCards = [
  {
    icon: ShieldCheck,
    role: "Admin",
    copy: "Manage public information and keep the landing page content current.",
  },
  {
    icon: Users,
    role: "Guest",
    copy: "Read stunting education, nutrition guidance, and service updates.",
  },
  {
    icon: Camera,
    role: "Volunteer",
    copy: "Contribute labeled baby photos for future AI training workflows.",
  },
  {
    icon: Baby,
    role: "User",
    copy: "Upload baby photos and review growth or nutrition risk signals.",
  },
];

const stats = [
  ["Families supported", "1,284"],
  ["Growth checks planned", "8,920"],
  ["Nutrition records ready", "4,716"],
];

const updates = [
  "Indonesia health statistic graph module",
  "Future baby photo upload workflow",
  "Nutrition tracking dashboard blueprint",
];

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
      className="chart-section"
      aria-labelledby="chart-title"
      style={{ "--series": activeSeries.color, "--series-soft": activeSeries.softColor } as CSSProperties}
    >
      <div className="chart-copy">
        <p className="eyebrow">Indonesia Overview</p>
        <h2 id="chart-title">Child growth risk trend</h2>
        <p>
          Switch between national stunting and acute undernutrition prevalence to compare how
          child growth indicators are moving year by year.
        </p>

        <div className="chart-toggle" aria-label="Select graph metric">
          {(Object.keys(chartSeries) as MetricKey[]).map((key) => {
            const item = chartSeries[key];
            const isActive = metric === key;

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? "active" : ""}
                key={key}
                onClick={() => setMetric(key)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="chart-summary">
          <div>
            <span>Latest</span>
            <strong>{latest.value}%</strong>
            <small>{latest.year}</small>
          </div>
          <div>
            <span>Year change</span>
            <strong>{delta > 0 ? "+" : ""}{delta}%</strong>
            <small>vs {previous.year}</small>
          </div>
        </div>
      </div>

      <div className="chart-card-shell">
        <div className="chart-card-topline">
          <div>
            <span>{activeSeries.label}</span>
            <p>{activeSeries.description}</p>
          </div>
          <TrendingDown size={26} />
        </div>

        <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${activeSeries.label} prevalence line chart in Indonesia`}>
          {[0, 8, 16, 24, 32].map((tick) => {
            const y = padding.top + ((maxValue - tick) / (maxValue - minValue)) * chartHeight;

            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                <text x={padding.left - 14} y={y + 5}>{tick}%</text>
              </g>
            );
          })}
          <path className="chart-area" d={areaPath} />
          <path className="chart-line" d={path} />
          {points.map((point) => (
            <g className="chart-point" key={point.year}>
              <circle cx={point.x} cy={point.y} r="7" />
              <text className="point-value" x={point.x} y={point.y - 14}>{point.value}%</text>
              <text className="point-year" x={point.x} y={height - 18}>{point.year}</text>
            </g>
          ))}
        </svg>

        <p className="chart-source">Data note: {activeSeries.source}. National prevalence is not an individual diagnosis.</p>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <main className="page-shell">
      <section className="site-card" aria-labelledby="hero-title">
        <nav className="top-nav" aria-label="Site">
          <a className="brand-lockup" href="/">
            <BarChart3 size={24} />
            <span>StunTrack</span>
          </a>
          <div>
            <a href="#chart">Statistics</a>
            {/* <a href="#roles">Roles</a>
            <a href="#news">News</a> */}
          </div>
        </nav>

        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Baby Growth & Nutrition</p>
            <h1 id="hero-title">StunTrack</h1>
            <h2>Track growth signals before small concerns become serious</h2>
            <p>
              A modern front door for families, volunteers, and admins to understand stunting
              risk, prepare nutrition records, and support future AI-assisted baby photo checks.
            </p>

            <nav className="hero-actions" aria-label="Primary">
              <a href="#signin">
                <LogIn size={21} />
                Sign In
              </a>
              <a href="#register">
                <UserPlus size={21} />
                Register
              </a>
              <a href="#about">
                <HeartPulse size={21} />
                About
              </a>
            </nav>
          </div>

          <div className="hero-visual" aria-label="Baby nutrition tracking illustration">
            <div className="visual-card baby-card">
              <div className="baby-face">
                <span />
              </div>
              <div className="growth-rings">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="visual-card chart-card">
              <div className="chart-header">
                <Activity size={18} />
                <span>Growth</span>
              </div>
              <div className="chart-lines">
                <b />
                <b />
                <b />
              </div>
            </div>
            <div className="nutrition-chip">
              <Apple size={19} />
              balanced nutrition
            </div>
          </div>
        </header>

        <div id="chart">
          <GrowthChart />
        </div>

        {/* <section className="role-strip" id="roles" aria-label="Planned role access">
          {roleCards.map(({ icon: Icon, role, copy }) => (
            <article key={role}>
              <Icon size={22} />
              <h3>{role}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section className="lower-grid" id="news">
          <div>
            <h2>Sitewide Statistics</h2>
            <dl className="stats-list">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2>Site News</h2>
            <ul className="news-list">
              {updates.map((update) => (
                <li key={update}>{update}</li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="site-footer">
          <a href="#help">Help</a>
          <a href="#forum">Forum</a>
          <a href="#blog">Blog</a>
          <a href="#privacy">Privacy</a>
          <a href="#github">GitHub</a>
        </footer> */}
      </section>
    </main>
  );
}

export default LandingPage;
