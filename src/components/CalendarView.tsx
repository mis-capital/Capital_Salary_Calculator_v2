import React, { useState } from 'react';
import { AttendanceCalculation } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isWednesday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  details: AttendanceCalculation[];
}

type StatusFilter = 'All' | 'Present' | 'Absent' | 'Half Day' | 'Weekly Off' | 'Late' | 'OT';

export default function CalendarView({ details }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('All');
  
  // Assume all details are for the same month/year based on the salary slip
  const firstDate = details.length > 0 ? parseISO(details[0].date) : new Date();
  
  const monthStart = startOfMonth(firstDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return details.find(d => d.date === dateStr);
  };

  const statusColors = {
    'Present': 'bg-emerald-500',
    'Absent': 'bg-rose-500',
    'Half Day': 'bg-orange-500',
    'Weekly Off': 'bg-slate-400',
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-6 bg-slate-50/50">
        <div className="flex justify-between items-center">
          <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
            {format(monthStart, 'MMMM yyyy')}
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Calendar View</span>
          </h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 group/leg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" /> 
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/leg:text-emerald-600 transition-all underline decoration-emerald-200 decoration-2 underline-offset-4">Present</span>
            </div>
            
            <div className="flex items-center gap-2 group/leg">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" /> 
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/leg:text-rose-600 transition-all underline decoration-rose-200 decoration-2 underline-offset-4">Absent</span>
            </div>

            <div className="flex items-center gap-2 group/leg">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]" /> 
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/leg:text-orange-600 transition-all underline decoration-orange-200 decoration-2 underline-offset-4">Half Day</span>
            </div>

            <div className="flex items-center gap-2 group/leg">
              <span className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.3)]" /> 
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/leg:text-slate-700 transition-all underline decoration-slate-200 decoration-2 underline-offset-4">Week-Off</span>
            </div>

            <div className="flex items-center gap-2 group/leg">
              <span className="w-2 h-2 rounded-full bg-[#1155cc] shadow-[0_0_8px_rgba(17,85,204,0.4)]" /> 
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/leg:text-[#1155cc] transition-all underline decoration-[#1155cc]/30 decoration-2 underline-offset-4">Overtime</span>
            </div>

            <div className="flex items-center gap-2 group/leg border-l border-slate-200 pl-4 ml-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/leg:text-slate-600 transition-all underline decoration-slate-200 decoration-2 underline-offset-4">P (Punch)</span>
            </div>

            <div className="flex items-center gap-2 group/leg">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 group-hover/leg:text-rose-600 transition-all underline decoration-rose-200 decoration-2 underline-offset-4">M (Manual)</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between bg-white p-2.5 rounded-[1.5rem] border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <div className="px-5 flex items-center gap-3 border-r-2 border-slate-100 mr-2 shrink-0 h-10">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filter</span>
            </div>
            <div className="flex gap-2 flex-wrap py-1">
              {(['All', 'Present', 'Absent', 'Half Day', 'Weekly Off', 'Late', 'OT'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                    px-5 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                    ${filter === f 
                      ? 'bg-brand-primary text-white shadow-[0_8px_20px_rgba(79,70,229,0.2)] ring-2 ring-brand-primary ring-offset-2' 
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                  `}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <AnimatePresence>
            {filter !== 'All' && (
              <motion.button
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter('All')}
                className="px-6 py-2.5 ml-3 bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:bg-rose-600 transition-all shrink-0 rounded-[1rem] h-11 flex items-center gap-2 group/clear border-2 border-rose-400 group"
              >
                <XCircle className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
                Clear Filters
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="px-2 pb-2">
        <div className="grid grid-cols-7 gap-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div 
              key={day} 
              className={`
                py-2.5 text-center text-[10px] font-black uppercase tracking-widest relative
                rounded-lg border-2 border-white shadow-sm
                ${day === 'Wed' 
                  ? 'bg-slate-400 text-white' 
                  : 'bg-brand-primary text-indigo-50'}
              `}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-slate-200">
        {calendarDays.map((day, i) => {
          const data = getDayData(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const hasOT = data && data.overtimeMins > 0;
          const isWed = isWednesday(day);
          
          // Determine if this day matches the current filter
          const status = data?.status || (isWed ? 'Weekly Off' : 'Absent');
          const isMatch = filter === 'All' || 
                          (filter === 'Late' ? (data?.lateMins || 0) > 0 : 
                           filter === 'OT' ? (data?.overtimeMins || 0) > 0 : 
                           status === filter);
          
          return (
            <div 
              key={i} 
              className={`
                min-h-[120px] p-4 transition-all relative group
                ${!isCurrentMonth ? 'bg-slate-50 text-slate-300 opacity-30 shadow-none pointer-events-none' : 'bg-white'}
                ${isWed && isCurrentMonth && filter === 'All' ? 'bg-amber-50/40' : ''}
                ${data ? 'hover:bg-slate-50' : ''}
                ${hasOT && filter === 'All' ? 'bg-[#1155cc]/5' : ''}
                ${!isMatch && isCurrentMonth ? 'opacity-20 grayscale scale-[0.98]' : 'opacity-100'}
              `}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-black transition-all ${
                  !isCurrentMonth 
                    ? 'text-slate-200' 
                    : isMatch 
                      ? 'text-slate-900 bg-slate-100/50 group-hover:bg-brand-primary group-hover:text-white shadow-sm'
                      : 'text-slate-400 bg-slate-50'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {isCurrentMonth && (
                  <div className={`w-2 h-2 rounded-full border border-white shadow-sm mt-1 transition-colors ${
                    status === 'Present' ? 'bg-emerald-500' :
                    status === 'Absent' ? 'bg-rose-500' :
                    status === 'Weekly Off' ? 'bg-slate-400' :
                    status === 'Half Day' ? 'bg-orange-500' :
                    'bg-slate-200'
                  }`} />
                )}
              </div>

              {data ? (
                <div className="space-y-2">
                      <div className="flex flex-col">
                        {data.status !== 'Absent' && data.status !== 'Weekly Off' && (
                          <span className="text-[11px] font-bold text-slate-800 leading-none tracking-tight">{data.inTime} — {data.outTime}</span>
                        )}
                      </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {data.status === 'Absent' && (
                      <div className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded-lg leading-none border-2 border-rose-100 uppercase tracking-widest">
                        Absent
                      </div>
                    )}
                    {data.status === 'Weekly Off' && (
                      <div className="text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-1 rounded-lg leading-none border-2 border-slate-200 uppercase tracking-widest">
                        Week-Off
                      </div>
                    )}
                    {data.lateMins > 0 && (
                      <div className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg leading-none border border-rose-100 uppercase tracking-widest">
                        Late {data.lateMins}m
                      </div>
                    )}
                    {hasOT && (
                      <div className="text-[9px] font-black text-[#1155cc] bg-[#1155cc]/10 px-2 py-1 rounded-xl leading-none shadow-sm border border-[#1155cc]/20 mt-1 uppercase tracking-widest">
                        {Math.floor(data.overtimeMins / 60)}:{ (data.overtimeMins % 60).toString().padStart(2, '0') } H
                      </div>
                    )}
                    {data.status === 'Half Day' && (
                      <div className="text-[8px] font-bold text-orange-600 bg-orange-50 px-1.5 py-1 rounded-lg leading-none border-2 border-orange-100 uppercase tracking-widest">
                        Half Day
                      </div>
                    )}
                  </div>
                </div>
              ) : isCurrentMonth && (
                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                  {isWed ? (
                    <div className="text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-1 rounded-lg leading-none border-2 border-slate-200 uppercase tracking-widest">
                      Week-Off
                    </div>
                  ) : (
                    <div className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded-lg leading-none border-2 border-rose-100 uppercase tracking-widest">
                      Absent
                    </div>
                  )}
                </div>
              )}

              {data?.type && (
                <div className={`absolute bottom-2 right-3 text-[10px] font-bold ${data.type === 'M' ? 'text-rose-500' : 'text-slate-400'}`}>
                  {data.type}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
