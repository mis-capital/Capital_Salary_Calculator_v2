import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { pdfService } from '../services/pdfService';
import { persistenceService } from '../services/persistenceService';
import { GOOGLE_APPS_SCRIPT_URL } from '../config';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onUploadComplete: () => void;
}

export default function AttendanceUploader({ onUploadComplete }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const validFiles = fileList.filter(f => f.type === 'application/pdf');

    if (validFiles.length === 0) {
      setError('Please upload PDF files.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessCount(0);
    setProgress({ current: 0, total: validFiles.length });

    const allRows = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setProgress({ current: i + 1, total: validFiles.length });
        
        const rows = await pdfService.extractTextFromPDF(file);
        allRows.push(...rows);
      }

      if (allRows.length > 0) {
        if (!GOOGLE_APPS_SCRIPT_URL) {
          throw new Error('Google Apps Script URL is missing in config.ts');
        }
        await persistenceService.uploadLogs(GOOGLE_APPS_SCRIPT_URL, allRows);
        setSuccessCount(validFiles.length);
        onUploadComplete();
      } else {
        setError('No attendance data found in the uploaded PDF(s). Please check if the PDF contains date-wise logs.');
      }
    } catch (err: any) {
      console.error(`Error processing files:`, err);
      setError(`Failed to upload logs. Error: ${err.message || 'Unknown error'}`);
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">UPLOAD ATTENDANCE</h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">Select one or more employee attendance PDFs</p>
      </div>

      <div className="relative">
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        <label
          htmlFor="pdf-upload"
          className={`
            flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-200
            ${isProcessing ? 'bg-slate-50 border-indigo-400 ring-4 ring-indigo-50' : 'hover:bg-indigo-50/50 hover:border-indigo-300 border-slate-200 bg-slate-50/30'}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-indigo-600 font-black text-sm tracking-widest uppercase">
                  Processing {progress.current} / {progress.total}
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-300 mb-4" />
                <p className="mb-2 text-sm text-slate-600">
                  <span className="font-bold text-slate-900">Click to upload single or multiple</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">Only PDF Format Accepted</p>
              </>
            )}
          </div>
        </label>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {successCount > 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Successfully processed {successCount} report{successCount > 1 ? 's' : ''}!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white p-1 rounded-md shadow-sm">
              <FileText className="w-3 h-3 text-indigo-500" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Engine</span>
          </div>
          <ul className="text-[10px] space-y-1.5 text-slate-500 font-medium">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              9:00 AM - 5:30 PM
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              30m Block OT
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              5m Grace Period
            </li>
          </ul>
        </div>
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white p-1 rounded-md shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analytics</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            Calculates net OT after late deductions, attendance status, and generates full daily breakdown.
          </p>
        </div>
      </div>
    </div>
  );
}
