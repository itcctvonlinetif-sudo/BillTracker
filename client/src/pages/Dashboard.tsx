import { useState } from "react";
import { useBills } from "@/hooks/use-bills";
import { CalendarView, getBillStatusColor } from "@/components/CalendarView";
import { DashboardStats } from "@/components/DashboardStats";
import { BillForm } from "@/components/BillForm";
import { BillDetailDialog } from "@/components/BillDetailDialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Search, Calendar as CalendarIcon, FileText, ShieldCheck } from "lucide-react";
import { format, isSameDay, addMonths, addYears } from "date-fns";
import { id } from "date-fns/locale";
import type { Bill } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bills, isLoading, error } = useBills();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Optional: auto-scroll to list section if on mobile
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-slate-500 font-medium">Memuat Tagihan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-600">Gagal memuat data. Silakan coba lagi nanti.</p>
        </div>
      </div>
    );
  }

  const allBills = bills || [];
  
  // Get bills on selected date, including projected recurring ones
  const billsOnSelectedDate = allBills.flatMap(bill => {
    const dueDate = new Date(bill.dueDate);
    if (isSameDay(dueDate, selectedDate)) return [bill];
    
    if (bill.isRecurring) {
      let nextDate = new Date(dueDate);
      const limitDate = addYears(new Date(), 1);
      
      while (nextDate <= limitDate) {
        if (bill.recurringInterval === 'monthly') nextDate = addMonths(nextDate, 1);
        else if (bill.recurringInterval === 'yearly') nextDate = addYears(nextDate, 1);
        else break;
        
        if (isSameDay(nextDate, selectedDate)) {
          return [{ ...bill, dueDate: nextDate, status: 'unpaid' as const }];
        }
        if (nextDate > selectedDate) break;
      }
    }
    return [];
  });

  // Filter bills for search list (if searching)
  const filteredBills = searchTerm 
    ? allBills.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : billsOnSelectedDate;

  const displayBills = searchTerm ? filteredBills : billsOnSelectedDate;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold font-display">
              B
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">
              BillTracker
            </h1>
          </div>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="btn-primary shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Tambah Tagihan</span>
            <span className="sm:hidden">Baru</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-slate-900">
            Halo, Pembayar Setia 👋
          </h2>
          <p className="text-slate-500 mt-1">
            Jangan lupa bayar tagihan tepat waktu ya!
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardStats bills={allBills} />

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Calendar Section (Left/Top) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-slate-800">Kalender Tagihan</h3>
            </div>
            <CalendarView 
              bills={allBills} 
              onSelectDate={handleDateSelect} 
              onSelectBill={setSelectedBill}
              selectedDate={selectedDate}
            />
          </div>

          {/* Side Panel: Daily List (Right/Bottom) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari nama tagihan..." 
                className="pl-10 bg-white border-slate-200 rounded-xl h-11 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">
                  {searchTerm ? "Hasil Pencarian" : format(selectedDate, "d MMMM yyyy", { locale: id })}
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  {displayBills.length} Tagihan
                </span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {displayBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada tagihan</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {searchTerm 
                        ? "Coba kata kunci lain" 
                        : "Klik tanggal lain di kalender atau tambah tagihan baru."}
                    </p>
                  </div>
                ) : (
                  displayBills.map((bill) => {
                    const statusColor = getBillStatusColor(bill);
                    return (
                      <button
                        key={bill.id}
                        onClick={() => setSelectedBill(bill)}
                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 group-hover:text-primary transition-colors">
                            {bill.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                              {bill.category}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm font-medium font-mono text-slate-600">
                              Rp {Number(bill.amount).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <StatusBadge statusColor={statusColor} isPaid={bill.status === "paid"} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Categories Help */}
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Manajemen Kontrak
              </h4>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Gunakan kategori <b>Kontrak Kerja</b> atau <b>Lisensi</b> untuk memantau masa berlaku dokumen penting Anda di kalender.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <BillForm 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
      />
      
      <BillDetailDialog 
        isOpen={!!selectedBill} 
        onClose={() => setSelectedBill(null)}
        bill={selectedBill}
        statusColor={selectedBill ? getBillStatusColor(selectedBill) : 'green'}
      />
    </div>
  );
}
