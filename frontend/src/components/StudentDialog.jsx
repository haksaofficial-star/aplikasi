import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/MoneyInput";
import { api, errMsg, rupiah } from "@/lib/api";

export const STATUSES = ["Proses", "Berangkat", "Selesai", "Batal"];
const EMPTY = {
  nama: "", job: "", tsk: "", no_hp: "", tanggal_daftar: "", biaya: 0, est_visa: 2300000, est_ktkln: 200000,
  est_mcu: 800000, est_tsk: 15000000, status: "Proses", catatan: "",
};

const F = ({ label, children, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-xs font-semibold text-slate-600">{label}</Label>
    {children}
  </div>
);

export const StudentDialog = ({ open, onOpenChange, student, onSaved }) => {
  const [f, setF] = useState(EMPTY);
  const [jobs, setJobs] = useState([]);
  useEffect(() => {
    if (!open) return;
    setF(student ? { ...EMPTY, ...student } : EMPTY);
    api.get("/jobs").then((r) => setJobs(r.data)).catch(() => {});
  }, [open, student]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const est = f.est_visa + f.est_ktkln + f.est_mcu + f.est_tsk;

  const save = async () => {
    const body = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k] ?? EMPTY[k]]));
    try {
      if (student?.id) await api.put(`/students/${student.id}`, body);
      else await api.post("/students", body);
      toast.success(student?.id ? "Data siswa diperbarui" : "Siswa ditambahkan");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-testid="student-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">{student?.id ? "Edit Siswa TG" : "Tambah Siswa TG"}</DialogTitle>
          <DialogDescription>Biaya job matching biasanya Rp 28.500.000 – Rp 35.000.000.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Nama Siswa"><Input value={f.nama} onChange={(e) => set("nama", e.target.value)} data-testid="student-nama-input" /></F>
          <F label="Job / Program">
            <Input list="job-list" value={f.job} onChange={(e) => set("job", e.target.value)} data-testid="student-job-input" />
            <datalist id="job-list">{jobs.map((j) => <option key={j.id} value={j.nama_job} />)}</datalist>
          </F>
          <F label="TSK / Perusahaan"><Input value={f.tsk} onChange={(e) => set("tsk", e.target.value)} data-testid="student-tsk-input" /></F>
          <F label="No. HP"><Input value={f.no_hp} onChange={(e) => set("no_hp", e.target.value)} data-testid="student-hp-input" /></F>
          <F label="Tanggal Daftar"><Input type="date" value={f.tanggal_daftar} onChange={(e) => set("tanggal_daftar", e.target.value)} data-testid="student-tanggal-input" /></F>
          <F label="Status">
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="student-status-select"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Biaya Job Matching" className="sm:col-span-2">
            <MoneyInput value={f.biaya} onChange={(v) => set("biaya", v)} data-testid="student-biaya-input" placeholder="mis. 35.000.000" />
            <div className="flex flex-wrap gap-2 pt-1">
              {[28500000, 30000000, 35000000].map((v) => (
                <button key={v} type="button" onClick={() => set("biaya", v)} data-testid={`student-biaya-preset-${v}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50">
                  {v.toLocaleString("id-ID")}
                </button>
              ))}
            </div>
          </F>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Estimasi Pengeluaran Utama</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <F label="Visa"><MoneyInput value={f.est_visa} onChange={(v) => set("est_visa", v)} data-testid="student-est-visa" /></F>
            <F label="KTKLN"><MoneyInput value={f.est_ktkln} onChange={(v) => set("est_ktkln", v)} data-testid="student-est-ktkln" /></F>
            <F label="MCU"><MoneyInput value={f.est_mcu} onChange={(v) => set("est_mcu", v)} data-testid="student-est-mcu" /></F>
            <F label="TSK (10–20 jt)"><MoneyInput value={f.est_tsk} onChange={(v) => set("est_tsk", v)} data-testid="student-est-tsk" /></F>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-slate-500">Total estimasi biaya: <b className="num text-slate-800">{rupiah(est)}</b></span>
            <span className="text-slate-500">Estimasi keuntungan:{" "}
              <b className={`num ${f.biaya - est >= 0 ? "text-emerald-700" : "text-red-600"}`} data-testid="student-est-profit">{f.biaya ? rupiah(f.biaya - est) : "—"}</b>
            </span>
          </div>
        </div>
        <F label="Catatan"><Textarea rows={2} value={f.catatan} onChange={(e) => set("catatan", e.target.value)} data-testid="student-catatan-input" /></F>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="student-cancel-btn">Batal</Button>
          <Button onClick={save} disabled={!f.nama.trim()} data-testid="student-save-btn">Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
