import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptions } from "@/context/OptionsContext";
import { api, errMsg } from "@/lib/api";

const OptionRow = ({ o, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(o.name);
  const save = async () => {
    try { await api.put(`/options/${o.id}`, { type: o.type, name }); toast.success("Nama diperbarui (transaksi ikut diperbarui)"); setEditing(false); onChanged(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/options/${o.id}`); toast.success("Dihapus"); onChanged(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5" data-testid={`option-row-${o.id}`}>
      {editing ? (
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" data-testid={`option-edit-input-${o.id}`} autoFocus />
      ) : (
        <div><p className="text-sm font-medium text-slate-800">{o.name}</p><p className="text-[11px] text-slate-400">{o.used} transaksi</p></div>
      )}
      <div className="flex shrink-0 gap-1">
        {editing ? (
          <>
            <button onClick={save} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" data-testid={`option-save-${o.id}`} aria-label="Simpan"><Check className="h-4 w-4" /></button>
            <button onClick={() => { setEditing(false); setName(o.name); }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Batal"><X className="h-4 w-4" /></button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`option-edit-${o.id}`} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
            <button onClick={remove} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" data-testid={`option-delete-${o.id}`} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
      </div>
    </div>
  );
};

export const OptionList = ({ type, title, hint }) => {
  const { options, reload } = useOptions();
  const [name, setName] = useState("");
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/options", { type, name }); setName(""); toast.success("Ditambahkan"); reload(); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid={`option-list-${type}`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {options.filter((o) => o.type === type).map((o) => <OptionRow key={o.id} o={o} onChanged={reload} />)}
      </div>
      <form onSubmit={add} className="flex gap-2 border-t border-slate-100 p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tambah baru..." className="h-9" data-testid={`option-add-input-${type}`} />
        <Button type="submit" size="sm" disabled={!name.trim()} data-testid={`option-add-btn-${type}`}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  );
};
