import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ConfirmDelete = ({ open, onOpenChange, title = "Hapus data?", description, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent data-testid="confirm-delete-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description || "Data yang dihapus tidak bisa dikembalikan."}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="confirm-delete-cancel">Batal</AlertDialogCancel>
        <AlertDialogAction
          data-testid="confirm-delete-ok"
          className="bg-red-600 text-white hover:bg-red-700"
          onClick={onConfirm}
        >
          Ya, hapus
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
