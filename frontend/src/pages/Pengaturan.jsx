import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel } from "@/components/Common";
import { OptionList } from "@/components/OptionList";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";

const Users = () => {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "staff" });
  const [del, setDel] = useState(null);
  const load = useCallback(() => api.get("/users").then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/users", f); toast.success("Akun dibuat"); setF({ name: "", email: "", password: "", role: "staff" }); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const resetPw = async (u) => {
    const pw = window.prompt(`Password baru untuk ${u.email} (min. 6 karakter):`);
    if (!pw) return;
    try { await api.put(`/users/${u.id}/password`, { password: pw }); toast.success("Password diganti"); } catch (err) { toast.error(errMsg(err)); }
  };
  const doDelete = async () => { try { await api.delete(`/users/${del.id}`); load(); } catch (err) { toast.error(errMsg(err)); } setDel(null); };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel title="Daftar Akun" className="lg:col-span-2">
        <div className="divide-y divide-slate-100">
          {list.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3" data-testid={`user-row-${u.id}`}>
              <div>
                <p className="text-sm font-semibold text-slate-800">{u.name} <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-blue-800">{u.role}</span></p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => resetPw(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`user-reset-${u.id}`} aria-label="Reset password"><KeyRound className="h-4 w-4" /></button>
                {u.id !== user.id && <button onClick={() => setDel(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" data-testid={`user-delete-${u.id}`} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Buat Akun Baru">
        <form onSubmit={add} className="space-y-3 p-5">
          <Input placeholder="Nama" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="user-name-input" required />
          <Input placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="user-email-input" required />
          <Input placeholder="Password (min. 6)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="user-password-input" required minLength={6} />
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}>
            <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="staff">Staff (input & lihat data)</SelectItem><SelectItem value="admin">Admin (kelola akun)</SelectItem></SelectContent>
          </Select>
          <Button type="submit" className="w-full" data-testid="user-create-btn"><UserPlus className="mr-2 h-4 w-4" />Buat Akun</Button>
        </form>
      </Panel>
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} onConfirm={doDelete} title={`Hapus akun ${del?.email}?`} />
    </div>
  );
};

const MyAccount = () => {
  const [f, setF] = useState({ old_password: "", new_password: "" });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/change-password", f); toast.success("Password berhasil diganti"); setF({ old_password: "", new_password: "" }); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <Panel title="Ganti Password" className="max-w-md">
      <form onSubmit={save} className="space-y-3 p-5">
        <Input type="password" placeholder="Password lama" value={f.old_password} onChange={(e) => setF({ ...f, old_password: e.target.value })} data-testid="old-password-input" required />
        <Input type="password" placeholder="Password baru (min. 6)" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} data-testid="new-password-input" required minLength={6} />
        <Button type="submit" data-testid="change-password-btn">Simpan Password</Button>
      </form>
    </Panel>
  );
};

export default function Pengaturan() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader eyebrow="Atur Sesuai Kebutuhan" title="Pengaturan" subtitle="Ubah jenis pemasukan, kategori pengeluaran, buku kas, dan akun pengguna. Mengganti nama kategori otomatis memperbarui semua transaksinya." />
      <Tabs defaultValue="kategori">
        <TabsList className="mb-5 bg-white shadow-sm ring-1 ring-slate-200">
          <TabsTrigger value="kategori" data-testid="tab-kategori">Kategori & Buku Kas</TabsTrigger>
          {user.role === "admin" && <TabsTrigger value="users" data-testid="tab-users">Pengguna</TabsTrigger>}
          <TabsTrigger value="akun" data-testid="tab-akun">Akun Saya</TabsTrigger>
        </TabsList>
        <TabsContent value="kategori">
          <div className="grid gap-6 lg:grid-cols-3">
            <OptionList type="kategori_masuk" title="Jenis Pemasukan" hint="Dipakai untuk rekap Pemasukan per Jenis" />
            <OptionList type="kategori_keluar" title="Kategori Pengeluaran" hint="Visa, KTKLN, MCU, TSK, operasional, dll." />
            <OptionList type="buku" title="Buku Kas" hint="Mis. Kas JATIM, Kas TG, rekening bank" />
          </div>
        </TabsContent>
        {user.role === "admin" && <TabsContent value="users"><Users /></TabsContent>}
        <TabsContent value="akun"><MyAccount /></TabsContent>
      </Tabs>
    </div>
  );
}
