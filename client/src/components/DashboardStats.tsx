import { useMemo } from "react";
import { Bill } from "@shared/schema";
import { Banknote, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  bills: Bill[];
}

export function DashboardStats({ bills }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const total = bills.reduce((acc, bill) => acc + Number(bill.amount), 0);
    const paid = bills
      .filter(b => b.status === "paid")
      .reduce((acc, bill) => acc + Number(bill.amount), 0);
    const unpaid = total - paid;
    
    // Count overdue bills
    const today = new Date();
    const overdueCount = bills.filter(b => 
      b.status === "unpaid" && new Date(b.dueDate) < today
    ).length;

    return { total, paid, unpaid, overdueCount };
  }, [bills]);

  const formatRupiah = (val: number) => 
    new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Card 1: Total Unpaid (Primary Focus) */}
      <div className="glass-card bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white border-none shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/20 transition-all duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-indigo-100 font-medium text-sm bg-indigo-400/30 px-2 py-1 rounded-lg">Bulan Ini</span>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Banknote className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-indigo-100 text-sm mb-1">Sisa Tagihan</p>
          <h3 className="text-3xl font-display font-bold tracking-tight">{formatRupiah(stats.unpaid)}</h3>
          
          {stats.overdueCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold bg-rose-500/20 border border-rose-400/30 text-rose-100 py-1.5 px-3 rounded-lg w-fit">
              <AlertCircle className="w-3 h-3" />
              {stats.overdueCount} Tagihan Terlambat
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Total Paid */}
      <div className="glass-card bg-white p-6 border-slate-100 relative overflow-hidden hover:shadow-lg transition-all">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-500 font-medium text-sm">Sudah Bayar</span>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <h3 className="text-2xl font-display font-bold text-slate-800">{formatRupiah(stats.paid)}</h3>
        <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-right">
          {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}% Terbayar
        </p>
      </div>

      {/* Card 3: Total Estimated */}
      <div className="glass-card bg-white p-6 border-slate-100 hover:shadow-lg transition-all">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-500 font-medium text-sm">Total Estimasi</span>
          <div className="p-2 bg-slate-50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-slate-500" />
          </div>
        </div>
        <h3 className="text-2xl font-display font-bold text-slate-800">{formatRupiah(stats.total)}</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Total semua tagihan yang terdaftar di bulan ini.
        </p>
      </div>
    </div>
  );
}
