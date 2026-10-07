import { Link } from "react-router-dom";
import { Pencil, Trash2, UserRound } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupiah, fmtDate } from "@/lib/api";

export const TxTable = ({ items, onEdit, onDelete, showStudent = true, showSaldo = true }) => (
  <div className="overflow-x-auto">
    <Table data-testid="tx-table">
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="w-[110px]">Tanggal</TableHead>
          <TableHead>Item / Keterangan</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead className="text-right">Jurnal Masuk</TableHead>
          <TableHead className="text-right">Jurnal Keluar</TableHead>
          {showSaldo && <TableHead className="text-right">Saldo</TableHead>}
          <TableHead className="w-[84px] text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">Belum ada transaksi</TableCell>
          </TableRow>
        )}
        {items.map((t) => (
          <TableRow key={t.id} className="group" data-testid={`tx-row-${t.id}`}>
            <TableCell className="num whitespace-nowrap text-xs text-slate-500">{fmtDate(t.tanggal)}</TableCell>
            <TableCell className="min-w-[220px]">
              <p className="text-sm font-medium text-slate-800">{t.keterangan}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span>{t.buku}</span>
                {t.ref && <span>· {t.ref}</span>}
                {showStudent && t.student_id && (
                  <Link to={`/siswa/${t.student_id}`} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600 hover:bg-indigo-100" data-testid={`tx-student-link-${t.id}`}>
                    <UserRound className="h-3 w-3" />{t.student_nama}
                  </Link>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{t.kategori || "—"}</span>
            </TableCell>
            <TableCell className="num whitespace-nowrap text-right text-sm font-medium text-emerald-700">{t.masuk ? rupiah(t.masuk) : ""}</TableCell>
            <TableCell className="num whitespace-nowrap text-right text-sm font-medium text-red-600">{t.keluar ? rupiah(t.keluar) : ""}</TableCell>
            {showSaldo && (
              <TableCell className={`num whitespace-nowrap text-right text-sm font-semibold ${t.saldo < 0 ? "text-red-600" : "text-slate-900"}`}>{rupiah(t.saldo)}</TableCell>
            )}
            <TableCell className="text-right">
              <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                <button onClick={() => onEdit(t)} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`tx-edit-${t.id}`} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(t)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" data-testid={`tx-delete-${t.id}`} aria-label="Hapus">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
