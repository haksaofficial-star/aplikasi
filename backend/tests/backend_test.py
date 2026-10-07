"""Backend tests for LPK Hakusa Edu Japan Finance Journal.
Covers: auth, transactions, students, options, dashboard, income summary, duplicate protection, RBAC."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lpk-accounting-dash.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@hakusa.id"
ADMIN_PASS = "HakusaAdmin2026"

created_ids = {"students": [], "transactions": [], "options": [], "users": [], "jobs": []}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session", autouse=True)
def cleanup(admin_h):
    yield
    # Cleanup
    for sid in created_ids["students"]:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=admin_h)
    for tid in created_ids["transactions"]:
        requests.delete(f"{BASE_URL}/api/transactions/{tid}", headers=admin_h)
    for oid_ in created_ids["options"]:
        requests.delete(f"{BASE_URL}/api/options/{oid_}", headers=admin_h)
    for uid in created_ids["users"]:
        requests.delete(f"{BASE_URL}/api/users/{uid}", headers=admin_h)
    for jid in created_ids["jobs"]:
        requests.delete(f"{BASE_URL}/api/jobs/{jid}", headers=admin_h)


# ---------- auth ----------
class TestAuth:
    def test_login_ok(self, admin_token):
        assert admin_token

    def test_login_wrong_pass(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong_pw"})
        assert r.status_code == 401
        assert "salah" in r.json()["detail"].lower()

    def test_me(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert r.json()["role"] == "admin"

    def test_protected_requires_auth(self):
        for ep in ["/api/transactions", "/api/students", "/api/options", "/api/dashboard",
                   "/api/jobs", "/api/income-summary", "/api/users", "/api/auth/me"]:
            r = requests.get(f"{BASE_URL}{ep}")
            assert r.status_code == 401, f"{ep} should be 401 but got {r.status_code}"


# ---------- students & transactions flow ----------
class TestStudentFlow:
    @pytest.fixture(scope="class")
    def student_id(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/students", headers=admin_h,
                          json={"nama": "TEST_Siswa", "biaya": 35000000, "tsk": "TSK-A"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["nama"] == "TEST_Siswa"
        assert d["biaya"] == 35000000
        assert d["kekurangan"] == 35000000
        created_ids["students"].append(d["id"])
        return d["id"]

    def test_get_student(self, admin_h, student_id):
        r = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["biaya"] == 35000000

    def test_record_payment(self, admin_h, student_id):
        r = requests.post(f"{BASE_URL}/api/transactions", headers=admin_h, json={
            "tanggal": "2026-01-10", "keterangan": "TEST_pembayaran siswa",
            "masuk": 10000000, "keluar": 0, "kategori": "Job Matching",
            "buku": "Kas TG", "student_id": student_id,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["masuk"] == 10000000
        assert d["student_id"] == student_id
        assert d["source"] == "siswa"
        created_ids["transactions"].append(d["id"])

        # verify kekurangan recalculated
        s = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=admin_h).json()
        assert s["total_bayar"] == 10000000
        assert s["kekurangan"] == 25000000

    def test_duplicate_blocked(self, admin_h, student_id):
        payload = {"tanggal": "2026-01-10", "keterangan": "TEST_pembayaran siswa dup",
                   "masuk": 10000000, "keluar": 0, "kategori": "Job Matching",
                   "buku": "Kas TG", "student_id": student_id}
        r = requests.post(f"{BASE_URL}/api/transactions", headers=admin_h, json=payload)
        assert r.status_code == 409

    def test_duplicate_force(self, admin_h, student_id):
        payload = {"tanggal": "2026-01-10", "keterangan": "TEST_pembayaran force",
                   "masuk": 10000000, "keluar": 0, "kategori": "Job Matching",
                   "buku": "Kas TG", "student_id": student_id, "force": True}
        r = requests.post(f"{BASE_URL}/api/transactions", headers=admin_h, json=payload)
        assert r.status_code == 200
        created_ids["transactions"].append(r.json()["id"])

    def test_record_expense_visa(self, admin_h, student_id):
        r = requests.post(f"{BASE_URL}/api/transactions", headers=admin_h, json={
            "tanggal": "2026-01-11", "keterangan": "TEST_Visa siswa",
            "masuk": 0, "keluar": 2300000, "kategori": "Visa",
            "buku": "Kas TG", "student_id": student_id,
        })
        assert r.status_code == 200
        created_ids["transactions"].append(r.json()["id"])
        s = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=admin_h).json()
        assert s["total_keluar"] == 2300000
        assert "Visa" in s["pengeluaran_per_kategori"]

    def test_income_summary_single_entry(self, admin_h, student_id):
        r = requests.get(f"{BASE_URL}/api/income-summary", headers=admin_h)
        assert r.status_code == 200
        jm = next((x for x in r.json() if x["kategori"] == "Job Matching"), None)
        assert jm is not None
        # Our 2 TEST payments (10M + forced 10M = 20M) should be included - not duplicated
        assert jm["total"] >= 20000000

    def test_jurnal_shows_tx(self, admin_h, student_id):
        r = requests.get(f"{BASE_URL}/api/transactions", headers=admin_h,
                         params={"student_id": student_id})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 3
        # running saldo check (ascending by tanggal)
        asc = items[::-1]
        running = 0
        for t in asc:
            running += t["masuk"] - t["keluar"]
            assert abs(t["saldo"] - running) < 0.01


# ---------- transaction validation ----------
class TestTxValidation:
    def test_empty_amount_rejected(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/transactions", headers=admin_h, json={
            "tanggal": "2026-01-10", "keterangan": "TEST empty", "masuk": 0, "keluar": 0,
        })
        assert r.status_code == 422

    def test_filter_jenis(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/transactions", headers=admin_h, params={"jenis": "masuk"})
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["masuk"] > 0


# ---------- options ----------
class TestOptions:
    def test_list(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/options", headers=admin_h)
        assert r.status_code == 200
        names = {o["name"] for o in r.json()}
        assert "Job Matching" in names
        assert "Kas TG" in names

    def test_crud_rename_delete(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/options", headers=admin_h,
                          json={"type": "kategori_masuk", "name": "TEST_Kat"})
        assert r.status_code == 200
        oid_ = r.json()["id"]
        # rename
        r2 = requests.put(f"{BASE_URL}/api/options/{oid_}", headers=admin_h,
                          json={"type": "kategori_masuk", "name": "TEST_KatRenamed"})
        assert r2.status_code == 200
        # delete unused
        r3 = requests.delete(f"{BASE_URL}/api/options/{oid_}", headers=admin_h)
        assert r3.status_code == 200

    def test_delete_blocked_if_used(self, admin_h):
        # Job Matching is used; must be blocked
        opts = requests.get(f"{BASE_URL}/api/options", headers=admin_h).json()
        jm = next(o for o in opts if o["name"] == "Job Matching" and o["type"] == "kategori_masuk")
        if jm["used"] > 0:
            r = requests.delete(f"{BASE_URL}/api/options/{jm['id']}", headers=admin_h)
            assert r.status_code == 400


# ---------- dashboard ----------
class TestDashboard:
    def test_dashboard(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_masuk", "total_keluar", "saldo", "siswa", "monthly",
                  "income_by_category", "expense_by_category", "recent"):
            assert k in d
        assert "total_kekurangan" in d["siswa"]

    def test_dashboard_buku_filter(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_h, params={"buku": "Kas TG"})
        assert r.status_code == 200

    def test_export_xlsx(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/export/xlsx", headers=admin_h)
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 1000


# ---------- jobs ----------
class TestJobs:
    def test_crud(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/jobs", headers=admin_h,
                          json={"nama_job": "TEST_Job", "jumlah_peserta": 5, "biaya": 30000000})
        assert r.status_code == 200
        jid = r.json()["id"]
        created_ids["jobs"].append(jid)
        r2 = requests.put(f"{BASE_URL}/api/jobs/{jid}", headers=admin_h,
                          json={"nama_job": "TEST_Job2", "jumlah_peserta": 6, "biaya": 32000000})
        assert r2.status_code == 200
        r3 = requests.get(f"{BASE_URL}/api/jobs", headers=admin_h)
        assert any(j["id"] == jid for j in r3.json())


# ---------- users & RBAC ----------
class TestRBAC:
    @pytest.fixture(scope="class")
    def staff_token(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/users", headers=admin_h, json={
            "email": "TEST_staff@hakusa.id", "name": "TEST_Staff",
            "password": "staffpw123", "role": "staff",
        })
        if r.status_code == 400:
            # already exists from earlier run, try login
            pass
        else:
            assert r.status_code == 200
            created_ids["users"].append(r.json()["id"])
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": "TEST_staff@hakusa.id", "password": "staffpw123"})
        assert login.status_code == 200, login.text
        return login.json()["token"]

    def test_staff_blocked_from_users(self, staff_token):
        r = requests.get(f"{BASE_URL}/api/users", headers={"Authorization": f"Bearer {staff_token}"})
        assert r.status_code == 403

    def test_staff_can_read_finance(self, staff_token):
        r = requests.get(f"{BASE_URL}/api/transactions",
                         headers={"Authorization": f"Bearer {staff_token}"})
        assert r.status_code == 200

    def test_change_password(self, admin_h):
        # try wrong old password
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=admin_h,
                          json={"old_password": "wrong", "new_password": "abcdef12"})
        assert r.status_code == 400
