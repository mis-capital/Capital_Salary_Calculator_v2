import React, { useState } from 'react';
import { EmployeeSummary, AttendanceCalculation } from '../types';
import { Download, ChevronRight, ChevronDown, Clock, User, CalendarDays, Table as TableIcon, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import CalendarView from './CalendarView';
import { GOOGLE_APPS_SCRIPT_URL } from '../config';
import { persistenceService } from '../services/persistenceService';

interface Props {
  summaries: EmployeeSummary[];
  onRefresh?: () => void;
}

export default function ReportTable({ summaries, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // EL / CL Modal states
  const [isElClModalOpen, setIsElClModalOpen] = useState(false);
  const [selectedEmployeeForElCl, setSelectedEmployeeForElCl] = useState<EmployeeSummary | null>(null);
  const [elInput, setElInput] = useState('');
  const [clInput, setClInput] = useState('');
  const [isSavingElCl, setIsSavingElCl] = useState(false);
  const [elClError, setElClError] = useState('');
  const [elClSuccess, setElClSuccess] = useState('');

  const openElClModal = (summary: EmployeeSummary) => {
    setSelectedEmployeeForElCl(summary);
    setElInput(summary.el !== undefined ? String(summary.el) : '');
    setClInput(summary.cl !== undefined ? String(summary.cl) : '');
    setElClError('');
    setElClSuccess('');
    setIsElClModalOpen(true);
  };

  const saveElCl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForElCl) return;

    setIsSavingElCl(true);
    setElClError('');
    setElClSuccess('');

    const parsedEl = parseFloat(elInput) || 0;
    const parsedCl = parseFloat(clInput) || 0;
    const rawPeriod = selectedEmployeeForElCl.details && selectedEmployeeForElCl.details[0]
      ? selectedEmployeeForElCl.details[0].date.substring(0, 7)
      : (selectedEmployeeForElCl as any).period || 'N/A';
    const period = formatPeriodText(rawPeriod);

    try {
      await persistenceService.saveEL_CL(GOOGLE_APPS_SCRIPT_URL, {
        employeeId: selectedEmployeeForElCl.employeeId,
        name: selectedEmployeeForElCl.name,
        period: period,
        el: parsedEl,
        cl: parsedCl
      });

      setElClSuccess('Leave details updated successfully in sheet EL_CL_Details!');
      
      // Update local values as immediate UI update
      selectedEmployeeForElCl.el = parsedEl;
      selectedEmployeeForElCl.cl = parsedCl;

      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 1500);
      }

      // Close modal with success delayed feedback
      setTimeout(() => {
        setIsElClModalOpen(false);
        setSelectedEmployeeForElCl(null);
      }, 1500);

    } catch (err: any) {
      setElClError(err.message || 'Something went wrong while saving leave details.');
    } finally {
      setIsSavingElCl(false);
    }
  };

  const exportToExcel = () => {
    const data = summaries.map(s => ({
      'Employee ID': s.employeeId,
      'Name': s.name,
      'Working Days (WD)': s.totalWorkingDays,
      'Absent Days (A)': s.totalAbsent,
      'Holiday Days (HD)': s.totalHoliday ?? 0,
      'Overtime Hrs (OT)': s.totalOT_Hours ?? 0,
      'Shortage Hrs (Short)': s.totalShort ?? 0,
      'Earned Leaves (EL)': s.el ?? 0,
      'Casual Leaves (CL)': s.cl ?? 0,
      'W-Off Deduction': s.weekOffDeduction ?? 0,
      'Net Overtime Hrs (NET OT)': s.netOT_Hours ?? 0,
      'Month': s.details && s.details[0] ? s.details[0].date.substring(0, 7) : (s as any).period || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Report');
    XLSX.writeFile(wb, `Consolidated_Attendance_Report.xlsx`);
  };

  const formatMins = (mins: number) => {
    if (isNaN(mins) || mins === undefined) return '0m';
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0h';
    const strVal = String(val).trim();
    if (strVal === '0' || strVal === '0.0' || strVal === '00:00' || strVal === '00:00:00') return '0h';
    if (strVal.includes('h') || strVal.includes('m') || strVal.includes(':')) {
      return strVal;
    }
    const num = parseFloat(strVal);
    if (!isNaN(num)) {
      if (num === 0) return '0h';
      if (Number.isInteger(num)) {
        return `${num}h`;
      }
      return `${num.toFixed(1)}h`;
    }
    return strVal;
  };

  const formatHoursWithoutH = (val: any) => {
    const formatted = formatHours(val);
    return formatted.endsWith('h') ? formatted.slice(0, -1) : formatted;
  };

  const formatPeriodText = (periodStr: string): string => {
    if (!periodStr || periodStr === 'N/A') return 'N/A';
    // Matches YYYY-MM
    const match = periodStr.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = match[1];
      const month = match[2];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const idx = parseInt(month, 10) - 1;
      if (idx >= 0 && idx < 12) {
        return `${months[idx]}-${year.slice(2)}`;
      }
    }
    return periodStr;
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <TableIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">ATTENDANCE LEDGER</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{summaries.length} Records Processed</p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <Download className="w-4 h-4" />
          Export Ledger
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Employee Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Month Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Net Overtime (NET OT)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((summary) => (
                <React.Fragment key={summary.employeeId}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                          <User className="w-6 h-6 text-indigo-500" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight">{summary.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">ID: {summary.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center items-center gap-5">
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-indigo-600 leading-tight">{summary.totalWorkingDays ?? 0}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">WD</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-rose-500 leading-tight">{summary.totalAbsent ?? 0}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">A</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-orange-500 leading-tight">{summary.totalHoliday ?? 0}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">HD</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-blue-600 leading-tight">{formatHoursWithoutH(summary.totalOT_Hours)}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">OT</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-rose-400 leading-tight">{formatHoursWithoutH(summary.totalShort)}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">SHORT</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-emerald-600 leading-tight">{summary.el ?? 0}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">EL</span>
                        </div>
                        <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black text-teal-600 leading-tight">{summary.cl ?? 0}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">CL</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-end justify-center">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-base font-black text-[#1155cc] tracking-tight text-right">
                            {formatHours(summary.netOT_Hours)}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">NET OT</span>
                        </div>
                        {summary.weekOffDeduction !== undefined && summary.weekOffDeduction !== null && (
                          <div className="text-[11px] text-slate-500 font-bold mt-1 flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">W-Off Ded:</span>
                            <span className="font-mono text-rose-500 font-black text-xs">{formatHoursWithoutH(summary.weekOffDeduction)}</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openElClModal(summary);
                          }}
                          className="mt-2 text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase tracking-widest underline underline-offset-2 transition-colors duration-150"
                        >
                          Mark EL/CL
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === summary.employeeId ? null : summary.employeeId)}
                        className={`p-2 rounded-xl transition-all ${
                          expandedId === summary.employeeId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 rotate-90' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === summary.employeeId && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <td colSpan={4} className="px-8 py-0 bg-slate-50/30">
                          <div className="py-10 px-4 space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                  {viewMode === 'calendar' ? <CalendarDays className="w-4 h-4 text-indigo-500" /> : <TableIcon className="w-4 h-4 text-indigo-500" />}
                                  Granular Evidence Log
                                </h4>
                                {viewMode === 'list' && (
                                  <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">P (Punch)</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">M (Manual)</span>
                                  </div>
                                )}
                              </div>
                              {summary.details && summary.details.length > 0 && (
                                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm shadow-slate-100">
                                  <button 
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                  >
                                    Calendar
                                  </button>
                                  <button 
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                  >
                                    Detailed List
                                  </button>
                                </div>
                              )}
                            </div>

                            {summary.details && summary.details.length > 0 ? (
                              viewMode === 'calendar' ? (
                                <CalendarView details={summary.details} />
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {summary.details.map((day, idx) => (
                                    <div key={idx} className="relative bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:border-indigo-100 group">
                                      <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-black font-mono text-slate-900 group-hover:text-indigo-600 transition-colors">
                                          {format(parseISO(day.date), 'dd-MMM-yyyy')}
                                        </span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                                          day.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100' :
                                          day.status === 'Absent' ? 'bg-rose-50 text-rose-600 border-2 border-rose-100' :
                                          day.status === 'Weekly Off' ? 'bg-slate-100 text-slate-500 border-2 border-slate-200' :
                                          day.status === 'Half Day' ? 'bg-orange-50 text-orange-600 border-2 border-orange-100' :
                                          'bg-amber-50 text-amber-600 border-2 border-amber-100'
                                        }`}>
                                          {day.status === 'Weekly Off' ? 'Week-Off' : day.status}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                        {day.status !== 'Absent' && day.status !== 'Weekly Off' && (
                                          <>
                                            <div className="flex flex-col">
                                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">In</span>
                                              <span className="text-xs font-bold text-slate-700">{day.inTime}</span>
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Out</span>
                                              <span className="text-xs font-bold text-slate-700">{day.outTime}</span>
                                            </div>
                                          </>
                                        )}
                                        <div className="flex flex-col border-t border-slate-50 pt-2">
                                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Late</span>
                                          <span className={`text-xs font-bold ${day.lateMins > 0 ? "text-rose-500" : "text-slate-400"}`}>{day.lateMins}m</span>
                                        </div>
                                        <div className="flex flex-col border-t border-slate-50 pt-2">
                                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">OT</span>
                                          <span className={`text-xs font-bold ${day.overtimeMins > 0 ? "text-[#1155cc]" : "text-slate-400"}`}>
                                            {Math.floor(day.overtimeMins / 60)}:{(day.overtimeMins % 60).toString().padStart(2, '0')} H
                                          </span>
                                        </div>
                                      </div>
                                      {day.punchLog && (
                                        <div className="mt-3 pt-2 border-t border-slate-50">
                                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1">Verify Punch Log</span>
                                          <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md block truncate">
                                            {day.punchLog}
                                          </span>
                                        </div>
                                      )}

                                      {day.type && (
                                        <div className={`absolute bottom-2 right-3 text-[10px] font-bold ${day.type === 'M' ? 'text-rose-500' : 'text-slate-400'}`}>
                                          {day.type}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )
                            ) : (
                              <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic flex items-center justify-center gap-2">
                                  Detailed logs are not available for manual entries
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isElClModalOpen && selectedEmployeeForElCl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSavingElCl) {
                  setIsElClModalOpen(false);
                  setSelectedEmployeeForElCl(null);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden z-[101]"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">MARK LEAVES (EL/CL)</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Update personnel records</p>
                </div>
                <button
                  onClick={() => {
                    setIsElClModalOpen(false);
                    setSelectedEmployeeForElCl(null);
                  }}
                  disabled={isSavingElCl}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all hover:scale-105 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={saveElCl} className="mt-5 space-y-4">
                {/* Employee Info Readonly */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Employee Name</span>
                    <span className="font-extrabold text-slate-800">{selectedEmployeeForElCl.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Employee ID</span>
                    <span className="font-mono font-extrabold text-indigo-600">{selectedEmployeeForElCl.employeeId}</span>
                  </div>
                   <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Period</span>
                    <span className="font-mono font-extrabold text-slate-700">
                      {selectedEmployeeForElCl.details && selectedEmployeeForElCl.details[0]
                        ? formatPeriodText(selectedEmployeeForElCl.details[0].date.substring(0, 7))
                        : formatPeriodText((selectedEmployeeForElCl as any).period || 'N/A')}
                    </span>
                  </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pb-1">
                      Earned Leaves (EL)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={elInput}
                      onChange={(e) => setElInput(e.target.value)}
                      placeholder="0"
                      disabled={isSavingElCl}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pb-1">
                      Casual Leaves (CL)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={clInput}
                      onChange={(e) => setClInput(e.target.value)}
                      placeholder="0"
                      disabled={isSavingElCl}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Status message */}
                {elClError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold leading-relaxed">
                    {elClError}
                  </div>
                )}
                {elClSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold leading-relaxed">
                    {elClSuccess}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsElClModalOpen(false);
                      setSelectedEmployeeForElCl(null);
                    }}
                    disabled={isSavingElCl}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingElCl}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingElCl ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Details'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
