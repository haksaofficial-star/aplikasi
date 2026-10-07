import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OptionsProvider } from "@/context/OptionsContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Jurnal from "@/pages/Jurnal";
import Pemasukan from "@/pages/Pemasukan";
import Siswa from "@/pages/Siswa";
import SiswaDetail from "@/pages/SiswaDetail";
import Jobs from "@/pages/Jobs";
import Pengaturan from "@/pages/Pengaturan";

function Protected() {
  const { user } = useAuth();
  if (user === null) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Memuat...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <OptionsProvider>
      <Layout />
    </OptionsProvider>
  );
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jurnal" element={<Jurnal />} />
            <Route path="/pemasukan" element={<Pemasukan />} />
            <Route path="/siswa" element={<Siswa />} />
            <Route path="/siswa/:id" element={<SiswaDetail />} />
            <Route path="/job" element={<Jobs />} />
            <Route path="/pengaturan" element={<Pengaturan />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
