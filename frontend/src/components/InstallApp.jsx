import { useEffect, useState } from "react";
import { Smartphone, Share, PlusSquare } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

let deferredPrompt = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event("hk-installable"));
  });
}

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const Step = ({ n, icon: Icon, children }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">{n}</span>
    <p className="pt-1 text-sm text-slate-700">{children} {Icon && <Icon className="ml-1 inline h-4 w-4 text-blue-700" />}</p>
  </div>
);

export const InstallApp = () => {
  const [installed, setInstalled] = useState(isStandalone());
  const [help, setHelp] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const onReady = () => force((x) => x + 1);
    const onInstalled = () => { setInstalled(true); toast.success("Aplikasi terpasang di layar utama"); };
    window.addEventListener("hk-installable", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("hk-installable", onReady); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!deferredPrompt) return setHelp(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === "accepted") setInstalled(true);
  };

  return (
    <>
      <button onClick={install} data-testid="install-app-btn"
        className="mx-3 mb-1 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-left transition-colors hover:bg-blue-100">
        <Smartphone className="h-5 w-5 shrink-0 text-blue-800" />
        <span>
          <span className="block text-sm font-semibold text-blue-900">Pasang di HP</span>
          <span className="block text-[11px] text-blue-700/80">Buka seperti aplikasi biasa</span>
        </span>
      </button>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="sm:max-w-md" data-testid="install-help-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Pasang Hakusa Jurnal di HP</DialogTitle>
            <DialogDescription>Ikon akan muncul di layar utama dan terbuka layar penuh seperti aplikasi.</DialogDescription>
          </DialogHeader>
          {isIOS() ? (
            <div className="space-y-3" data-testid="install-help-ios">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">iPhone / iPad (Safari)</p>
              <Step n={1} icon={Share}>Ketuk tombol Bagikan di bawah layar</Step>
              <Step n={2} icon={PlusSquare}>Pilih "Tambah ke Layar Utama"</Step>
              <Step n={3}>Ketuk "Tambah" di pojok kanan atas</Step>
            </div>
          ) : (
            <div className="space-y-3" data-testid="install-help-android">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Android (Chrome)</p>
              <Step n={1}>Ketuk menu titik tiga ⋮ di kanan atas Chrome</Step>
              <Step n={2}>Pilih "Instal aplikasi" atau "Tambahkan ke layar utama"</Step>
              <Step n={3}>Ketuk "Instal"</Step>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
