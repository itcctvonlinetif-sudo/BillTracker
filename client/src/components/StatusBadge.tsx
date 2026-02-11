import { cn } from "@/lib/utils";
import { BillStatusColor } from "@shared/schema";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface StatusBadgeProps {
  statusColor: BillStatusColor;
  isPaid: boolean;
  className?: string;
}

export function StatusBadge({ statusColor, isPaid, className }: StatusBadgeProps) {
  if (isPaid) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200",
        className
      )}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        Lunas
      </div>
    );
  }

  switch (statusColor) {
    case "red":
      return (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 animate-pulse",
          className
        )}>
          <AlertCircle className="w-3.5 h-3.5" />
          Segera Bayar
        </div>
      );
    case "yellow":
      return (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200",
          className
        )}>
          <Clock className="w-3.5 h-3.5" />
          Mendekati
        </div>
      );
    case "green":
      return (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200",
          className
        )}>
          <Clock className="w-3.5 h-3.5" />
          Aman
        </div>
      );
    default:
      return null;
  }
}
