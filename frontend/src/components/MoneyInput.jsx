import { Input } from "@/components/ui/input";

export const MoneyInput = ({ value, onChange, ...props }) => {
  const display = value ? Number(value).toLocaleString("id-ID") : "";
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
      <Input
        {...props}
        inputMode="numeric"
        className="num pl-9"
        value={display}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
    </div>
  );
};
