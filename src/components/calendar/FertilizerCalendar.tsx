'use client';

import { useState, memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, CalendarDays } from 'lucide-react';

interface FertilizerEvent {
  id: string;
  plantName: string;
  plantId: string;
  date: string;
  type: 'fertilize';
}

interface FertilizerCalendarProps {
  events?: FertilizerEvent[];
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl shadow-sm border border-slate-200/70 bg-white/70 backdrop-blur p-4 ${className}`}>
    {children}
  </div>
);

const Chip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
    {children}
  </span>
);

const IconBtn = ({ children, onClick, label, className = "" }: { 
  children: React.ReactNode; 
  onClick: () => void; 
  label: string; 
  className?: string; 
}) => (
  <button
    aria-label={label}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition h-10 w-10 ${className}`}
  >
    {children}
  </button>
);

const SectionHeader = ({ 
  icon: Icon, 
  title, 
  actions 
}: { 
  icon: React.ElementType; 
  title: string; 
  actions?: React.ReactNode; 
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-5 w-5 text-slate-500 flex-shrink-0" />
      <h3 className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide truncate">{title}</h3>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
  </div>
);

export default memo(function FertilizerCalendar({ events = [] }: FertilizerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };
  
  // Memoize calendar grid — only recompute when month, year, or events change
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: (null | { day: number; dateString: string; events: FertilizerEvent[]; isToday: boolean })[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(event => event.date === dateString);
      const isToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;

      days.push({ day, dateString, events: dayEvents, isToday });
    }
    return days;
  }, [currentMonth, currentYear, events, todayDate, todayMonth, todayYear]);
  
  // Filter events for current month (memoized to avoid recalculating on every render)
  // Parse YYYY-MM-DD strings with explicit parts to avoid timezone offset issues
  const monthEvents = useMemo(() => 
    events.filter(event => {
      const [year, month] = event.date.split('-').map(Number);
      return (month - 1) === currentMonth && year === currentYear;
    }),
    [events, currentMonth, currentYear]
  );
  
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">🗓️ Care Calendar</h2>
      <SectionHeader
        icon={CalendarDays}
        title={`${monthNames[currentMonth]} ${currentYear} - Fertilizer Schedule`}
        actions={
          <div className="flex gap-2">
            <IconBtn label="Previous month" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Next month" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </IconBtn>
          </div>
        }
      />
      
      <div className="mt-4 grid grid-cols-7 gap-0.5 sm:gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <div key={day} className="text-center text-slate-500 font-medium py-1">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{['S','M','T','W','T','F','S'][i]}</span>
          </div>
        ))}
        
        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const { day, dateString, events: dayEvents, isToday } = dayData;
          const hasFertilizer = dayEvents.length > 0;
          const isSelected = selectedDay === dateString;
          
          return (
            <div
              key={`day-${day}`}
              role={hasFertilizer ? 'button' : undefined}
              tabIndex={hasFertilizer ? 0 : undefined}
              onClick={() => {
                if (hasFertilizer) {
                  setSelectedDay(isSelected ? null : dateString);
                }
              }}
              onKeyDown={(e) => {
                if (hasFertilizer && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setSelectedDay(isSelected ? null : dateString);
                }
              }}
              aria-label={hasFertilizer ? `${day}: ${dayEvents.length} plant${dayEvents.length !== 1 ? 's' : ''} due` : undefined}
              className={`aspect-square rounded-xl border text-slate-700 relative p-1 transition-colors ${
                isSelected ? 'border-amber-400 bg-amber-50/70 ring-1 ring-amber-300' :
                isToday ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
              } ${hasFertilizer ? 'cursor-pointer hover:border-amber-300 hover:bg-amber-50/30' : ''}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-emerald-600 font-semibold' : 'text-slate-500'
                }`}
              >
                {day}
              </div>
              
              {hasFertilizer && (
                <div className="flex flex-col gap-0.5">
                  {/* On mobile (< sm): show dot indicators; on larger screens: show event chips */}
                  <div className="hidden sm:flex sm:flex-col sm:gap-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <Chip
                        key={event.id}
                        className="bg-amber-50 text-amber-700 ring-amber-200 text-[10px] truncate"
                      >
                        <FlaskConical className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                        {event.plantName.length > 8 
                          ? `${event.plantName.substring(0, 8)}…` 
                          : event.plantName
                        }
                      </Chip>
                    ))}
                    {dayEvents.length > 2 && (
                      <Chip className="bg-slate-50 text-slate-600 ring-slate-200 text-[10px]">
                        +{dayEvents.length - 2} more
                      </Chip>
                    )}
                  </div>
                  {/* Mobile: compact dot indicators with count */}
                  <div className="flex sm:hidden items-center justify-center gap-0.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" title={`${dayEvents.length} plant${dayEvents.length > 1 ? 's' : ''} due`} />
                    {dayEvents.length > 1 && (
                      <span className="text-[10px] font-medium text-amber-600">{dayEvents.length}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Selected Day Detail */}
      {selectedDay && (() => {
        const dayEvents = events.filter(e => e.date === selectedDay);
        if (dayEvents.length === 0) return null;
        const [y, m, d] = selectedDay.split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        });
        return (
          <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-amber-800">{label}</h4>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-amber-400 hover:text-amber-600 transition-colors p-1"
                aria-label="Close day detail"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm">
                  <FlaskConical className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-slate-800">{event.plantName}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Fertilize due
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block border border-emerald-500" /> Today
        </span>
      </div>

      {monthEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            This Month&apos;s Schedule ({monthEvents.length} plants)
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {monthEvents
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-slate-800">{event.plantName}</span>
                </div>
                <div className="text-slate-500 text-xs">
                  {/* Parse date parts to avoid timezone offset shifting the displayed day */}
                  {(() => {
                    const [y, m, d] = event.date.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});