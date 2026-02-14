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
import { Loader2, Upload, Link as LinkIcon, Volume2, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schema - we need to adapt a bit for the form (numbers as strings etc)
const formSchema = insertBillSchema.extend({
  amount: z.string().min(1, "Jumlah harus diisi"),
  dueDate: z.coerce.date(),
  invoiceUrl: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface BillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any; // Partial bill for editing
}

const CATEGORIES = [
  "Internet & TV", "Listrik (PLN)", "Air (PDAM)", "Sewa Rumah/Kos", 
  "Cicilan Bank", "Kartu Kredit", "Asuransi", "Langganan App",
  "Kontrak Kerja", "Lisensi Software", "Perjanjian Sewa", "Lainnya"
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
      invoiceUrl: initialData?.invoiceUrl || "",
      reminderSoundInterval: initialData?.reminderSoundInterval || 120,
      status: initialData?.status || "unpaid",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        invoiceUrl: data.invoiceUrl || null,
        recurringInterval: data.isRecurring ? data.recurringInterval : null
      };
      if (isEditing) {
        await updateBill.mutateAsync({ 
          id: initialData.id, 
          ...payload 
        });
        toast({ title: "Berhasil", description: "Tagihan berhasil diperbarui" });
      } else {
        await createBill.mutateAsync(payload);
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
      <DialogContent className="sm:max-w-[450px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Edit Tagihan" : "Tambah Tagihan Baru"}
          </DialogTitle>
          <DialogDescription>
            Isi detail tagihan di bawah ini untuk mulai tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Section: Basic Info */}
          <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <Label htmlFor="title">Nama Tagihan</Label>
              <Input 
                id="title" 
                placeholder="Contoh: Wifi Indihome" 
                {...form.register("title")} 
                className="rounded-lg bg-white border-slate-200"
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
                  className="rounded-lg bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select 
                  onValueChange={(val) => form.setValue("category", val)}
                  defaultValue={form.getValues("category")}
                >
                  <SelectTrigger className="rounded-lg bg-white border-slate-200">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-md z-[100]">
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
                value={form.watch("dueDate") instanceof Date 
                  ? form.watch("dueDate").toISOString().split('T')[0] 
                  : form.watch("dueDate") as string}
                className="rounded-lg bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Section: Document Upload */}
          <div className="space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Invoice / Dokumen
            </Label>
            <Tabs defaultValue={form.watch("invoiceUrl")?.startsWith("http") ? "link" : "upload"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                <TabsTrigger value="upload" className="rounded-lg text-xs py-1.5 flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Upload
                </TabsTrigger>
                <TabsTrigger value="link" className="rounded-lg text-xs py-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3" /> Link
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-2">
                <Input 
                  type="file" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fakeUrl = URL.createObjectURL(file);
                      form.setValue("invoiceUrl", fakeUrl);
                      toast({ title: "File Terpilih", description: file.name });
                    }
                  }}
                  className="rounded-lg bg-white border-slate-200 cursor-pointer h-10 py-1.5"
                />
              </TabsContent>
              <TabsContent value="link" className="mt-2">
                <Input 
                  type="url" 
                  placeholder="https://link-ke-dokumen.com" 
                  {...form.register("invoiceUrl")} 
                  className="rounded-lg bg-white border-slate-200"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Section: Notifications */}
          <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Pengaturan Notifikasi (Status Merah)
            </Label>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <Label htmlFor="reminderSoundInterval" className="text-[11px] text-slate-500">Interval Suara (Menit)</Label>
                  <Input 
                    id="reminderSoundInterval" 
                    type="number" 
                    {...form.register("reminderSoundInterval", { valueAsNumber: true })}
                    className="h-9 rounded-lg bg-white border-slate-200 mt-1"
                    placeholder="120"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-white/50 p-3 rounded-xl border border-slate-100">
              <Checkbox 
                id="isRecurring" 
                checked={form.watch("isRecurring")}
                onCheckedChange={(checked) => form.setValue("isRecurring", checked === true)}
              />
              <Label htmlFor="isRecurring" className="text-sm font-medium cursor-pointer">
                Aktifkan Tagihan Rutin (Recurring)
              </Label>
            </div>

            {form.watch("isRecurring") && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="recurringInterval" className="text-xs">Interval Pengulangan</Label>
                <Select 
                  onValueChange={(val) => form.setValue("recurringInterval", val)}
                  defaultValue={form.getValues("recurringInterval") || "monthly"}
                >
                  <SelectTrigger className="rounded-lg bg-white border-slate-200 h-10">
                    <SelectValue placeholder="Pilih interval" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-md z-[100]">
                    <SelectItem value="monthly">Setiap Bulan (1 Bln)</SelectItem>
                    <SelectItem value="3-months">Setiap 3 Bulan</SelectItem>
                    <SelectItem value="6-months">Setiap 6 Bulan</SelectItem>
                    <SelectItem value="yearly">Setiap Tahun (1 Thn)</SelectItem>
                    <SelectItem value="2-years">Setiap 2 Tahun</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl flex-1"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="rounded-xl flex-1 bg-primary hover:bg-primary/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Simpan" : "Buat Tagihan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { FileText } from "lucide-react";
