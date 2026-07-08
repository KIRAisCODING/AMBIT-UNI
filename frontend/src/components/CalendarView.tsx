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
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonthIdx, setCurrentMonthIdx] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const monthName = new Date(currentYear, currentMonthIdx).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    if (currentMonthIdx === 0) {
      setCurrentMonthIdx(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIdx(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIdx === 11) {
      setCurrentMonthIdx(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIdx(prev => prev + 1);
    }
  };

  const calendarGrid = [];
  
  // July 2026 starts:
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const startDayOffset = new Date(currentYear, currentMonthIdx, 1).getDay();

  // Padding for previous month
  const prevMonthDays = new Date(currentYear, currentMonthIdx, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const prevMonth = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
    const prevYear = currentMonthIdx === 0 ? currentYear - 1 : currentYear;
    const dayVal = prevMonthDays - i;
    const paddedDay = dayVal < 10 ? `0${dayVal}` : dayVal;
    const paddedMonth = (prevMonth + 1) < 10 ? `0${prevMonth + 1}` : (prevMonth + 1);
    calendarGrid.push({
      dayNum: dayVal,
      isCurrentMonth: false,
      dateStr: `${prevYear}-${paddedMonth}-${paddedDay}`
    });
  }

  // Active Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const paddedDay = d < 10 ? `0${d}` : d;
    const paddedMonth = (currentMonthIdx + 1) < 10 ? `0${currentMonthIdx + 1}` : (currentMonthIdx + 1);
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr: `${currentYear}-${paddedMonth}-${paddedDay}`
    });
  }

  // Padding for next month
  const totalSlotsNeeded = 42; // 6 rows of 7 days
  const remainingSlots = totalSlotsNeeded - calendarGrid.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const nextMonth = currentMonthIdx === 11 ? 0 : currentMonthIdx + 1;
    const nextYear = currentMonthIdx === 11 ? currentYear + 1 : currentYear;
    const paddedDay = d < 10 ? `0${d}` : d;
    const paddedMonth = (nextMonth + 1) < 10 ? `0${nextMonth + 1}` : (nextMonth + 1);
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: false,
      dateStr: `${nextYear}-${paddedMonth}-${paddedDay}`
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
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-textPrimary font-headline">{monthName}</h3>
              <div className="flex items-center gap-1 bg-pill p-0.5 rounded-lg border border-border">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-1 hover:bg-surface rounded text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={handleNextMonth} 
                  className="p-1 hover:bg-surface rounded text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
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
              const isToday = slot.dateStr === todayStr;
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
                <Clock size={20} />
                <span>Selected Schedule</span>
              </div>
              <h3 className="text-base font-bold text-textPrimary font-headline">
                {new Date(selectedDateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>

            {/* List */}
            {selectedDateItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <CalendarDays size={20} className="text-textSecondary/40 mb-2" />
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
                            <Sparkles size={20} />
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
              This calendar planner is fully live and connected to your database workspace. Scheduling a task date updates the record in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
