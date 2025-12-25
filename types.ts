
export interface AttendanceRecord {
  id: string;
  date: string;
  labourName: string;
  siteName: string;
  baseSalary: number;
  day: number; // 1 for full day, 0.5 for half day
  otHours: number;
  otAmount: number;
  totalPayable: number;
  source: 'text' | 'image';
  timestamp: number;
  rawContent?: string;
  isConfirmed: boolean;
}

export interface LearningRule {
  id: string;
  pattern: string;
  explanation: string;
  createdAt: number;
}

export interface ClarificationRequest {
  id: string;
  content: string;
  context: any;
  status: 'pending' | 'resolved';
}

export interface ParseResult {
  records: Array<{
    date: string;
    labourName: string;
    siteName: string;
    baseSalary: number;
    day: number;
    otHours: number;
  }>;
  uncertainties: string[];
}
