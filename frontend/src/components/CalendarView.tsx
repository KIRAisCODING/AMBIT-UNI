import React, { useState } from 'react';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles, Check, Clock 
} from 'lucide-react';
import { BrainItem } from '../types';

interface CalendarViewProps {
  items: BrainItem[];
  onScheduleItem: (id: string, date: string) => void;
}

export default function CalendarView({ items, onScheduleItem }: CalendarViewProps) {
  // Current local time metadata tells us it is July 2026.
  // We'll hardcode July 2026 as the active calendar month to make it extremely accurate!
  const year = 2026;
  const monthIdx = 6; // July is 6 (0-indexed)
  const monthName = "July 2026";

  const [selectedDateStr, setSelectedDateStr] = useState("2026-07-06"); // Defaults to Today: July 6th, 2026

  // Generate days grid for July 2026
  // July 1st, 2026 is a Wednesday.
  // 1st Wed, 2nd Thu, 3rd Fri, 4th Sat, 5th Sun, 6th Mon (Today)
  // Let's create an array representing the calendar days grid (including padding).
  const daysInMonth = 31;
  const startDayOffset = 3; // Wednesday (0 for Sun, 1 for Mon, 2 for Tue, 3 for Wed)

  const calendarGrid = [];
  
  // Padding for previous month (June 2026 ends on Tuesday June 30th)
  for (let i = startDayOffset - 1; i >= 0; i--) {
    calendarGrid.push({
      dayNum: 30 - i,
      isCurrentMonth: false,
      dateStr: `2026-06-${30 - i}`
    });
  }

  // Active Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const paddedDay = d < 10 ? `0${d}` : d;
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr: `2026-07-${paddedDay}`
    });
  }

  // Padding for next month
  const totalSlotsNeeded = 42; // 6 rows of 7 days
  const remainingSlots = totalSlotsNeeded - calendarGrid.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const paddedDay = d < 10 ? `0${d}` : d;
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: false,
      dateStr: `2026-08-${paddedDay}`
    });
  }

  // Items scheduled for any date
  const getItemsForDate = (dateStr: string) => {
    return items.filter(it => it.scheduledDate === dateStr);
  };

  // Currently selected date scheduled items
  const selectedDateItems = getItemsForDate(selectedDateStr);

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-headline font-bold text-textPrimary mb-1">
          Calendar Planner
        </h2>
        <p className="text-sm text-textSecondary">
          Align ideas with time. Schedule captured notes, journals, and tasks to organize your schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid (Col Span 2) */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 canvas-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-textPrimary font-headline">{monthName}</h3>
            <div className="flex items-center gap-1">
              <span className="text-xs bg-pill text-textSecondary font-mono px-3 py-1 rounded-full font-semibold">
                Spark Workspace Active
              </span>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-textSecondary mb-3">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((slot, index) => {
              const isToday = slot.dateStr === "2026-07-06";
              const isSelected = slot.dateStr === selectedDateStr;
              const dateItems = getItemsForDate(slot.dateStr);
              const hasItems = dateItems.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDateStr(slot.dateStr)}
                  className={`min-h-[80px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-textPrimary bg-textPrimary/5'
                      : slot.isCurrentMonth
                        ? 'border-border bg-surface hover:border-textSecondary/45'
                        : 'border-border bg-surfaceSecondary opacity-40 hover:opacity-70'
                  }`}
                >
                  {/* Day Number and Today Indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${
                      isToday 
                        ? 'bg-pill-active text-pill-active-text px-1.5 py-0.5 rounded' 
                        : isSelected ? 'text-textPrimary' : 'text-textSecondary'
                    }`}>
                      {slot.dayNum}
                    </span>
                    {isToday && <span className="text-[8px] uppercase tracking-widest font-bold text-textPrimary font-sans">TODAY</span>}
                  </div>

                  {/* Tiny Item List or Dot indicator */}
                  {hasItems && (
                    <div className="mt-2 flex flex-col gap-1 overflow-hidden">
                      {/* Short list on desktop/tablet, dot on mobile */}
                      <div className="hidden sm:flex flex-col gap-0.5 max-h-[44px] overflow-hidden">
                        {dateItems.slice(0, 2).map(it => (
                          <div 
                            key={it.id} 
                            className={`text-[9px] font-medium rounded px-1 py-0.5 truncate border ${
                              it.type === 'Task' 
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/20 text-[#ba1a1a] dark:text-red-300' 
                                : 'bg-surfaceSecondary border-border text-textPrimary'
                            }`}
                          >
                            {it.completed ? '✓ ' : ''}{it.smartSummary || it.content}
                          </div>
                        ))}
                        {dateItems.length > 2 && (
                          <div className="text-[8px] font-semibold text-textSecondary pl-1">
                            +{dateItems.length - 2} more
                          </div>
                        )}
                      </div>
                      <div className="sm:hidden flex justify-center">
                        <span className="w-2 h-2 rounded-full bg-pill-active block" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Pane (Col Span 1) */}
        <div className="bg-surface border border-border rounded-2xl p-6 canvas-shadow flex flex-col justify-between min-h-[400px]">
          <div>
            {/* Header */}
            <div className="border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                <Clock size={13} />
                <span>Selected Schedule</span>
              </div>
              <h3 className="text-base font-bold text-textPrimary font-headline">
                {new Date(selectedDateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>

            {/* List */}
            {selectedDateItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <CalendarDays size={24} className="text-textSecondary/40 mb-2" />
                <p className="text-xs text-textSecondary font-medium">No items scheduled for this day.</p>
                <p className="text-[10px] text-textSecondary/70 mt-1 max-w-[180px]">
                  Go to Inbox, select a task card, and set a date to schedule it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-surfaceSecondary border border-border rounded-xl flex items-start gap-3 shadow-sm hover:border-textSecondary/45 transition-all"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      item.type === 'Task' ? 'bg-red-500' : 'bg-pill-active'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-textSecondary">
                          {item.type}
                        </span>
                        {item.smartSummary && (
                          <div className="flex items-center gap-1 text-[9px] text-yellow-600 dark:text-yellow-400 font-semibold bg-yellow-50 dark:bg-yellow-950/20 px-1.5 py-0.5 rounded">
                            <Sparkles size={8} />
                            <span>AI Summary</span>
                          </div>
                        )}
                      </div>
                      {item.smartSummary && (
                        <h4 className="text-xs font-bold text-textPrimary truncate mb-0.5">{item.smartSummary}</h4>
                      )}
                      <p className={`text-xs text-textPrimary leading-relaxed break-words ${
                        item.completed ? 'line-through text-textSecondary/40' : ''
                      }`}>
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Quick-Ref Info */}
          <div className="bg-surfaceSecondary/50 border border-border p-4 rounded-xl mt-6">
            <h4 className="text-xs font-bold text-textPrimary mb-1">Workspace Schedule Info</h4>
            <p className="text-[10px] text-textSecondary leading-normal">
              July 2026 is fully simulated. This schedule links to your browser's persistent sandbox so your changes remain saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
