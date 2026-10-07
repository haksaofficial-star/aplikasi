# PRD — Jurnal Keuangan LPK Hakusa Edu Japan

## Original problem statement
"saya ingin membuat dashboar jurnal keuangan untuk LPK Hakusa Edu Japan , kemudian ada tgl ,, item keterangan, jurnal masuk, jurnal keluar dan saldo , ter integrasi dengan siswa job matching yang bayar agar tdak berkali kali catatnya bsa keliru, dan pemasukan ini langsung tercatat d sheet lain untukj jenis pemasukan , , kemudian buatkan lagi untuk data TG anak yang sudah bayar job matching jurnal kluar masuk dan berapa kekurangannya , karena untuk range biaya job matching ,mereka 28.500.000 - 35.000.000 untuk pengeluaran utama adalah visa 2300.000, ktkln 200000, mcu 800.000, TSK 10.000.000-20.000.000 pokoknya keuntungan biasanya 8000.000-10.000.000 sih terserah di buat seperti apa app dashboardnya"
+ Excel attached (JURNAL FINANCE HAKUSA EDU.xlsx).

User choices: import JATIM + TG + Job Open sheets (not bangun kantor, N4, N5); admin email/password login, accounts created by admin only; income types Job Matching, Kursus/Kelas N4-N5, Lainnya (editable); Excel export; light professional look; everything editable.

## Architecture
- FastAPI (server.py, core.py, routes_auth, routes_finance, routes_students, routes_reports) + MongoDB; import_excel.py (one-time import from backend/data/jurnal_hakusa.xlsx, `--force` to reimport)
- React + shadcn + recharts; Bearer JWT in localStorage
- Single source of truth: `transactions` collection; student entries carry student_id → shown in Jurnal Umum, Pemasukan per Jenis and student ledger without re-entry. Duplicate (same student+date+amount) → 409 warning.

## User personas
- Owner/admin of LPK (manages accounts, all data); staff (input & view)

## Core requirements
- Jurnal Umum: tanggal, keterangan, masuk, keluar, saldo berjalan; filter; CRUD
- Pemasukan per Jenis auto-rekap
- Siswa TG: biaya JM, dibayar, kekurangan, pengeluaran (Visa/KTKLN/MCU/TSK), profit aktual & estimasi
- Editable categories/buku kas, Job Open, users, Excel export

## Implemented (2026-10-07)
- All of the above; imported 58 TG students (367 tx), 1131 JATIM tx, 15 jobs
- Tested: iteration_1 (23/23 backend + frontend), iteration_2 (login flow)

## Backlog
- P1: fill biaya job matching for imported students (biaya=0 → kekurangan not computed)
- P1: JATIM and TG sheets may contain the same payments twice (original Excel) — review via buku filter
- P2: some imported dates are wrong in source (e.g. 2029, 2016) or empty — edit manually
- P2: printable receipt (kwitansi) per payment; WhatsApp reminder for kekurangan
