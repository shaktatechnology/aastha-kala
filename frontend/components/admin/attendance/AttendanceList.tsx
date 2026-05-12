"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CalendarDays, Filter, RefreshCw, X, AlertCircle } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface AttendanceRecord {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: "early" | "ontime" | "late" | "absent";
  remarks: string;
  employee: {
    id: number;
    name: string;
    type: string;
  };
  shift: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
  } | null;
  program_schedule?: {
    id: number;
    start_time: string;
    end_time: string;
    program?: {
      title: string;
    }
  } | null;
}

const AttendanceList = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Filters
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/all-employees`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.data || data);
        }
      } catch (e) {
        console.error("Failed to fetch employees for filter");
      }
    };
    fetchEmployees();
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append("date", filterDate);
      if (filterEmployeeId) params.append("employee_id", filterEmployeeId);
      if (filterStatus) params.append("status", filterStatus);

      // Fetch records
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/attendance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      const data = await res.json();
      setRecords(data);

      // Fetch summary
      const summaryParams = new URLSearchParams();
      // For summary, if date is picked, use it as range
      if (filterDate) {
        summaryParams.append("start_date", filterDate);
        summaryParams.append("end_date", filterDate);
      }
      if (filterEmployeeId) summaryParams.append("employee_id", filterEmployeeId);

      const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/attendance/summary?${summaryParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSummary(sData);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setLoadingSummary(false);
    }
  }, [filterDate, filterEmployeeId, filterStatus]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleProcessLogs = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/attendance/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ date: filterDate }),
      });
      if (!res.ok) throw new Error("Failed to process logs");
      const data = await res.json();
      toast.success(data.message || "Logs processed successfully");
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ontime": return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">On Time</span>;
      case "late": return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold uppercase">Late</span>;
      case "early": return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">Early Leave</span>;
      case "absent": return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold uppercase">Absent</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold uppercase">{status}</span>;
    }
  };

  const formatTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "--:--";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatShiftTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Present</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">{summary.present_days}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Absent</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{summary.absent_days}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Late</p>
            <p className="text-xl md:text-2xl font-bold text-orange-500">{summary.late_days}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Early Leave</p>
            <p className="text-xl md:text-2xl font-bold text-blue-500">{summary.early_leaves}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Hours</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.total_hours}h</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg/Day</p>
            <p className="text-xl md:text-2xl font-bold text-brand-deep">{summary.avg_hours}h</p>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-end gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm pr-8"
              />
              {filterDate && (
                <button 
                  onClick={() => setFilterDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Employee
            </label>
            <CustomSelect
              value={filterEmployeeId}
              onChange={(val) => setFilterEmployeeId(val)}
              options={[
                { value: "", label: "All Employees" },
                ...employees.map(e => ({ value: String(e.id), label: e.name }))
              ]}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Status
            </label>
            <CustomSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              options={[
                { value: "", label: "All Status" },
                { value: "ontime", label: "On Time" },
                { value: "late", label: "Late" },
                { value: "early", label: "Early Leave" },
                { value: "absent", label: "Absent" }
              ]}
            />
          </div>
        </div>

        <div className="flex flex-row sm:flex-row lg:flex-col xl:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={async () => {
              setProcessing(true);
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/attendance/fetch-logs`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (!res.ok) throw new Error("Failed to fetch logs");
                const data = await res.json();
                toast.success(data.message || "Logs fetched successfully");
                // Immediately process after fetching
                handleProcessLogs();
              } catch (e: any) {
                toast.error(e.message || "Error fetching logs");
                setProcessing(false);
              }
            }}
            disabled={processing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-sm hover:shadow text-[11px] uppercase tracking-wider disabled:opacity-50 flex-1 sm:flex-none"
          >
            {processing ? <Spinner size="sm" className="text-white" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Fetch</span>
            <span className="hidden sm:inline">from Device</span>
          </button>

          <button
            onClick={handleProcessLogs}
            disabled={processing || !filterDate}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold shadow-sm hover:shadow text-[11px] uppercase tracking-wider disabled:opacity-50 flex-1 sm:flex-none"
          >
            {processing ? <Spinner size="sm" className="text-white" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Process</span>
            <span className="hidden sm:inline">Logs</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Spinner size="lg" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <CalendarDays className="w-10 h-10 mb-2 opacity-50" />
                      <p>No attendance records found for the selected criteria.</p>
                      <p className="text-xs mt-1">Try clicking "Process Logs" to generate attendance from ZKT data.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-gray-900">{formatDate(record.date)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-900">{record.employee?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{record.employee?.type}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-800">
                        {record.shift?.name || (record.program_schedule?.program?.title ? `Prog: ${record.program_schedule.program.title}` : 'Working Hours')}
                      </div>
                      <div className="text-xs font-mono text-gray-500">
                        {record.shift?.start_time ? `${formatShiftTime(record.shift.start_time)} - ${formatShiftTime(record.shift.end_time)}` : 
                         record.program_schedule?.start_time ? `${formatShiftTime(record.program_schedule.start_time)} - ${formatShiftTime(record.program_schedule.end_time)}` :
                         record.remarks || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium text-gray-700">{formatTime(record.check_in)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium text-gray-700">{formatTime(record.check_out)}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceList;
