import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const OptionsContext = createContext(null);

export function OptionsProvider({ children }) {
  const [options, setOptions] = useState([]);
  const [students, setStudents] = useState([]);

  const reload = useCallback(async () => {
    const [o, s] = await Promise.all([api.get("/options"), api.get("/students")]);
    setOptions(o.data);
    setStudents(s.data.map((x) => ({ id: x.id, nama: x.nama })));
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const names = (type) => options.filter((o) => o.type === type).map((o) => o.name);
  const value = {
    options,
    students,
    reload,
    kategoriMasuk: names("kategori_masuk"),
    kategoriKeluar: names("kategori_keluar"),
    buku: names("buku"),
  };
  return <OptionsContext.Provider value={value}>{children}</OptionsContext.Provider>;
}

export const useOptions = () => useContext(OptionsContext);
