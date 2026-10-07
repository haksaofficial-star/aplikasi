import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOptions } from "@/context/OptionsContext";

export const BukuSelect = ({ value, onChange, testId = "buku-filter" }) => {
  const { buku } = useOptions();
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-[170px] bg-white" data-testid={testId}>
        <SelectValue placeholder="Semua Buku Kas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Buku Kas</SelectItem>
        {buku.map((b) => (
          <SelectItem key={b} value={b}>
            {b}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
