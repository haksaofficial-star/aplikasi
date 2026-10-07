import axios from "axios";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && !e.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("hk_token");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(e);
  }
);

export function errMsg(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Terjadi kesalahan";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg?.replace("Value error, ", "") || JSON.stringify(x)).join(" ");
  return String(d);
}

export function rupiah(n) {
  if (n === null || n === undefined) return "—";
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? "-" : ""}Rp ${Math.abs(v).toLocaleString("id-ID")}`;
}

export function shortRp(n) {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)} M`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} jt`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)} rb`;
  return String(v);
}

export function fmtDate(s) {
  if (!s) return "—";
  try {
    return format(parseISO(s), "dd MMM yyyy", { locale: idLocale });
  } catch {
    return s;
  }
}

export function fmtMonth(s) {
  try {
    return format(parseISO(`${s}-01`), "MMM yy", { locale: idLocale });
  } catch {
    return s;
  }
}

export const today = () => format(new Date(), "yyyy-MM-dd");

export async function downloadExcel(buku = "") {
  const res = await api.get("/export/xlsx", { params: { buku }, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Jurnal_Hakusa_${today()}${buku ? `_${buku.replace(/\s+/g, "_")}` : ""}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
