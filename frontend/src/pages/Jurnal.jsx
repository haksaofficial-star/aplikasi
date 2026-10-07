import { useCallback, useEffect, useState } from "react";
import { Download, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatCard, Panel } from "@/components/Common";
import { BukuSelect } from "@/components/BukuSelect";
import { TxDialog } from "@/components/TxDialog";
import { TxTable } from "@/components/TxTable";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { useOptions } from "@/context/OptionsContext";
import { api, rupiah, downloadExcel, errMsg } from "@/lib/api";

const PAGE = 50;

export default function Jurnal() {
  const { kategoriMasuk, kategoriKeluar } = useOptions();
  const [filters, setFilters] = useState({ buku: "", kategori: "", jenis: "", q: "", start: "", end: "" });
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [dlg, setDlg] = useState({ open: false, tx: null });
  const [del, setDel] = useState(null);

  const load = useCallback(() => api.get("/transactions", { params: filters }).then((r) => setData(r.data)), [filters]);
  useEffect(() => { setPage(0); load(); }, [load]);
  const set = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const cats = [...new Set([...kategoriMasuk, ...kategoriKeluar])];

  const doDelete = async () => {
    try { await api.delete(`/transactions/${del.id}`); toast.success("Transaksi dihapus"); load(); } catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };
  const items = data?.items || [];
  const pages = Math.max(1, Math.ceil(items.length / PAGE));

  return (
    <div>
      <PageHeader eyebrow="Buku Besar" title="Jurnal Umum" subtitle="Tanggal, item/keterangan, jurnal masuk, jurnal keluar dan saldo berjalan. Pembayaran siswa TG tercatat otomatis di sini.">
        <Button variant="outline" onClick={() => downloadExcel(filters.buku).catch((e) => toast.error(errMsg(e)))} data-testid="jurnal-export-btn"><Download className="mr-2 h-4 w-4" />Ekspor Excel</Button>
        <Button onClick={() => setDlg({ open: true, tx: null })} data-testid="add-jurnal-btn"><Plus className="mr-2 h-4 w-4" />Tambah Transaksi</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Jurnal Masuk (filter)" value={rupiah(data?.total_masuk)} tone="green" testId="jurnal-total-masuk" />
        <StatCard label="Jurnal Keluar (filter)" value={rupiah(data?.total_keluar)} tone="red" testId="jurnal-total-keluar" delay={60} />
        <StatCard label="Saldo Akhir" value={rupiah(data?.saldo_akhir)} tone={data?.saldo_akhir < 0 ? "red" : "blue"} testId="jurnal-saldo-akhir" hint={filters.buku || "Semua buku kas"} delay={120} />
      </div>
      <Panel className="mt-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari keterangan / nama siswa..." className="pl-9" value={filters.q} onChange={(e) => set("q", e.target.value)} data-testid="jurnal-search-input" />
          </div>
          <BukuSelect value={filters.buku} onChange={(v) => set("buku", v)} testId="jurnal-buku-filter" />
          <Select value={filters.jenis || "all"} onValueChange={(v) => set("jenis", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px]" data-testid="jurnal-jenis-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Masuk & Keluar</SelectItem><SelectItem value="masuk">Masuk saja</SelectItem><SelectItem value="keluar">Keluar saja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.kategori || "all"} onValueChange={(v) => set("kategori", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[170px]" data-testid="jurnal-kategori-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-[150px]" value={filters.start} onChange={(e) => set("start", e.target.value)} data-testid="jurnal-start-date" />
          <span className="text-xs text-slate-400">s/d</span>
          <Input type="date" className="w-[150px]" value={filters.end} onChange={(e) => set("end", e.target.value)} data-testid="jurnal-end-date" />
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ buku: "", kategori: "", jenis: "", q: "", start: "", end: "" })} data-testid="jurnal-reset-filter"><X className="mr-1 h-4 w-4" />Reset</Button>
          )}
        </div>
        <TxTable items={items.slice(page * PAGE, page * PAGE + PAGE)} onEdit={(tx) => setDlg({ open: true, tx })} onDelete={setDel} />
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span data-testid="jurnal-count">{data?.count ?? 0} transaksi · terbaru di atas</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="jurnal-prev-page">Sebelumnya</Button>
            <span className="num text-xs">{page + 1}/{pages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} data-testid="jurnal-next-page">Berikutnya</Button>
          </div>
        </div>
      </Panel>
      <TxDialog open={dlg.open} tx={dlg.tx} onOpenChange={(o) => setDlg((p) => ({ ...p, open: o }))} onSaved={load} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete}
        description={del?.student_id ? `Transaksi ini juga akan hilang dari buku siswa ${del.student_nama}.` : undefined} />
    </div>
  );
}
