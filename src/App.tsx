/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Package2, Info, Database, RefreshCw, ChevronDown, Search, XCircle, ArrowUp } from 'lucide-react';
import AttendanceUploader from './components/AttendanceUploader';
import ReportTable from './components/ReportTable';
import { EmployeeSummary } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { persistenceService } from './services/persistenceService';
import { format, parseISO, subMonths, isWednesday } from 'date-fns';
import { GOOGLE_APPS_SCRIPT_URL } from './config';

const MonthSelector = ({ selectedMonth, onSelect, options }: { selectedMonth: string, onSelect: (val: string) => void, options: string[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 transition-all hover:bg-white hover:border-indigo-300 hover:shadow-md group"
      >
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Month</span>
          <span className="text-sm font-bold text-slate-700 group-hover:text-brand-primary transition-colors">
            {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-[100]"
          >
            <div className="py-2 max-h-[320px] overflow-y-auto scrollbar-hide">
              {options.map((opt) => {
                const isSelected = opt === selectedMonth;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      onSelect(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-brand-primary text-white' 
                        : 'text-slate-600 hover:bg-indigo-50 hover:text-brand-primary'
                    }`}
                  >
                    {format(parseISO(opt + "-01"), "MMMM yyyy")}
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LogoItem = ({ src, alt, title, align = 'center' }: { src: string, alt: string, title: string, align?: 'left' | 'center' | 'right' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const containerClasses = {
    left: 'left-0 translate-x-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 translate-x-0'
  };

  const arrowClasses = {
    left: 'left-6',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-6'
  };

  return (
    <div className="relative flex items-center justify-center">
      <motion.img 
        whileHover={{ scale: 1.15 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        src={src} 
        alt={alt} 
        className="h-8 md:h-11 w-auto object-contain mix-blend-multiply cursor-default transition-all duration-300 group-hover:drop-shadow-md" 
        referrerPolicy="no-referrer" 
      />
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={`absolute top-full mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] whitespace-nowrap z-[60] pointer-events-none ${containerClasses[align]}`}
          >
            {title}
            <div className={`absolute -top-1 w-2.5 h-2.5 bg-slate-900 rotate-45 ${arrowClasses[align]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const lastMonth = subMonths(new Date(), 1);
  const [allSummaries, setAllSummaries] = useState<EmployeeSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(lastMonth, 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState<'upload' | 'reports'>('upload');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sheetsUrl = GOOGLE_APPS_SCRIPT_URL;

  const fetchLatestData = async () => {
    if (sheetsUrl && sheetsUrl.startsWith('http')) {
      setLoading(true);
      try {
        const [summaries, detailedLogs] = await Promise.all([
          persistenceService.fetchAttendanceData(sheetsUrl),
          persistenceService.fetchDetailedLogs(sheetsUrl)
        ]);

        const merged = summaries.map(s => {
          // Always attempt to find fresh details in the detailed logs fetched from Final_Logs
          // as per user request to prioritize data from this sheet.
          const matchingDetails = detailedLogs
            .filter(d => {
              const dCode = String(d.code || '').trim();
              const sCode = String(s.employeeId || '').trim();
              const dPeriod = String(d.period || '').toLowerCase().trim();
              const sPeriod = String(s.period || '').toLowerCase().trim();
              
              return dCode === sCode && (dPeriod === sPeriod || dPeriod.includes(sPeriod) || sPeriod.includes(dPeriod));
            })
            .map(d => {
              // Extract basic info from punch log
              let inT = '', outT = '';
              const pLog = String(d.punchLog || '');
              if (pLog && pLog.includes('-')) {
                const parts = pLog.split('-');
                inT = parts[0]?.trim() || '';
                outT = parts[parts.length - 1]?.trim() || '';
              }

              // Normalize date format to yyyy-MM-dd for calendar/list logic
              let formattedDate = String(d.date || '');
              if (formattedDate.includes('T')) {
                formattedDate = formattedDate.split('T')[0];
              }

              // Robust status mapping from Final_Logs Column J
              let status: 'Present' | 'Absent' | 'Half Day' | 'Weekly Off' = 'Present';
              const sheetStatus = d.status ? String(d.status).toLowerCase().trim() : '';
              
              if (sheetStatus) {
                if (sheetStatus.includes('absent')) status = 'Absent';
                else if (sheetStatus.includes('half')) status = 'Half Day';
                else if (sheetStatus.includes('week') || sheetStatus.includes('off')) status = 'Weekly Off';
                else if (sheetStatus.includes('present')) status = 'Present';
                else if (!pLog) status = 'Absent';
              } else if (!pLog) {
                // Fallback heuristic if status is missing in sheet
                const dateObj = parseISO(formattedDate);
                status = isWednesday(dateObj) ? 'Weekly Off' : 'Absent';
              }

              return {
                date: formattedDate,
                punchLog: pLog,
                status: status,
                inTime: inT,
                outTime: outT,
                lateMins: (typeof d.lateMins === 'number' ? d.lateMins : parseFloat(String(d.lateMins || 0))) || 0,
                overtimeMins: (typeof d.otMins === 'number' ? d.otMins : parseFloat(String(d.otMins || d.netOtMins || 0))) || 0,
                workDurationMins: ((typeof d.workHrs === 'number' ? d.workHrs : parseFloat(String(d.workHrs || 0))) || 0) * 60,
                totalHrs: d.totalHrs || '',
                type: d.type || '',
                isAbsent: status === 'Absent',
                isHalfDay: status === 'Half Day',
                isWeeklyOff: status === 'Weekly Off'
              };
            })
            .sort((a, b) => a.date.localeCompare(b.date));
            
          return {
            ...s,
            details: matchingDetails.length > 0 ? matchingDetails : (s.details || [])
          };
        });

        setAllSummaries(merged);
      } catch (error) {
        console.error("Fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Load from Sheets on mount if URL exists
  useEffect(() => {
    fetchLatestData();
  }, [sheetsUrl]);

  // Filter summaries by selected month
  const filteredSummaries = allSummaries.filter(s => {
    // If we have an explicit period field (manual entry), use it
    if ((s as any).period) {
      const period = String((s as any).period).toLowerCase();
      const monthPrefix = format(parseISO(`${selectedMonth}-01`), 'MMM').toLowerCase();
      const yearSuffix = selectedMonth.split('-')[0].substring(2);
      
      // Match "apr-26" or "Apr-26" etc
      return period.includes(monthPrefix) && period.includes(yearSuffix);
    }
    
    // Otherwise fallback to checking details
    if (!s.details || s.details.length === 0) return false;
    return s.details[0]?.date?.startsWith(selectedMonth);
  }).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadComplete = () => {
    // After upload to Logs, tell user we'll fetch results (give formulas a second to process)
    setTimeout(() => {
      fetchLatestData();
      setActiveTab('reports');
    }, 1500);
  };

  const generateMonthOptions = () => {
    const options = [];
    let d = subMonths(new Date(), 1); // Start from last month
    for (let i = 0; i < 12; i++) {
      const val = format(d, 'yyyy-MM');
      options.push(val);
      d = subMonths(d, 1);
    }
    return options;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-secondary font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-indigo-100 group"
            >
              <LogoItem 
                src="https://i.ibb.co/3ynBj43X/original-size.png" 
                alt="CSIPL" 
                title="Capital Spindles India Pvt. Ltd. (CSIPL)"
                align="left"
              />
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden md:block" />
              <LogoItem 
                src="https://i.ibb.co/FqcYTBpS/CEC-LOGO-Original-size.jpg" 
                alt="CEC" 
                title="Capital Engineering Corporation (CEC)"
              />
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden md:block" />
              <LogoItem 
                src="https://i.ibb.co/fzYQ5V0f/JK-LOGO.png" 
                alt="JK" 
                title="J K Engg Works (JK)"
                align="right"
              />
            </motion.div>
            <div className="hidden lg:block">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">Salary Calculator</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1155cc] animate-pulse" />
                <p className="text-[10px] font-bold text-[#1155cc] uppercase tracking-widest whitespace-nowrap">Basic + Overtime</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {/* Month Selection */}
            <MonthSelector 
              selectedMonth={selectedMonth}
              onSelect={setSelectedMonth}
              options={generateMonthOptions()}
            />

            <button 
              onClick={fetchLatestData}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                loading ? 'bg-slate-100 text-slate-400' : 'bg-brand-primary text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'upload' ? 'bg-brand-primary text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Uploader
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'reports' ? 'bg-brand-primary text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Reports
                {filteredSummaries.length > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${activeTab === 'reports' ? 'bg-white text-brand-primary' : 'bg-indigo-500 text-white'}`}>{filteredSummaries.length}</span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <AttendanceUploader onUploadComplete={handleUploadComplete} />
              
              {/* Detailed Rules List (Rule 1-9) */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                    <Info className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight uppercase text-slate-900">Attendance Policy</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">01.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Work Timings</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">9:00 AM to 5:30 PM. Any duration after 5:30 PM is considered <span className="text-[#1155cc] font-bold">Overtime</span>.</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">02.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Lunch Break</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">13:00 to 13:30 (30 minutes). Automatically deducted from daily total.</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">03.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">OT Blocks</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium"><span className="text-[#1155cc] font-bold">OT</span> is calculated in 30-minute blocks. (e.g., 6:15 PM = 30m OT, 6:30 PM = 1hr OT).</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">04.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Late Policy</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">5 mins grace. 6th min = 30m late. 36th min = 1 hour late.</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">05.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">OT Deductions</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">Excessive late hours are deducted from accumulated overtime hours.</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">06.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Weekly Off</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">Wednesday is Weekly Off. Ineligible if absent &gt; 2 days in that week.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">07.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Morning Absence</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">Considered Absent if work duration &lt; 90 mins in the morning (9:00 - 10:30).</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">08.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Half Day OT</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">Employees on Half Day are not eligible for 1.5x OT rate on that day.</p>
                    </div>
                    <div className="relative pl-10 group">
                      <span className="absolute left-0 top-0 text-3xl font-black text-slate-200 italic">09.</span>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">Late Allowance</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">2 Hours (120 mins) total per month allowed before OT deductions start.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activeTab === 'reports' && (
                <div className="flex justify-center mb-12">
                  <div className="relative max-w-xl w-full group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search employee name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-14 pr-12 py-5 bg-white border-2 border-slate-200 rounded-[2rem] text-base font-bold shadow-[0_10px_40px_rgba(0,0,0,0.04)] focus:ring-8 focus:ring-brand-primary/5 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center group/btn"
                      >
                        <XCircle className="h-6 w-6 text-slate-300 hover:text-slate-500 group-hover/btn:scale-110 transition-all" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {filteredSummaries.length > 0 ? (
                <ReportTable summaries={filteredSummaries} onRefresh={fetchLatestData} />
              ) : (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <Package2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900">No Reports for {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}</h3>
                  <p className="text-gray-500 mt-2">Upload attendance PDFs to generate reports for this month.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Start Uploading
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 15, x: "-50%", scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            className="fixed bottom-8 left-1/2 z-[99] flex items-center gap-2 bg-brand-primary text-white border-2 border-brand-primary font-black text-xs uppercase tracking-wider px-6 py-3 rounded-full shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-slate-950 hover:border-slate-950 transition-all group"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4 text-white group-hover:-translate-y-1 transition-transform" />
            <span>Back to Top</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

