import { useState } from "react";

// Tambahkan FileText (untuk CMS) dan Image (untuk Training Data) ke import lucide-react
import { Baby, ClipboardList, LayoutDashboard, LogOut, ShieldCheck, Sparkles, Users, FileText, Image as ImageIcon, HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, Outlet, useLocation } from "react-router-dom";

import logo from "../assets/logo-stuntrack.png";

// 1. Tambahkan "admin" ke type Role
type Role = "orang_tua" | "volunteer" | "admin";

// 2. Tambahkan daftar menu untuk admin
const sidebarItems = {
  orang_tua: [
    { label: "Overview", icon: LayoutDashboard, path: "overview" },
    { label: "Child Growth", icon: Baby, path: "growth" },
    { label: "Detection", icon: Sparkles, path: "detection" },
  ],
  volunteer: [
    { label: "Overview", icon: LayoutDashboard, path: "" },
    { label: "Community", icon: Users, path: "" },
    { label: "Training Data", icon: ClipboardList, path: "training" },
    { label: "Riwayat", icon: HistoryIcon, path: "history" },
  ],
  admin: [
    { label: "Overview", icon: LayoutDashboard, path: "" },
    { label: "Kelola Konten", icon: FileText, path: "cms" },
    { label: "Review Data AI", icon: ImageIcon, path: "review-training" },
  ],
} as const;

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: routeRole } = useParams<{ role: Role }>();
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as { role?: Role; name?: string } | null;
  const role = ["orang_tua", "volunteer", "admin"].includes(routeRole as string) ? routeRole : session?.role;

  if (!role || (session?.role && session.role !== role)) return <Navigate to="/login" replace />;

  // 3. Sesuaikan roleLabel untuk Admin
  let roleLabel = "Orang Tua";
  if (role === "orang_tua") roleLabel = "Orang Tua";
  if (role === "volunteer") roleLabel = "Volunteer";
  if (role === "admin") roleLabel = "Admin";
  
  const items = sidebarItems[role];
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // (Kode sisanya di dalam DashboardPage.tsx tetap sama seperti sebelumnya, tidak ada yang perlu diubah)
  function handleLogout() {
    localStorage.removeItem("stuntrack_session");
    navigate("/login");
  }

  return (
    <main className="flex min-h-screen bg-[#f5f8fc] text-[#24313a]">
      {/* ... (isi aside dan header tetap sama) ... */}
      <aside className={`relative flex shrink-0 flex-col bg-[#1c5fbd] px-5 py-6 text-white transition-[width,padding] duration-300 max-md:w-[84px] max-md:px-3 ${isSidebarCollapsed ? "w-[84px] px-3" : "w-[250px]"}`}>
        <button type="button" onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)} className="absolute -right-3 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[#dce6ef] bg-white text-[#1c5fbd] shadow-md transition hover:bg-[#eaf2ff] max-md:hidden" aria-label={isSidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"} title={isSidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}>{isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
        <div className="flex items-center gap-3 border-b border-white/15 px-2 pb-6 max-md:justify-center">
          <img className="h-10 w-10 rounded-xl bg-white object-contain p-1" src={logo} alt="" />
          <span className={`text-xl font-black max-md:hidden ${isSidebarCollapsed ? "hidden" : ""}`}>StunTrack</span>
        </div>
        
        <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="Dashboard navigation">
          {items.map(({ label, icon: Icon, path }, index) => (
            path ? (
              <Link
                key={label}
                to={`/dashboard/${role}/${path}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition max-md:justify-center ${
                  location.pathname.includes(path) ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span className={`max-md:hidden ${isSidebarCollapsed ? "hidden" : ""}`}>{label}</span>
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition max-md:justify-center ${
                  index === 0 && location.pathname === `/dashboard/${role}` ? "bg-white text-[#1c5fbd] shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span className={`max-md:hidden ${isSidebarCollapsed ? "hidden" : ""}`}>{label}</span>
              </button>
            )
          ))}
        </nav>

        <div className="border-t border-white/15 pt-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white max-md:justify-center" type="button" onClick={handleLogout}>
            <LogOut size={19} />
            <span className={`max-md:hidden ${isSidebarCollapsed ? "hidden" : ""}`}>Sign out</span>
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex min-h-[82px] items-center justify-between border-b border-[#e3eaf2] bg-white px-5 shadow-[0_2px_12px_rgba(35,63,90,0.04)] sm:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Dashboard</p>
            <h1 className="mt-1 text-xl font-black text-[#303b45] sm:text-2xl">Halo, {session?.name || roleLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-black text-[#303b45]">{session?.name || roleLabel}</p>
              <p className="text-xs font-semibold capitalize text-[#71838d]">{roleLabel}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ff] font-black text-[#1c5fbd]">
              <ShieldCheck size={20} />
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
