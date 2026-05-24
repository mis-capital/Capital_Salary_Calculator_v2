export interface AttendanceRecord {
  date: string;
  inTime: string; // HH:mm
  outTime: string; // HH:mm
  punchLog?: string; // Raw log: e.g., "08:59 - 13:01 - 13:57 - 21:00"
  type?: string;
}

export interface EmployeeAttendance {
  employeeId: string;
  name: string;
  records: AttendanceRecord[];
}

export interface AttendanceCalculation {
  date: string;
  inTime: string;
  outTime: string;
  punchLog?: string;
  type?: string;
  totalHrs?: string; // e.g. "11:30"
  workDurationMins: number;
  lateMins: number;
  overtimeMins: number;
  isAbsent: boolean;
  isHalfDay: boolean;
  isWeeklyOff: boolean;
  status: 'Present' | 'Absent' | 'Half Day' | 'Weekly Off';
}

export interface EmployeeSummary {
  employeeId: string;
  name: string;
  totalPresent: number;
  totalAbsent: number;
  totalHalfDays: number;
  totalWeeklyOffs: number;
  totalWorkingDays: number;
  totalHoliday?: number;
  totalOT_Hours?: number;
  totalShort?: number;
  el?: number;
  cl?: number;
  netOT_Hours?: number;
  weekOffDeduction?: number;
  totalLateMins: number;
  totalOvertimeMins: number;
  netOvertimeMins: number; // After late deductions
  period?: string; // Optional: for manual entries
  details: AttendanceCalculation[];
}
