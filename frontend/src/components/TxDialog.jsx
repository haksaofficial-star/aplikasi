import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/MoneyInput";
import { useOptions } from "@/context/OptionsContext";
import { api, errMsg, today } from "@/lib/api";

const PRESETS = [
  { k: "Visa", amt: 2300000 },
  { k: "KTKLN", amt: 200000 },
  { k: "MCU", amt: 800000 },
  { k: "TSK", amt: 0 },
];

function initForm(tx, jenis, studentId, opts) {
  if (tx) {
    return { ...tx, jenis: tx.masuk > 0 ? "masuk" : "keluar", jumlah: tx.masuk > 0 ? tx.masuk : tx.keluar };
  }
  const isMasuk = jenis === "masuk";
  return {
    tanggal: today(), keterangan: "", ref: "", jenis, jumlah: 0,
    kategori: studentId && isMasuk ? "Job Matching" : (isMasuk ? opts.kategoriMasuk[0] : opts.kategoriKeluar[0]) || "",
    buku: studentId ? (opts.buku.find((b) => b.includes("TG")) || opts.buku[0] || "") : opts.buku[0] || "",
    student_id: studentId || null,
  };
}

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-slate-600">{label}</Label>
    {children}
  </div>
);

const Pick = ({ value, onChange, items, testId, placeholder }) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className="max-h-72">
      {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export const TxDialog = ({ open, onOpenChange, tx, jenis = "masuk", studentId, onSaved }) => {
  const opts = useOptions();
  const [f, setF] = useState(() => initForm(tx, jenis, studentId, opts));
  const [dup, setDup] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setF(initForm(tx, jenis, studentId, opts)); setDup(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tx, jenis, studentId]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setJenis = (j) => setF((p) => ({ ...p, jenis: j, kategori: (j === "masuk" ? opts.kategoriMasuk : opts.kategoriKeluar)[0] || "" }));
  const cats = f.jenis === "masuk" ? opts.kategoriMasuk : opts.kategoriKeluar;

  const save = async (force = false) => {
    setSaving(true);
    const body = {
      tanggal: f.tanggal, keterangan: f.keterangan, ref: f.ref || "", kategori: f.kategori, buku: f.buku,
      student_id: f.student_id || null, masuk: f.jenis === "masuk" ? f.jumlah : 0,
      keluar: f.jenis === "keluar" ? f.jumlah : 0, force,
    };
    try {
      if (tx?.id) await api.put(`/transactions/${tx.id}`, body);
      else await api.post("/transactions", body);
      toast.success(tx?.id ? "Transaksi diperbarui" : "Transaksi tercatat di Jurnal Umum");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      if (e.response?.status === 409) setDup(true);
      else toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg" data-testid="tx-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">{tx?.id ? "Edit Transaksi" : "Catat Transaksi"}</DialogTitle>
          <DialogDescription>Satu kali catat — otomatis masuk Jurnal Umum, rekap pemasukan & buku siswa.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {["masuk", "keluar"].map((j) => (
            <button key={j} type="button" data-testid={`tx-jenis-${j}`} onClick={() => setJenis(j)}
              className={`rounded-md py-2 text-sm font-semibold transition-colors ${f.jenis === j
                ? (j === "masuk" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "text-slate-600 hover:bg-white"}`}>
              {j === "masuk" ? "Jurnal Masuk" : "Jurnal Keluar"}
            </button>
          ))}
        </div>
        {f.jenis === "keluar" && f.student_id && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.k} type="button" data-testid={`tx-preset-${p.k.toLowerCase()}`}
                onClick={() => setF((s) => ({ ...s, kategori: p.k, keterangan: s.keterangan || `Biaya ${p.k}`, jumlah: p.amt || s.jumlah }))}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
                {p.k}{p.amt ? ` · ${p.amt.toLocaleString("id-ID")}` : ""}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal">
            <Input type="date" value={f.tanggal} onChange={(e) => set("tanggal", e.target.value)} data-testid="tx-tanggal-input" />
          </Field>
          <Field label="Jumlah">
            <MoneyInput value={f.jumlah} onChange={(v) => set("jumlah", v)} data-testid="tx-jumlah-input" placeholder="0" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Item / Keterangan">
              <Input value={f.keterangan} onChange={(e) => set("keterangan", e.target.value)} data-testid="tx-keterangan-input" placeholder="mis. Pembayaran ke-2 job matching" />
            </Field>
          </div>
          <Field label={f.jenis === "masuk" ? "Jenis Pemasukan" : "Kategori Pengeluaran"}>
            <Pick value={f.kategori} onChange={(v) => set("kategori", v)} testId="tx-kategori-select" placeholder="Pilih kategori"
              items={cats.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Buku Kas">
            <Pick value={f.buku} onChange={(v) => set("buku", v)} testId="tx-buku-select" placeholder="Pilih buku kas"
              items={opts.buku.map((c) => ({ value: c, label: c }))} />
          </Field>
          {!studentId && (
            <Field label="Terkait Siswa TG (opsional)">
              <Pick value={f.student_id || "none"} onChange={(v) => set("student_id", v === "none" ? null : v)} testId="tx-siswa-select"
                items={[{ value: "none", label: "— Tidak terkait —" }, ...opts.students.map((s) => ({ value: s.id, label: s.nama }))]} />
            </Field>
          )}
          <Field label="Ref / No. Bukti (opsional)">
            <Input value={f.ref || ""} onChange={(e) => set("ref", e.target.value)} data-testid="tx-ref-input" />
          </Field>
        </div>
        {dup && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" data-testid="tx-duplicate-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              Transaksi dengan tanggal & jumlah yang sama sudah tercatat untuk siswa ini. Yakin ini bukan catatan ganda?
              <Button size="sm" variant="outline" className="mt-2 border-amber-300 bg-white" onClick={() => save(true)} data-testid="tx-force-save-btn">
                Tetap simpan
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="tx-cancel-btn">Batal</Button>
          <Button onClick={() => save(false)} disabled={saving || !f.jumlah || !f.keterangan.trim()} data-testid="tx-save-btn">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
