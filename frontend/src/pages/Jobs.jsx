import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/Common";
import { MoneyInput } from "@/components/MoneyInput";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { api, rupiah, errMsg } from "@/lib/api";

const EMPTY = { nama_job: "", tsk: "", status: "open", jumlah_peserta: 0, lolos: 0, tidak_lolos: 0, biaya: 0, catatan: "" };

const JobDialog = ({ open, onOpenChange, job, onSaved }) => {
  const [f, setF] = useState(EMPTY);
  useEffect(() => { if (open) setF(job ? { ...EMPTY, ...job } : EMPTY); }, [open, job]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    const body = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k]]));
    try {
      if (job?.id) await api.put(`/jobs/${job.id}`, body); else await api.post("/jobs", body);
      toast.success("Job disimpan"); onOpenChange(false); onSaved();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const num = (k, label) => (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={f[k]} onChange={(e) => set(k, Number(e.target.value) || 0)} data-testid={`job-${k}-input`} /></div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="job-dialog">
        <DialogHeader><DialogTitle className="font-heading">{job?.id ? "Edit Job" : "Tambah Job"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Nama Job</Label><Input value={f.nama_job} onChange={(e) => set("nama_job", e.target.value)} data-testid="job-nama-input" /></div>
          <div className="space-y-1.5"><Label className="text-xs">TSK</Label><Input value={f.tsk} onChange={(e) => set("tsk", e.target.value)} data-testid="job-tsk-input" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Status</Label><Input value={f.status} onChange={(e) => set("status", e.target.value)} data-testid="job-status-input" placeholder="open / close / mensetsu" /></div>
          {num("jumlah_peserta", "Jumlah Peserta")}{num("lolos", "Lolos")}{num("tidak_lolos", "Tidak Lolos")}
          <div className="space-y-1.5"><Label className="text-xs">Biaya / Shokai</Label><MoneyInput value={f.biaya} onChange={(v) => set("biaya", v)} data-testid="job-biaya-input" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Catatan</Label><Input value={f.catatan} onChange={(e) => set("catatan", e.target.value)} data-testid="job-catatan-input" /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button onClick={save} disabled={!f.nama_job.trim()} data-testid="job-save-btn">Simpan</Button></div>
      </DialogContent>
    </Dialog>
  );
};

const statusCls = (s) => (s || "").toLowerCase().includes("close") ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [dlg, setDlg] = useState({ open: false, job: null });
  const [del, setDel] = useState(null);
  const load = useCallback(() => api.get("/jobs").then((r) => setJobs(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const doDelete = async () => { await api.delete(`/jobs/${del.id}`).catch((e) => toast.error(errMsg(e))); setDel(null); load(); };

  return (
    <div>
      <PageHeader eyebrow="Lowongan" title="Job Open" subtitle="Daftar job dan TSK untuk job matching (diimpor dari sheet Job Open).">
        <Button onClick={() => setDlg({ open: true, job: null })} data-testid="add-job-btn"><Plus className="mr-2 h-4 w-4" />Tambah Job</Button>
      </PageHeader>
      <Panel>
        <div className="overflow-x-auto">
          <Table data-testid="jobs-table">
            <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Nama Job</TableHead><TableHead>TSK</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-center">Peserta</TableHead><TableHead className="text-center">Lolos</TableHead><TableHead className="text-center">Tidak Lolos</TableHead>
              <TableHead className="text-right">Biaya</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {jobs.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">Belum ada job</TableCell></TableRow>}
              {jobs.map((j) => (
                <TableRow key={j.id} data-testid={`job-row-${j.id}`}>
                  <TableCell className="font-medium text-slate-800">{j.nama_job}</TableCell>
                  <TableCell className="text-sm text-slate-600">{j.tsk}</TableCell>
                  <TableCell><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls(j.status)}`}>{j.status || "—"}</span></TableCell>
                  <TableCell className="num text-center">{j.jumlah_peserta}</TableCell>
                  <TableCell className="num text-center text-emerald-700">{j.lolos}</TableCell>
                  <TableCell className="num text-center text-red-600">{j.tidak_lolos}</TableCell>
                  <TableCell className="num whitespace-nowrap text-right">{j.biaya ? rupiah(j.biaya) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => setDlg({ open: true, job: j })} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`job-edit-${j.id}`} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDel(j)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" data-testid={`job-delete-${j.id}`} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <JobDialog open={dlg.open} job={dlg.job} onOpenChange={(o) => setDlg((p) => ({ ...p, open: o }))} onSaved={load} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete} />
    </div>
  );
}
