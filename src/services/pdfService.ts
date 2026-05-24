import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface AttendanceRow {
  code: string;
  name: string;
  fatherName: string;
  department: string;
  period: string;
  date: string;
  shift: string;
  appIn: string;
  inTime: string;
  lunchOut: string;
  lunchIn: string;
  outTime: string;
  nightIn: string;
  nightOut: string;
  dayHrs: string;
  shortIn: string;
  shortOut: string;
  extraHrs: string;
  mExtHrs: string;
  mAmt: string;
  totalHrs: string;
  punchLog: string;
}

export const pdfService = {
  extractTextFromPDF: async (file: File): Promise<AttendanceRow[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let allProcessedRows: AttendanceRow[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      // 1. Group items by their Y-coordinate to reconstruct lines
      const linesMap: { [y: string]: any[] } = {};
      items.forEach(item => {
        const y = Math.round(item.transform[5]); // Vertical position
        if (!linesMap[y]) linesMap[y] = [];
        linesMap[y].push(item);
      });

      // 2. Sort lines from top to bottom
      const sortedY = Object.keys(linesMap).sort((a, b) => Number(b) - Number(a));
      
      const linesTexts = sortedY.map(y => {
        // Sort items in each line from left to right
        const itemsInLine = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
        
        let reconstructedLine = '';
        let lastX = -1;
        
        itemsInLine.forEach((item, idx) => {
          const x = item.transform[4];
          if (idx > 0) {
            const gap = x - (lastX + itemsInLine[idx-1].width || 0);
            // If the gap is larger than roughly 15-20 units, it's likely a new column.
            // We'll insert a unique separator to help with tokenization.
            if (gap > 20) {
              reconstructedLine += ' [EMPTY_COL] ';
            } else {
              reconstructedLine += ' ';
            }
          }
          reconstructedLine += item.str;
          lastX = x;
        });
        
        return reconstructedLine;
      });

      const fullText = linesTexts.join('\n');

      // 3. Extract Header Information
      // Salary Slip Apr-2026 or similar patterns
      const periodMatch = fullText.match(/Salary\s+Slip\s*[:\s]*([A-Z][a-z]{2}[-\s]\d{4})/i);
      const period = periodMatch ? periodMatch[1] : 'Unknown';

      // Code: (1) Name: ABID KHAN
      const codeMatch = fullText.match(/Code\s*[:\s]*\((\d+)\)/i);
      const nameMatch = fullText.match(/Name\s*[:\s]*(.+?)(?:\s+Father|Designation|Dept|DATE|$)/i);
      const fatherMatch = fullText.match(/Father\s+Name\s*[:\s]*(.+?)(?:\s+Dep|Designation|DATE|\n|$)/i);
      const deptMatch = fullText.match(/Department\s*[:\s]*(.+?)(?:\s+Bank|DOJ|DATE|$)/i);

      const empCode = codeMatch ? codeMatch[1] : 'N/A';
      const empName = nameMatch ? nameMatch[1].trim() : 'N/A';
      const fatherName = fatherMatch ? fatherMatch[1].trim() : 'N/A';
      const department = deptMatch ? deptMatch[1].trim() : 'N/A';

      // 4. Extract Table Rows
      const dateRegex = /(\d{4}-\d{2}-\d{2})/;
      
      linesTexts.forEach(line => {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
          const date = dateMatch[1];
          
          // Improved logic for totalHrs and punchLog
          // Header: ... M AMT TOTAL HRS PUNCH LOG
          // Structure usually: ... [number] [TOTAL HRS (HH:mm)] [PUNCH LOG (HH:mm - HH:mm or HH:mm)]
          
          // Step 1: Extract all tokens that look like times or ranges from the end
          const tokens = line.trim().split(/\s+/);
          let totalHrs = '';
          let punchLog = '';
          
          const isTimeRange = (s: string) => /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/.test(s);
          const isTime = (s: string) => /^\d{2}:[0-5]\d$/.test(s);

          // We need to handle tokens that might have been split (e.g. "09:01", "-", "18:00")
          // Re-process tokens to join time ranges if they were split by spaces
          const processedTokens: string[] = [];
          for (let idx = 0; idx < tokens.length; idx++) {
            const token = tokens[idx];
            if (token === '-' && idx > 0 && idx < tokens.length - 1 && isTime(tokens[idx-1]) && isTime(tokens[idx+1])) {
              const prev = processedTokens.pop();
              processedTokens.push(`${prev}-${tokens[idx+1]}`);
              idx++; // skip next
            } else if (idx < tokens.length - 2 && isTime(token) && tokens[idx+1] === '-' && isTime(tokens[idx+2])) {
              processedTokens.push(`${token}-${tokens[idx+2]}`);
              idx += 2;
            } else {
              processedTokens.push(token);
            }
          }

          // Step 2: Identification by positional tokens
          // Mapping: Shift (1), App In (2), IN (3), Lunch OUT (4), Lunch IN (5), Out (6), NIGHT IN (7), NIGHT OUT (8), DAY HRS (9), SHORT IN (10), SHORT OUT (11), EXTRA HRS (12), M-EXT HRS (13), M AMT (14)
          // Total Hrs and Punch Log are handled separately from headers
          
          let shift = processedTokens[1] || '';
          let timeSlots: string[] = []; // Slots for indices starting from 2
          
          let k = 2;
          while (timeSlots.length < 13 && k < processedTokens.length) {
            const token = processedTokens[k];
            if (token === '[EMPTY_COL]') {
              timeSlots.push('');
            } else if (isTime(token) || /^\d+(\.\d+)?$/.test(token)) {
              timeSlots.push(token);
            } else {
              // Not a time or number, but maybe we should skip if it's junk?
              // For now, let's just push it to keep index stability
              timeSlots.push(token);
            }
            k++;
          }

          let appIn = timeSlots[0] || '';
          let inTime = timeSlots[1] || '';
          let lunchOut = timeSlots[2] || '';
          let lunchIn = timeSlots[3] || '';
          let outTime = timeSlots[4] || '';
          let nightIn = timeSlots[5] || '';
          let nightOut = timeSlots[6] || '';
          let dayHrs = timeSlots[7] || '';
          let shortIn = timeSlots[8] || '';
          let shortOut = timeSlots[9] || '';
          let extraHrs = timeSlots[10] || '';
          let mExtHrs = timeSlots[11] || '';
          let mAmt = timeSlots[12] || '';

          const lastToken = processedTokens[processedTokens.length - 1];
          const secondLastToken = processedTokens[processedTokens.length - 2];

          if (isTimeRange(lastToken)) {
            punchLog = lastToken;
            if (isTime(secondLastToken)) {
              totalHrs = secondLastToken;
            }
          } else if (isTime(lastToken)) {
            if (isTime(secondLastToken)) {
              totalHrs = secondLastToken;
              punchLog = lastToken;
            } else {
              totalHrs = lastToken;
            }
          }

          allProcessedRows.push({
            code: empCode,
            name: empName,
            fatherName: fatherName,
            department: department,
            period: period,
            date: date,
            shift: shift,
            appIn: appIn,
            inTime: inTime,
            lunchOut: lunchOut,
            lunchIn: lunchIn,
            outTime: outTime,
            nightIn: nightIn,
            nightOut: nightOut,
            dayHrs: dayHrs,
            shortIn: shortIn,
            shortOut: shortOut,
            extraHrs: extraHrs,
            mExtHrs: mExtHrs,
            mAmt: mAmt,
            totalHrs: totalHrs,
            punchLog: punchLog
          });
        }
      });
    }
    
    return allProcessedRows;
  }
};
