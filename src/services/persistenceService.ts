import { EmployeeSummary } from '../types';

export const persistenceService = {
  // Local storage is now only used for configuration (metadata about the connection)
  // Attendance data is strictly fetched from and saved to Google Sheets per user request

  // Fetch final calculated data from the Attendance sheet
  fetchAttendanceData: async (scriptUrl: string): Promise<EmployeeSummary[]> => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return [];
    
    const baseUrl = scriptUrl.split('?')[0];
    const url = `${baseUrl}?action=getAttendance&cb=${Date.now()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON received for attendance data:', text.substring(0, 100));
        return [];
      }

      return (Array.isArray(data) ? data : []).map(item => ({
        ...item,
        details: typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || [])
      })) as EmployeeSummary[];
    } catch (error) {
      console.error('Fetch Attendance Error:', error);
      throw error;
    }
  },

  // Fetch detailed day-wise logs from the Final_Logs sheet
  fetchDetailedLogs: async (scriptUrl: string): Promise<any[]> => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return [];
    
    const baseUrl = scriptUrl.split('?')[0];
    const url = `${baseUrl}?action=getDetailedLogs&cb=${Date.now()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error('Invalid JSON received for detailed logs:', text.substring(0, 100));
        return [];
      }
    } catch (error) {
      console.error('Fetch Detailed Logs Error:', error);
      return [];
    }
  },

  // Upload structured attendance logs to the "Logs" sheet
  uploadLogs: async (scriptUrl: string, rows: any[]) => {
    if (!scriptUrl) return;

    // Map rows to the exact structure requested by the user for Google Sheets (A-W)
    const formattedRows = rows.map(row => ({
      'Code': row.code,
      'Name': row.name,
      'Father Name': row.fatherName,
      'Department': row.department,
      'Period': row.period,
      'Date': row.date,
      'SHIFT': row.shift,
      'APP IN': row.appIn,
      'IN': row.inTime,
      'Lunch OUT': row.lunchOut,
      'Lunch IN': row.lunchIn,
      'Out': row.outTime,
      'NIGHT IN': row.nightIn,
      'NIGHT OUT': row.nightOut,
      'DAY HRS': row.dayHrs,
      'SHORT IN': row.shortIn,
      'SHORT OUT': row.shortOut,
      'EXTRA HRS': row.extraHrs,
      'M-EXT HRS': row.mExtHrs,
      'M AMT': row.mAmt,
      'Total Hrs': row.totalHrs,
      'Punch Log': row.punchLog,
      'Uploaded At': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }));

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'uploadLogs',
          data: formattedRows
        }),
      });

      if (!response.ok) throw new Error('Failed to upload logs to sheets');
      return await response.json();
    } catch (error) {
      console.error('Error uploading logs:', error);
      throw error;
    }
  },

  // Save EL and CL details to "EL_CL_Details" sheet
  saveEL_CL: async (scriptUrl: string, payload: { employeeId: string; name: string; period: string; el: number; cl: number }) => {
    if (!scriptUrl) return;

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'saveEL_CL',
          data: payload
        }),
      });

      if (!response.ok) throw new Error('Failed to save EL/CL details to sheets');
      return await response.json();
    } catch (error) {
      console.error('Error saving EL/CL:', error);
      throw error;
    }
  }
};
