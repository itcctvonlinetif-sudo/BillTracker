import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, isSameDay, isWithinInterval, subDays, differenceInDays, addMonths, addYears } from "date-fns";
import { id } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { Bill, BillStatusColor, Settings as SharedSettings } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  bills: Bill[];
  onSelectDate: (date: Date) => void;
  onSelectBill: (bill: Bill) => void;
  selectedDate: Date | undefined;
}

// Helper to check if a bill is paid considering projection
function isPaidStatus(bill: Bill) {
  return bill.status === "paid";
}

// Logic for status color
export function getBillStatusColor(bill: Bill, referenceDate: Date = new Date()): BillStatusColor {
  if (isPaidStatus(bill)) return "gray";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(bill.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffDays = differenceInDays(dueDate, today);

  if (diffDays <= 2) return "red"; // H-2 to H-0 or overdue (today is H-0)
  if (diffDays <= 7) return "yellow"; // H-7 to H-3
  return "green"; // > H-7
}

export function CalendarView({ bills, onSelectDate, onSelectBill, selectedDate }: CalendarViewProps) {
  const { data: settings } = useQuery<SharedSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    // Play sound alert for RED status if sound is enabled and within browser permissions
    const redBills = bills.filter(b => getBillStatusColor(b) === 'red');
    
    if (redBills.length > 0 && settings?.isSoundEnabled && !settings?.isMuted) {
      const playAlert = () => {
        const soundUrl = settings.alertSoundUrl;
        if (!soundUrl) return null;
        
        const audio = new Audio(soundUrl);
        audio.volume = 0.5;
        // Loop the sound as requested (continuous until paid or muted)
        audio.loop = true;
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
          console.log("Audio playback blocked. Click anywhere on the page to enable sound alerts.");
        });
        return audio;
      };
      
      const audioInstance = playAlert();
      
      return () => {
        if (audioInstance) {
          audioInstance.pause();
          audioInstance.src = "";
          audioInstance.load();
        }
      };
    }
  }, [bills, settings?.isSoundEnabled, settings?.isMuted, settings?.alertSoundUrl]);

  // Custom render for day content to show dots
  const DayContent = ({ date }: { date: Date }) => {
    // Show actual bills and projected recurring bills
    const dayBills = bills.flatMap(bill => {
      const dueDate = new Date(bill.dueDate);
      if (isSameDay(dueDate, date)) return [bill];
      
      // Projection logic for recurring items up to 1 year
      if (bill.isRecurring) {
        let nextDate = new Date(dueDate);
        const limitDate = addYears(new Date(), 1);
        
        while (nextDate <= limitDate) {
          if (bill.recurringInterval === 'monthly') nextDate = addMonths(nextDate, 1);
          else if (bill.recurringInterval === '3-months') nextDate = addMonths(nextDate, 3);
          else if (bill.recurringInterval === '6-months') nextDate = addMonths(nextDate, 6);
          else if (bill.recurringInterval === 'yearly') nextDate = addYears(nextDate, 1);
          else if (bill.recurringInterval === '2-years') nextDate = addYears(nextDate, 2);
          else break;
          
          if (isSameDay(nextDate, date)) {
            return [{ ...bill, dueDate: nextDate, status: 'unpaid' as const }];
          }
          if (nextDate > date) break;
        }
      }
      return [];
    });
    
    // Sort by urgency: red > yellow > green > gray
    const sortedBills = dayBills.sort((a, b) => {
      const colorOrder = { red: 0, yellow: 1, green: 2, gray: 3 };
      return colorOrder[getBillStatusColor(a)] - colorOrder[getBillStatusColor(b)];
    });

    return (
      <div className="relative w-full h-full flex items-center justify-center group">
        <span className="text-sm font-medium z-10 group-hover:text-primary transition-colors">
          {format(date, "d")}
        </span>
        
        {/* Bill indicators */}
        <div className="absolute bottom-1 flex gap-0.5 justify-center w-full">
          {sortedBills.slice(0, 3).map((bill) => {
            const color = getBillStatusColor(bill, new Date());
            const isDueOrOverdue = !isPaidStatus(bill) && differenceInDays(new Date(bill.dueDate), new Date()) <= 0;
            
            return (
              <div 
                key={bill.id} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-transform hover:scale-150",
                  color === 'red' ? "bg-red-500" :
                  color === 'yellow' ? "bg-amber-400" :
                  color === 'green' ? "bg-emerald-500" :
                  "bg-gray-400",
                  isDueOrOverdue && "animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]"
                )}
              />
            );
          })}
          {sortedBills.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
      <style>{`
        .rdp {
          margin: 0;
          width: 100%;
        }
        .rdp-months {
          width: 100%;
        }
        .rdp-month {
          width: 100%;
        }
        .rdp-nav_button { 
          color: #64748b; 
          background: #f1f5f9;
          border-radius: 8px;
        }
        .rdp-nav_button:hover { 
          background: #e2e8f0;
          color: #0f172a;
        }
        .rdp-head_cell {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
      
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(day) => day && onSelectDate(day)}
        locale={id}
        showOutsideDays
        fixedWeeks
        components={{
          DayContent: (props) => <DayContent date={props.date} />,
          IconLeft: () => <ChevronLeft className="w-5 h-5" />,
          IconRight: () => <ChevronRight className="w-5 h-5" />,
        }}
        classNames={{
          month: "space-y-4 w-full",
          caption: "flex justify-between pt-1 relative items-center mb-4 px-2",
          caption_label: "text-lg font-display font-bold text-slate-800 capitalize",
          nav: "space-x-1 flex items-center",
          table: "w-full border-collapse space-y-1",
          head_row: "flex w-full",
          head_cell: "text-slate-400 rounded-md flex-1 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/5 [&:has([aria-selected].day-outside)]:bg-primary/50 flex-1",
          day: cn(
            "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex items-center justify-center",
          ),
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl shadow-lg shadow-primary/30",
          day_today: "bg-slate-100 text-slate-900 font-bold border-2 border-slate-200 rounded-xl",
          day_outside: "text-slate-300 opacity-50",
          day_disabled: "text-slate-300 opacity-50",
          day_hidden: "invisible",
        }}
      />
      
      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-medium text-slate-600 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <span>Segera (H-2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <span>Mendekati (H-7)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span>Aman</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
          <span>Lunas</span>
        </div>
      </div>
    </div>
  );
}
