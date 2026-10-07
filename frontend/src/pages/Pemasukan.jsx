import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/Common";
import { BukuSelect } from "@/components/BukuSelect";
import { TxDialog } from "@/components/TxDialog";
import { TxTable } from "@/components/TxTable";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { api, rupiah, shortRp, fmtMonth, errMsg } from "@/lib/api";

const ACCENTS = ["border-blue-900", "border-emerald-600", "border-indigo-500", "border-amber-500", "border-sky-500", "border-slate-500"];

export default function Pemasukan() {
  const [f, setF] = useState({ buku: "", start: "", end: "" });
  const [summary, setSummary] = useState([]);
  const [active, setActive] = useState("");
  const [rows, setRows] = useState([]);
  const [dlg, setDlg] = useState({ open: false, tx: null });
  const [del, setDel] = useState(null);

  const loadSummary = useCallback(() => api.get("/income-summary", { params: f }).then((r) => {
    setSummary(r.data);
    setActive((a) => a || r.data[0]?.kategori || "");
  }), [f]);
  const loadRows = useCallback(() => {
    if (!active) return;
    api.get("/transactions", { params: { ...f, jenis: "masuk", kategori: active } }).then((r) => setRows(r.data.items));
  }, [f, active]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadRows(); }, [loadRows]);
  const reload = () => { loadSummary(); loadRows(); };

  const total = summary.reduce((s, x) => s + x.total, 0);
  const cur = summary.find((s) => s.kategori === active);
  const chart = Object.entries(cur?.monthly || {}).slice(-12).map(([bulan, v]) => ({ bulan, total: v }));
  const doDelete = async () => {
    try { await api.delete(`/transactions/${del.id}`); toast.success("Transaksi dihapus"); reload(); } catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };

  return (
    <div>
      <PageHeader eyebrow="Rekap Otomatis" title="Pemasukan per Jenis" subtitle="Setiap jurnal masuk otomatis dikelompokkan di sini sesuai jenis pemasukannya — tidak perlu dicatat ulang.">
        <BukuSelect value={f.buku} onChange={(v) => setF((p) => ({ ...p, buku: v }))} testId="pemasukan-buku-filter" />
        <Input type="date" className="w-[150px] bg-white" value={f.start} onChange={(e) => setF((p) => ({ ...p, start: e.target.value }))} data-testid="pemasukan-start-date" />
        <Input type="date" className="w-[150px] bg-white" value={f.end} onChange={(e) => setF((p) => ({ ...p, end: e.target.value }))} data-testid="pemasukan-end-date" />
        <Link to="/pengaturan" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50" data-testid="pemasukan-manage-cat-link"><Settings2 className="h-4 w-4" />Kelola jenis</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s, i) => (
          <button key={s.kategori} onClick={() => setActive(s.kategori)} data-testid={`income-cat-${i}`}
            className={`fade-up rounded-xl border-l-4 bg-white p-5 text-left shadow-sm ring-1 transition-all duration-200 hover:shadow-md ${ACCENTS[i % ACCENTS.length]} ${active === s.kategori ? "ring-2 ring-blue-600" : "ring-slate-200"}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.kategori}</p>
            <p className="num mt-2 text-xl font-semibold text-slate-900">{rupiah(s.total)}</p>
            <p className="mt-1 text-xs text-slate-500">{s.count} transaksi · {total ? Math.round((s.total / total) * 100) : 0}%</p>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title={`Tren Bulanan · ${active}`}>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="bulan" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortRp} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => rupiah(v)} labelFormatter={fmtMonth} />
                <Bar dataKey="total" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={`Daftar Pemasukan · ${active}`} className="xl:col-span-2">
          <div className="max-h-[520px] overflow-y-auto">
            <TxTable items={rows} showSaldo={false} onEdit={(tx) => setDlg({ open: true, tx })} onDelete={setDel} />
          </div>
        </Panel>
      </div>
      <TxDialog open={dlg.open} tx={dlg.tx} onOpenChange={(o) => setDlg((p) => ({ ...p, open: o }))} onSaved={reload} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete} />
    </div>
  );
}
