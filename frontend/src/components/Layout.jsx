import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, BookOpen, PieChart, Users, Briefcase, Settings, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { to: "/jurnal", label: "Jurnal Umum", icon: BookOpen, id: "jurnal" },
  { to: "/pemasukan", label: "Pemasukan per Jenis", icon: PieChart, id: "pemasukan" },
  { to: "/siswa", label: "Siswa TG Job Matching", icon: Users, id: "siswa" },
  { to: "/job", label: "Job Open", icon: Briefcase, id: "job" },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings, id: "pengaturan" },
];

const Brand = () => (
  <div className="flex items-center gap-3 px-5 py-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 font-heading text-lg font-extrabold text-white shadow-sm">
      ハ
    </div>
    <div>
      <p className="font-heading text-[15px] font-extrabold leading-tight text-slate-900">Hakusa Edu Japan</p>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Jurnal Keuangan</p>
    </div>
  </div>
);

const NavList = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, id }) => (
          <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate} data-testid={`nav-${id}`}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
              ? "bg-blue-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="truncate text-sm font-semibold text-slate-800" data-testid="current-user-name">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button onClick={logout} data-testid="logout-btn"
          className="mt-2 flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700">
          <LogOut className="h-3.5 w-3.5" /> Keluar
        </button>
      </div>
    </div>
  );
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <NavList />
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <p className="font-heading font-extrabold text-slate-900">Hakusa Edu Japan</p>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="rounded-lg border border-slate-200 p-2" data-testid="mobile-menu-btn" aria-label="Menu"><Menu className="h-5 w-5" /></button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <NavList onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
