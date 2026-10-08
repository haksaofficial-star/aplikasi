import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-bg relative hidden flex-col justify-between overflow-hidden bg-blue-950 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-500/90" />
        <div className="relative flex items-center gap-3">
          <img src="/icon-192.png" alt="Hakusa" className="h-12 w-12 rounded-xl bg-white p-0.5" data-testid="login-side-logo" />
          <p className="font-heading text-lg font-bold">Hakusa Edu Japan</p>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">LPK · Jurnal Keuangan</p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Satu kali catat,<br />semua buku rapi.</h1>
          <p className="mt-5 text-blue-100/80">
            Pembayaran siswa job matching langsung tercatat di Jurnal Umum, rekap pemasukan per jenis, dan buku kas masing-masing siswa.
          </p>
        </div>
        <p className="relative text-xs text-blue-200/70">日本で働く夢を、しっかり支える。</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="fade-up w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <img src="/logo-hakusa.png" alt="Hakusa Edu Japan - Work and Study" className="mb-6 h-auto w-56" data-testid="login-form-logo" />
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Masuk</h2>
            <p className="mt-1 text-sm text-slate-500">Hanya untuk akun yang dibuat oleh admin.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="email" type="email" required className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="password" type="password" required className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" data-testid="login-error">{error}</p>}
          <Button type="submit" className="h-11 w-full bg-blue-900 hover:bg-blue-950" disabled={loading} data-testid="login-submit-btn">
            {loading ? "Memproses..." : "Masuk ke Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
