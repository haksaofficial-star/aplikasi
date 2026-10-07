import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Minus, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard, Panel } from "@/components/Common";
import { StudentDialog } from "@/components/StudentDialog";
import { TxDialog } from "@/components/TxDialog";
import { TxTable } from "@/components/TxTable";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { StatusBadge } from "@/pages/Siswa";
import { useOptions } from "@/context/OptionsContext";
import { api, rupiah, errMsg, fmtDate } from "@/lib/api";

const COST_ROWS = [["Visa", "est_visa"], ["KTKLN", "est_ktkln"], ["MCU", "est_mcu"], ["TSK", "est_tsk"]];

const CostBreakdown = ({ s }) => {
  const other = Object.entries(s.pengeluaran_per_kategori).filter(([k]) => !COST_ROWS.some(([n]) => n === k));
  return (
    <div className="divide-y divide-slate-100">
      {COST_ROWS.map(([name, key]) => {
        const actual = s.pengeluaran_per_kategori[name] || 0;
        return (
          <div key={name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm" data-testid={`cost-${name.toLowerCase()}`}>
            <span className="font-medium text-slate-700">{name}</span>
            <span className="text-right">
              <span className="num font-semibold text-red-600">{rupiah(actual)}</span>
              <span className="num block text-[11px] text-slate-400">estimasi {rupiah(s[key])}</span>
            </span>
          </div>
        );
      })}
      {other.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="text-slate-600">{k}</span><span className="num font-semibold text-red-600">{rupiah(v)}</span>
        </div>
      ))}
    </div>
  );
};

export default function SiswaDetail() {
  const { id } = useParams();
  const { reload: reloadOpts } = useOptions();
  const [s, setS] = useState(null);
  const [edit, setEdit] = useState(false);
  const [tx, setTx] = useState({ open: false, tx: null, jenis: "masuk" });
  const [del, setDel] = useState(null);
  const load = useCallback(() => api.get(`/students/${id}`).then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  if (!s) return <p className="text-sm text-slate-500">Memuat...</p>;
  const pct = s.biaya ? Math.min(100, (s.total_bayar / s.biaya) * 100) : 0;
  const doDelete = async () => {
    try { await api.delete(`/transactions/${del.id}`); toast.success("Transaksi dihapus"); load(); } catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };

  return (
    <div>
      <Link to="/siswa" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-800" data-testid="back-to-students"><ArrowLeft className="h-4 w-4" />Data Siswa TG</Link>
      <div className="fade-up mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl" data-testid="student-detail-name">{s.nama}</h1>
            <StatusBadge s={s} />
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{s.status}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{[s.job && `Job: ${s.job}`, s.tsk && `TSK: ${s.tsk}`, s.no_hp, s.tanggal_daftar && `Daftar ${fmtDate(s.tanggal_daftar)}`].filter(Boolean).join(" · ") || "Lengkapi data job & TSK lewat tombol Edit"}</p>
          {s.catatan && <p className="mt-2 max-w-2xl text-xs text-slate-400">{s.catatan}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEdit(true)} data-testid="student-detail-edit-btn"><Pencil className="mr-2 h-4 w-4" />Edit Data</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setTx({ open: true, tx: null, jenis: "masuk" })} data-testid="student-add-payment-btn"><Plus className="mr-2 h-4 w-4" />Catat Pembayaran</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setTx({ open: true, tx: null, jenis: "keluar" })} data-testid="student-add-expense-btn"><Minus className="mr-2 h-4 w-4" />Catat Pengeluaran</Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Biaya Job Matching" value={s.biaya ? rupiah(s.biaya) : "Belum diisi"} tone="blue" testId="detail-biaya" />
        <StatCard label="Sudah Dibayar" value={rupiah(s.total_bayar)} tone="green" testId="detail-total-bayar" hint={s.biaya ? `${pct.toFixed(0)}% dari biaya` : undefined} delay={50} />
        <StatCard label="Kekurangan" value={s.kekurangan === null ? "—" : rupiah(s.kekurangan)} tone="amber" testId="detail-kekurangan" hint={s.lebih_bayar ? `Lebih bayar ${rupiah(s.lebih_bayar)}` : undefined} delay={100} />
        <StatCard label="Total Pengeluaran" value={rupiah(s.total_keluar)} tone="red" testId="detail-total-keluar" delay={150} />
        <StatCard label="Keuntungan Aktual" value={rupiah(s.profit_aktual)} tone={s.profit_aktual < 0 ? "red" : "indigo"} testId="detail-profit" hint={s.estimasi_profit !== null ? `Estimasi: ${rupiah(s.estimasi_profit)}` : undefined} delay={200} />
      </div>
      {s.biaya > 0 && <Progress value={pct} className="mt-4 h-2" data-testid="detail-progress" />}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Pengeluaran Utama vs Estimasi">
          <CostBreakdown s={s} />
          <div className="flex gap-2 border-t border-slate-100 p-4 text-xs text-slate-500">
            <Info className="h-4 w-4 shrink-0 text-blue-700" />
            Semua transaksi siswa ini otomatis tercatat di Jurnal Umum dan rekap Pemasukan per Jenis.
          </div>
        </Panel>
        <Panel title="Buku Kas Siswa (Jurnal Masuk & Keluar)" className="xl:col-span-2">
          <TxTable items={s.transaksi} showStudent={false} onEdit={(t) => setTx({ open: true, tx: t, jenis: t.masuk ? "masuk" : "keluar" })} onDelete={setDel} />
        </Panel>
      </div>
      <StudentDialog open={edit} onOpenChange={setEdit} student={s} onSaved={() => { load(); reloadOpts(); }} />
      <TxDialog open={tx.open} tx={tx.tx} jenis={tx.jenis} studentId={id} onOpenChange={(o) => setTx((p) => ({ ...p, open: o }))} onSaved={load} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete} description="Transaksi juga akan dihapus dari Jurnal Umum." />
    </div>
  );
}
