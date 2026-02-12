import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDeleteBill, useUpdateBill } from "@/hooks/use-bills";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Trash2, Edit, CreditCard, Wallet, ArrowRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { BillForm } from "./BillForm";
import { cn } from "@/lib/utils";
import type { Bill, BillStatusColor } from "@shared/schema";

interface BillDetailDialogProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  statusColor: BillStatusColor;
}

export function BillDetailDialog({ bill, isOpen, onClose, statusColor }: BillDetailDialogProps) {
  const { toast } = useToast();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!bill) return null;

  const isPaid = bill.status === "paid";
  
  const handlePaymentToggle = async (checked: boolean) => {
    try {
      await updateBill.mutateAsync({
        id: bill.id,
        status: checked ? "paid" : "unpaid"
      });
      toast({
        title: checked ? "Lunas!" : "Status Diubah",
        description: checked ? "Tagihan ditandai sudah dibayar." : "Tagihan ditandai belum dibayar.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupdate status tagihan",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (confirm("Yakin ingin menghapus tagihan ini?")) {
      try {
        await deleteBill.mutateAsync(bill.id);
        toast({ title: "Terhapus", description: "Tagihan berhasil dihapus" });
        onClose();
      } catch (error) {
        toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
      }
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl gap-0">
          <div className={cn(
            "p-6 text-white bg-gradient-to-br",
            isPaid ? "from-gray-500 to-gray-600" :
            statusColor === 'red' ? "from-red-500 to-red-600" :
            statusColor === 'yellow' ? "from-amber-400 to-orange-500" :
            "from-emerald-500 to-emerald-600"
          )}>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <StatusBadge statusColor={statusColor} isPaid={isPaid} className="bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-none" />
            </div>
            
            <h2 className="text-2xl font-display font-bold mb-1">{bill.title}</h2>
            <p className="text-white/80 font-medium">{bill.category}</p>
            
            <div className="mt-6">
              <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-1">Total Tagihan</p>
              <div className="text-4xl font-bold font-display tracking-tight">
                {formatRupiah(Number(bill.amount))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white">
            <div className="space-y-6">
              {/* Payment Checklist Section */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Checklist Pembayaran
                </h3>
                
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-all hover:border-primary/50">
                  <Checkbox 
                    id="paid-check" 
                    checked={isPaid}
                    onCheckedChange={(checked) => handlePaymentToggle(checked === true)}
                    className="w-6 h-6 rounded-md border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label 
                      htmlFor="paid-check" 
                      className={cn(
                        "text-base font-medium cursor-pointer",
                        isPaid && "line-through text-muted-foreground"
                      )}
                    >
                      {isPaid ? "Sudah Dibayar" : "Tandai Sudah Bayar"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isPaid ? "Reminder dimatikan" : "Klik jika pembayaran selesai"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Due Date Info */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Jatuh Tempo</p>
                    <p className="text-slate-500">
                      {format(new Date(bill.dueDate), "EEEE, d MMMM yyyy", { locale: id })}
                    </p>
                    {!isPaid && (
                      <p className={cn(
                        "text-xs font-semibold mt-0.5",
                        statusColor === 'red' ? "text-red-600" :
                        statusColor === 'yellow' ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {new Date(bill.dueDate) < new Date() ? "Lewat Jatuh Tempo" : formatDistanceToNow(new Date(bill.dueDate), { addSuffix: true, locale: id })}
                      </p>
                    )}
                  </div>
                </div>

                {bill.invoiceUrl && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Invoice / Dokumen</p>
                      <a 
                        href={bill.invoiceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        Lihat Dokumen
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-11"
                onClick={() => {
                  setIsEditOpen(true);
                  // Don't close parent yet, wait for edit to finish or cancel
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                className="w-12 rounded-xl h-11 px-0"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BillForm 
        open={isEditOpen} 
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) onClose(); // Close detail dialog when edit closes
        }}
        initialData={bill}
      />
    </>
  );
}
