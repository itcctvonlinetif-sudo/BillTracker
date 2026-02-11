import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBillSchema } from "@shared/schema";
import { z } from "zod";
import { useCreateBill, useUpdateBill } from "@/hooks/use-bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form schema - we need to adapt a bit for the form (numbers as strings etc)
const formSchema = insertBillSchema.extend({
  amount: z.string().min(1, "Jumlah harus diisi"),
  dueDate: z.coerce.date(),
});

type FormData = z.infer<typeof formSchema>;

interface BillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any; // Partial bill for editing
}

const CATEGORIES = [
  "Internet & TV", "Listrik (PLN)", "Air (PDAM)", "Sewa Rumah/Kos", 
  "Cicilan Bank", "Kartu Kredit", "Asuransi", "Langganan App", "Lainnya"
];

export function BillForm({ open, onOpenChange, initialData }: BillFormProps) {
  const { toast } = useToast();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  
  const isEditing = !!initialData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      amount: initialData?.amount ? String(initialData.amount) : "",
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(),
      category: initialData?.category || "Lainnya",
      isRecurring: initialData?.isRecurring || false,
      recurringInterval: initialData?.recurringInterval || "monthly",
      status: initialData?.status || "unpaid",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateBill.mutateAsync({ 
          id: initialData.id, 
          ...data 
        });
        toast({ title: "Berhasil", description: "Tagihan berhasil diperbarui" });
      } else {
        await createBill.mutateAsync(data);
        toast({ title: "Berhasil", description: "Tagihan baru berhasil dibuat" });
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ 
        title: "Gagal", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const isPending = createBill.isPending || updateBill.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Edit Tagihan" : "Tambah Tagihan Baru"}
          </DialogTitle>
          <DialogDescription>
            Isi detail tagihan di bawah ini untuk mulai tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nama Tagihan</Label>
            <Input 
              id="title" 
              placeholder="Contoh: Wifi Indihome" 
              {...form.register("title")} 
              className="rounded-lg"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah (Rp)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="150000" 
                {...form.register("amount")}
                className="rounded-lg"
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select 
                onValueChange={(val) => form.setValue("category", val)}
                defaultValue={form.getValues("category")}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Jatuh Tempo</Label>
            <Input 
              id="dueDate" 
              type="date" 
              {...form.register("dueDate")}
              // Format date string YYYY-MM-DD for input type="date"
              value={form.watch("dueDate") instanceof Date 
                ? form.watch("dueDate").toISOString().split('T')[0] 
                : form.watch("dueDate") as string}
              className="rounded-lg"
            />
             {form.formState.errors.dueDate && (
              <p className="text-xs text-red-500">{form.formState.errors.dueDate.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="isRecurring" 
              checked={form.watch("isRecurring")}
              onCheckedChange={(checked) => form.setValue("isRecurring", checked === true)}
            />
            <Label htmlFor="isRecurring" className="text-sm font-normal cursor-pointer">
              Tagihan rutin setiap bulan (Recurring)
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Simpan Perubahan" : "Buat Tagihan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
