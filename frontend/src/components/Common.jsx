export const PageHeader = ({ eyebrow, title, subtitle, children }) => (
  <div className="fade-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl" data-testid="page-title">
        {title}
      </h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

const TONES = {
  blue: "text-blue-900 bg-blue-50 ring-blue-100",
  green: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  red: "text-red-600 bg-red-50 ring-red-100",
  amber: "text-amber-700 bg-amber-50 ring-amber-100",
  indigo: "text-indigo-600 bg-indigo-50 ring-indigo-100",
  slate: "text-slate-700 bg-slate-100 ring-slate-200",
};

export const StatCard = ({ label, value, hint, icon: Icon, tone = "slate", testId, delay = 0 }) => (
  <div
    className="fade-up rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {Icon && (
        <span className={`rounded-lg p-2 ring-1 ${TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
    <p className={`num mt-3 whitespace-nowrap text-xl font-semibold sm:text-2xl xl:text-lg 2xl:text-xl ${TONES[tone].split(" ")[0]}`} data-testid={testId}>
      {value}
    </p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const Panel = ({ title, action, children, className = "" }) => (
  <div className={`fade-up rounded-xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);
