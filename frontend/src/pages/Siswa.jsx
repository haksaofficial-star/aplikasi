import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Wallet, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, Panel } from "@/components/Common";
import { StudentDialog } from "@/components/StudentDialog";
import { TxDialog } from "@/components/TxDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { useOptions } from "@/context/OptionsContext";
import { api, rupiah, errMsg } from "@/lib/api";

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Belum Lunas" },
  { id: "lunas", label: "Lunas" },
  { id: "nofee", label: "Biaya Belum Diisi" },
];

export const StatusBadge = ({ s }) => {
  if (!s.biaya) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Biaya belum diisi</span>;
  if (s.lunas) return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Lunas</span>;
  return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Belum Lunas</span>;
};

const match = (s, filter) => filter === "all" || (filter === "pending" && s.biaya > 0 && !s.lunas)
  || (filter === "lunas" && s.lunas) || (filter === "nofee" && !s.biaya);

export default function Siswa() {
  const nav = useNavigate();
  const { reload: reloadOpts } = useOptions();
  const [params, setParams] = useSearchParams();
  const filter = params.get("filter") || "all";
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState({ open: false, student: null });
  const [pay, setPay] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(() => api.get("/students").then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const refresh = () => { load(); reloadOpts(); };

  const shown = useMemo(() => list.filter((s) => match(s, filter)
    && (!q || `${s.nama} ${s.job} ${s.tsk}`.toLowerCase().includes(q.toLowerCase()))), [list, filter, q]);
  const withFee = list.filter((s) => s.biaya > 0);
  const sum = (arr, k) => arr.reduce((a, s) => a + (s[k] || 0), 0);

  const doDelete = async () => {
    try { const r = await api.delete(`/students/${del.id}`); toast.success(`Siswa dihapus (${r.data.transaksi_dihapus} transaksi ikut terhapus)`); refresh(); } catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };

  return (
    <div>
      <PageHeader eyebrow="TG · Job Matching" title="Data Siswa TG" subtitle="Pembayaran, pengeluaran (Visa, KTKLN, MCU, TSK), kekurangan dan keuntungan per siswa.">
        <Button onClick={() => setDlg({ open: true, student: null })} data-testid="add-student-btn"><Plus className="mr-2 h-4 w-4" />Tambah Siswa</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tagihan Job Matching" value={rupiah(sum(withFee, "biaya"))} tone="blue" testId="siswa-total-tagihan" hint={`${withFee.length} siswa dengan biaya terisi`} />
        <StatCard label="Total Sudah Dibayar" value={rupiah(sum(list, "total_bayar"))} tone="green" testId="siswa-total-bayar" delay={60} />
        <StatCard label="Total Kekurangan" value={rupiah(sum(withFee, "kekurangan"))} tone="amber" testId="siswa-total-kekurangan" delay={120} />
        <StatCard label="Keuntungan Aktual" value={rupiah(sum(list, "profit_aktual"))} tone="indigo" testId="siswa-total-profit" hint="Masuk − keluar seluruh siswa" delay={180} />
      </div>
      <Panel className="mt-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari nama, job atau TSK..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} data-testid="student-search-input" />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {FILTERS.map((x) => (
              <button key={x.id} onClick={() => setParams(x.id === "all" ? {} : { filter: x.id })} data-testid={`student-filter-${x.id}`}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === x.id ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {x.label} <span className="num ml-1 text-slate-400">{list.filter((s) => match(s, x.id)).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table data-testid="students-table">
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-right">Biaya JM</TableHead>
                <TableHead className="min-w-[170px]">Sudah Dibayar</TableHead>
                <TableHead className="text-right">Kekurangan</TableHead>
                <TableHead className="text-right">Pengeluaran</TableHead>
                <TableHead className="text-right">Keuntungan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">Tidak ada siswa</TableCell></TableRow>}
              {shown.map((s) => (
                <TableRow key={s.id} className="group cursor-pointer" onClick={() => nav(`/siswa/${s.id}`)} data-testid={`student-row-${s.id}`}>
                  <TableCell className="min-w-[180px]">
                    <p className="font-semibold text-slate-800">{s.nama}</p>
                    <p className="text-xs text-slate-400">{[s.job, s.tsk, s.status].filter(Boolean).join(" · ")}</p>
                  </TableCell>
                  <TableCell className="num whitespace-nowrap text-right text-sm">{s.biaya ? rupiah(s.biaya) : "—"}</TableCell>
                  <TableCell>
                    <p className="num text-sm font-medium text-emerald-700">{rupiah(s.total_bayar)}</p>
                    {s.biaya > 0 && <Progress value={Math.min(100, (s.total_bayar / s.biaya) * 100)} className="mt-1.5 h-1.5" />}
                  </TableCell>
                  <TableCell className="num whitespace-nowrap text-right text-sm font-semibold text-amber-700">{s.kekurangan === null ? "—" : rupiah(s.kekurangan)}</TableCell>
                  <TableCell className="num whitespace-nowrap text-right text-sm text-red-600">{rupiah(s.total_keluar)}</TableCell>
                  <TableCell className={`num whitespace-nowrap text-right text-sm font-semibold ${s.profit_aktual < 0 ? "text-red-600" : "text-indigo-600"}`}>{rupiah(s.profit_aktual)}</TableCell>
                  <TableCell><StatusBadge s={s} /></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => setPay(s.id)} data-testid={`student-pay-${s.id}`}>
                        <Wallet className="mr-1 h-3.5 w-3.5" />Bayar
                      </Button>
                      <button onClick={() => setDlg({ open: true, student: s })} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`student-edit-${s.id}`} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDel(s)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" data-testid={`student-delete-${s.id}`} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <StudentDialog open={dlg.open} student={dlg.student} onOpenChange={(o) => setDlg((p) => ({ ...p, open: o }))} onSaved={refresh} />
      <TxDialog open={!!pay} onOpenChange={(o) => !o && setPay(null)} studentId={pay} jenis="masuk" onSaved={load} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete} title={`Hapus ${del?.nama}?`}
        description="Semua transaksi milik siswa ini juga akan dihapus dari Jurnal Umum." />
    </div>
  );
}
