import { Activity, Baby, ClipboardList, HeartPulse, LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

type Role = "user" | "volunteer";

const sidebarItems = {
  user: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Child Growth", icon: Baby },
    { label: "Health Records", icon: HeartPulse },
  ],
  volunteer: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Community", icon: Users },
    { label: "Training Data", icon: ClipboardList },
  ],
} as const;

function DashboardPage() {
  const navigate = useNavigate();
  const { role: routeRole } = useParams<{ role: Role }>();
  const session = JSON.parse(localStorage.getItem("stuntrack_session") || "null") as { role?: Role; name?: string } | null;
  const role = routeRole === "user" || routeRole === "volunteer" ? routeRole : session?.role;

  if (!role || (session?.role && session.role !== role)) return <Navigate to="/login" replace />;

  const roleLabel = role === "volunteer" ? "Volunteer" : "User";
  const items = sidebarItems[role];

  function handleLogout() {
    localStorage.removeItem("stuntrack_session");
    navigate("/login");
  }

  return (
    <main className="flex min-h-screen bg-[#f5f8fc] text-[#24313a]">
      <aside className="flex w-[250px] shrink-0 flex-col bg-[#1c5fbd] px-5 py-6 text-white max-md:w-[84px] max-md:px-3">
        <div className="flex items-center gap-3 border-b border-white/15 px-2 pb-6 max-md:justify-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-black text-[#1c5fbd]">S</div><span className="text-xl font-black max-md:hidden">StunTrack</span></div>
        <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="Dashboard navigation">
          {items.map(({ label, icon: Icon }, index) => <button className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition max-md:justify-center ${index === 0 ? "bg-white text-[#1c5fbd] shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`} key={label} type="button"><Icon size={19} /><span className="max-md:hidden">{label}</span></button>)}
        </nav>
        <div className="border-t border-white/15 pt-4"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white max-md:justify-center" type="button" onClick={handleLogout}><LogOut size={19} /><span className="max-md:hidden">Sign out</span></button></div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex min-h-[82px] items-center justify-between border-b border-[#e3eaf2] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(35,63,90,0.04)] sm:px-8">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Dashboard</p><h1 className="mt-1 text-xl font-black text-[#303b45] sm:text-2xl">Login sebagai {roleLabel}</h1></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-black text-[#303b45]">{session?.name || roleLabel}</p><p className="text-xs font-semibold capitalize text-[#71838d]">{roleLabel}</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ff] font-black text-[#1c5fbd]"><ShieldCheck size={20} /></div></div>
        </header>
        <div className="grid min-h-[calc(100vh-82px)] place-items-center p-6 sm:p-10"><div className="text-center text-[#8a9aa6]"><Activity className="mx-auto mb-3 text-[#1c5fbd]/40" size={28} /><p className="font-bold">Dashboard content coming soon</p></div></div>
      </section>
    </main>
  );
}

export default DashboardPage;
