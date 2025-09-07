'use client';

import { useState } from 'react';
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
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-slate-500" />
      <h3 className="text-sm font-semibold text-slate-700 tracking-wide">{title}</h3>
    </div>
    <div className="flex items-center gap-2">{actions}</div>
  </div>
);

export default function FertilizerCalendar({ events = [] }: FertilizerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
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
  
  // Get first day of month and days in month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = lastDayOfMonth.getDate();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(event => event.date === dateString);
    const isToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;
    
    calendarDays.push({
      day,
      dateString,
      events: dayEvents,
      isToday
    });
  }
  
  const displayEvents = events;
  
  // Filter events for current month
  const monthEvents = displayEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
  });
  
  return (
    <Card>
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
      
      <div className="mt-4 grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-slate-500 font-medium py-1">
            {day}
          </div>
        ))}
        
        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const { day, events: dayEvents, isToday } = dayData;
          const hasFertilizer = dayEvents.length > 0;
          
          return (
            <div
              key={`day-${day}`}
              className={`aspect-square rounded-xl border text-slate-700 relative p-1 ${
                isToday ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <div
                className={`absolute top-1 right-1 text-[10px] ${
                  isToday ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
              
              {hasFertilizer && (
                <div className="mt-5 flex flex-col gap-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <Chip
                      key={event.id}
                      className="bg-amber-50 text-amber-700 ring-amber-200 text-[9px] truncate"
                    >
                      <FlaskConical className="h-2 w-2 mr-0.5" />
                      {event.plantName.length > 8 
                        ? `${event.plantName.substring(0, 8)}...` 
                        : event.plantName
                      }
                    </Chip>
                  ))}
                  {dayEvents.length > 2 && (
                    <Chip className="bg-slate-50 text-slate-600 ring-slate-200 text-[9px]">
                      +{dayEvents.length - 2} more
                    </Chip>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {monthEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            This Month's Schedule ({monthEvents.length} plants)
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
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}