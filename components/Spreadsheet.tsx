
import React from 'react';
import { AttendanceRecord } from '../types';
import { Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface SpreadsheetProps {
  records: AttendanceRecord[];
  onDelete: (id: string) => void;
  onUpdate: (record: AttendanceRecord) => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ records, onDelete, onUpdate }) => {
  const handleExport = () => {
    const headers = ['Date', 'Labour Name', 'Site Name', 'Salary', 'Day', 'OT Hours', 'OT Amount', 'Total Pay'];
    const csvContent = [
      headers.join(','),
      ...records.map(r => [
        r.date,
        `"${r.labourName}"`,
        `"${r.siteName}"`,
        r.baseSalary,
        r.day,
        r.otHours,
        r.otAmount.toFixed(2),
        r.totalPayable.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          Attendance Sheet
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {records.length} Records
          </span>
        </h2>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Download size={16} /> Export to Sheet
        </button>
      </div>
      
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr className="text-slate-500 text-xs uppercase font-semibold">
              <th className="px-4 py-3 border-b">Status</th>
              <th className="px-4 py-3 border-b">Date</th>
              <th className="px-4 py-3 border-b">Labour Name</th>
              <th className="px-4 py-3 border-b">Site Name</th>
              <th className="px-4 py-3 border-b">Salary</th>
              <th className="px-4 py-3 border-b text-center">Day</th>
              <th className="px-4 py-3 border-b text-center">OT (H)</th>
              <th className="px-4 py-3 border-b">OT (Amt)</th>
              <th className="px-4 py-3 border-b">Total</th>
              <th className="px-4 py-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                  No attendance records found. Paste messages or upload images to start.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    {record.isConfirmed ? (
                      <CheckCircle size={18} className="text-green-500" title="Confirmed" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" title="Review Needed" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.labourName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.siteName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">₹{record.baseSalary}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${record.day >= 1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {record.day}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-center">{record.otHours}</td>
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">₹{record.otAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">₹{record.totalPayable.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => onDelete(record.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Spreadsheet;
