import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, AlertCircle, Download, Plus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, StatCard, Panel } from "@/components/Common";
import { BukuSelect } from "@/components/BukuSelect";
import { TxDialog } from "@/components/TxDialog";
import { api, rupiah, shortRp, fmtMonth, fmtDate, downloadExcel, errMsg } from "@/lib/api";

const PIE_COLORS = ["#1E3A8A", "#059669", "#6366F1", "#D97706", "#DC2626", "#0EA5E9", "#64748B"];

const TrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <AreaChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
      <defs>
        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.25} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient>
        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DC2626" stopOpacity={0.2} /><stop offset="100%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
      <XAxis dataKey="bulan" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
      <YAxis tickFormatter={shortRp} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={56} />
      <Tooltip formatter={(v) => rupiah(v)} labelFormatter={fmtMonth} />
      <Area type="monotone" dataKey="masuk" name="Masuk" stroke="#059669" strokeWidth={2} fill="url(#gIn)" />
      <Area type="monotone" dataKey="keluar" name="Keluar" stroke="#DC2626" strokeWidth={2} fill="url(#gOut)" />
    </AreaChart>
  </ResponsiveContainer>
);

const IncomeDonut = ({ data }) => (
  <div className="p-5">
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="kategori" innerRadius={52} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => rupiah(v)} />
      </PieChart>
    </ResponsiveContainer>
    <div className="mt-3 space-y-2">
      {data.map((d, i) => (
        <div key={d.kategori} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.kategori}
          </span>
          <span className="num font-medium text-slate-800">{rupiah(d.total)}</span>
        </div>
      ))}
    </div>
  </div>
);

const PendingList = ({ s }) => (
  <div className="divide-y divide-slate-100">
    {s.top_kekurangan.length === 0 && <p className="p-5 text-sm text-slate-400">Tidak ada kekurangan. Semua lunas.</p>}
    {s.top_kekurangan.map((x) => (
      <Link key={x.id} to={`/siswa/${x.id}`} className="block px-5 py-3 transition-colors hover:bg-slate-50" data-testid={`dash-pending-${x.id}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">{x.nama}</p>
          <p className="num text-sm font-semibold text-amber-700">{rupiah(x.kekurangan)}</p>
        </div>
        <Progress value={Math.min(100, (x.total_bayar / x.biaya) * 100)} className="mt-2 h-1.5" />
      </Link>
    ))}
  </div>
);

export default function Dashboard() {
  const [buku, setBuku] = useState("");
  const [d, setD] = useState(null);
  const [txOpen, setTxOpen] = useState(false);
  const load = useCallback(() => api.get("/dashboard", { params: { buku } }).then((r) => setD(r.data)), [buku]);
  useEffect(() => { load(); }, [load]);

  const exportXlsx = () => downloadExcel(buku).then(() => toast.success("File Excel diunduh")).catch((e) => toast.error(errMsg(e)));

  return (
    <div>
      <PageHeader eyebrow="Ringkasan" title="Dashboard Keuangan" subtitle="Posisi kas, arus masuk-keluar, dan status pembayaran siswa TG job matching.">
        <BukuSelect value={buku} onChange={setBuku} />
        <Button variant="outline" onClick={exportXlsx} data-testid="dashboard-export-btn"><Download className="mr-2 h-4 w-4" />Ekspor Excel</Button>
        <Button onClick={() => setTxOpen(true)} data-testid="dashboard-add-tx-btn"><Plus className="mr-2 h-4 w-4" />Catat Transaksi</Button>
      </PageHeader>
      {!d ? <p className="text-sm text-slate-500">Memuat data...</p> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total Pemasukan" value={rupiah(d.total_masuk)} icon={ArrowDownLeft} tone="green" testId="total-masuk-display" />
            <StatCard label="Total Pengeluaran" value={rupiah(d.total_keluar)} icon={ArrowUpRight} tone="red" testId="total-keluar-display" delay={60} />
            <StatCard label="Saldo Saat Ini" value={rupiah(d.saldo)} icon={Wallet} tone={d.saldo < 0 ? "red" : "blue"} testId="total-saldo-display" hint={`${d.jumlah_transaksi} transaksi`} delay={120} />
            <StatCard label="Profit Job Matching" value={rupiah(d.siswa.profit_aktual)} icon={TrendingUp} tone="indigo" testId="profit-jm-display" hint="Bayar siswa − pengeluaran siswa" delay={180} />
            <StatCard label="Kekurangan Siswa TG" value={rupiah(d.siswa.total_kekurangan)} icon={AlertCircle} tone="amber" testId="total-kekurangan-display" hint={`${d.siswa.belum_lunas} siswa belum lunas`} delay={240} />
          </div>
          {d.siswa.biaya_belum_diatur > 0 && (
            <Link to="/siswa?filter=nofee" className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100" data-testid="dashboard-nofee-alert">
              <AlertCircle className="h-4 w-4" /> {d.siswa.biaya_belum_diatur} siswa belum diisi biaya job matching-nya, sehingga kekurangannya belum bisa dihitung. Klik untuk melengkapi.
            </Link>
          )}
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Arus Kas Bulanan (12 bulan terakhir)" className="xl:col-span-2"><div className="p-4"><TrendChart data={d.monthly} /></div></Panel>
            <Panel title="Pemasukan per Jenis" action={<Link to="/pemasukan" className="text-xs font-semibold text-blue-700 hover:underline">Detail</Link>}>
              <IncomeDonut data={d.income_by_category} />
            </Panel>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Kekurangan Terbesar Siswa TG" action={<Link to="/siswa" className="text-xs font-semibold text-blue-700 hover:underline">Semua siswa</Link>}>
              <PendingList s={d.siswa} />
            </Panel>
            <Panel title="Transaksi Terbaru" className="xl:col-span-2" action={<Link to="/jurnal" className="text-xs font-semibold text-blue-700 hover:underline">Jurnal Umum</Link>}>
              <div className="divide-y divide-slate-100">
                {d.recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{t.keterangan}</p>
                      <p className="text-xs text-slate-400">{fmtDate(t.tanggal)} · {t.kategori}{t.student_nama ? ` · ${t.student_nama}` : ""}</p>
                    </div>
                    <p className={`num shrink-0 text-sm font-semibold ${t.masuk ? "text-emerald-700" : "text-red-600"}`}>
                      {t.masuk ? `+${rupiah(t.masuk)}` : `-${rupiah(t.keluar)}`}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
      <TxDialog open={txOpen} onOpenChange={setTxOpen} onSaved={load} />
    </div>
  );
}
