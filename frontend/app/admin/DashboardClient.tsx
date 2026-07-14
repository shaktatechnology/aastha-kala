"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  CreditCard,
  UserPlus,
  Receipt,
  FileText,
  Activity,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useDashboard } from "@/lib/DashboardContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import ProgramAddEditModal from "@/components/admin/ProgramAddEditModal";
import InstructorModal from "@/components/admin/InstructorModal";
import EventAddEditModal from "@/components/admin/EventAddEditModal";
import GalleryAddEditModal from "@/components/admin/GalleryAddEditModal";
import StudentAddEditModal from "@/components/admin/StudentAddEditModal";
import BookingViewModal from "@/components/admin/BookingViewModal";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatDate as convertToNepaliDate } from "@/lib/utils";

const PIE_COLORS = ["#6366f1", "#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"];

/* ───────────────────────── helpers ───────────────────────── */
const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

/* ─────────────────────── stat card (Pulse) ────────────────────────── */
const PulseCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  alert = false,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200 group overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-semibold text-[var(--text-main)] uppercase tracking-[0.05em] opacity-70">
        {title}
      </p>
      <div className={`p-1.5 rounded-md ${alert ? 'bg-red-50 text-red-500' : 'bg-[#e0e7ff] text-[var(--primary)]'}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="flex items-end justify-between">
      <p className={`text-2xl font-black tracking-tight leading-none ${alert ? 'text-red-500' : 'text-[var(--primary)]'}`}>
        {value}
      </p>
      {subtitle && (
        <div className="text-[10px] font-medium text-[var(--text-main)] opacity-70 mb-0.5">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

/* ════════════════════════ MAIN DASHBOARD ════════════════════════ */

const Dashboard = () => {
  const { data, loading, categories, refreshData } = useDashboard();
  const router = useRouter();

  const [modals, setModals] = useState({
    program: false,
    instructor: false,
    event: false,
    gallery: false,
    student: false,
    viewBooking: false,
  });

  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const [expenseFilter, setExpenseFilter] = useState({ month: '', year: '' });
  const [attendanceFilter, setAttendanceFilter] = useState({ day: '', month: '', year: '' });

  useEffect(() => {
    refreshData({
      expense_month: expenseFilter.month,
      expense_year: expenseFilter.year,
      attendance_day: attendanceFilter.day,
      attendance_month: attendanceFilter.month,
      attendance_year: attendanceFilter.year,
    });
  }, [expenseFilter, attendanceFilter, refreshData]);

  const openModal = (type: keyof typeof modals) =>
    setModals((p) => ({ ...p, [type]: true }));
  const closeModal = (type: keyof typeof modals) =>
    setModals((p) => ({ ...p, [type]: false }));

  // Dynamic Data Assignment
  const stats = data?.stats || {};
  const pieData = data?.employee_attendance || [];
  const expenseCategories = data?.expense_categories || [];
  const scheduleData = data?.schedules || [];
  const eventsData = data?.recent_events || [];
  const revenueGauges = data?.revenue_gauges || [];

  const totalEmployees = pieData.reduce((acc: any, curr: any) => acc + curr.value, 0);

  const monthOptions = [
    { value: "", label: "Month" },
    ...Array.from({ length: 12 }).map((_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('en', { month: 'short' }) }))
  ];

  const yearOptions = [
    { value: "", label: "Year" },
    { value: "2026", label: "2026" },
    { value: "2025", label: "2025" }
  ];

  const dayOptions = [
    { value: "", label: "Day" },
    ...Array.from({ length: 31 }).map((_, i) => ({ value: String(i + 1), label: String(i + 1) }))
  ];

  return (
    <div className="space-y-4 pb-8 animate-fade-in font-poppins">

      {/* ──── TOP BAR: PULSE METRICS ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PulseCard
          title="Total Employees"
          value={stats.total_employees || 0}
          icon={Users}
          subtitle={<span className="flex items-center text-[var(--primary)] gap-2"><Activity className="w-4 h-4" /> Active Staff</span>}
        />
        <PulseCard
          title="Active Students"
          value={stats.total_students || 0}
          icon={Users}
          subtitle={<span className="flex items-center text-[var(--primary)] gap-2"><Activity className="w-4 h-4 animate-pulse" /> Live</span>}
        />
        <PulseCard
          title="Outstanding Fees"
          value={`Rs. ${stats.outstanding_fees ? stats.outstanding_fees.toLocaleString() : 0}`}
          icon={CreditCard}
          alert={true}
          onClick={() => router.push("/admin/fees")}
        />
        <PulseCard
          title="Dress Hire Count"
          value={stats.dress_hire_count || 0}
          icon={FileText}
        />
      </div>

      {/* ──── MIDDLE SECTION: CHARTS ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT: Expense Categories Flow */}
        <div className="lg:col-span-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)]">Expense Categories</h2>
            <div className="flex gap-2 text-xs w-fit">
              <CustomSelect
                options={monthOptions}
                value={expenseFilter.month}
                onChange={(val) => setExpenseFilter({ ...expenseFilter, month: val })}
                placeholder="Month"
                className="w-28"
              />
              <CustomSelect
                options={yearOptions}
                value={expenseFilter.year}
                onChange={(val) => setExpenseFilter({ ...expenseFilter, year: val })}
                placeholder="Year"
                className="w-24"
              />
            </div>
          </div>
          <div className="h-[220px] w-full">
            {expenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategories} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-main)', opacity: 0.6, fontSize: 12 }} dy={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow)' }}
                    itemStyle={{ fontWeight: 600, color: '#f87171' }}
                    labelStyle={{ fontWeight: 700, color: 'var(--text-main)' }}
                    formatter={(value: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, "Amount"]}
                  />
                  <Bar dataKey="value" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-main)] opacity-50 font-medium">No expense data available for this period.</div>
            )}
          </div>
        </div>

        {/* RIGHT: Employee Attendance Donut */}
        <div className="lg:col-span-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)] shrink-0">Employee Attendance</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 text-[10px] w-full">
            <CustomSelect
              options={dayOptions}
              value={attendanceFilter.day}
              onChange={(val) => setAttendanceFilter({ ...attendanceFilter, day: val })}
              placeholder="Day"
              className="flex-1 min-w-[70px]"
            />
            <CustomSelect
              options={monthOptions}
              value={attendanceFilter.month}
              onChange={(val) => setAttendanceFilter({ ...attendanceFilter, month: val })}
              placeholder="Month"
              className="flex-1 min-w-[80px]"
            />
            <CustomSelect
              options={yearOptions}
              value={attendanceFilter.year}
              onChange={(val) => setAttendanceFilter({ ...attendanceFilter, year: val })}
              placeholder="Year"
              className="flex-1 min-w-[70px]"
            />
          </div>
          <div className="flex-1 relative min-h-[160px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'none', borderRadius: '8px', boxShadow: 'var(--shadow)' }}
                    itemStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-main)] opacity-50 font-medium">No attendance data</div>
            )}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-[var(--text-main)]">{totalEmployees}</span>
                <span className="text-[10px] font-semibold uppercase text-[var(--text-main)] opacity-60 tracking-wider">Records</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)] opacity-80 truncate" title={entry.name}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                <span className="truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ──── REVENUE GAUGE ──── */}
      {/* <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200">
        <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)] mb-3">Revenue Collection Gauge</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {revenueGauges.length > 0 ? (
            revenueGauges.map((gauge: any) => (
              <div key={gauge.program}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-[var(--text-main)] truncate max-w-[70%]" title={gauge.program}>{gauge.program}</span>
                  <span className="font-bold text-sm text-[var(--primary)]">{gauge.collected}%</span>
                </div>
                <div className="w-full bg-[var(--border)] h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[var(--primary)] h-full transition-all duration-1000" style={{ width: `${gauge.collected}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-[var(--text-main)] opacity-50 font-medium col-span-full">No revenue data available</div>
          )}
        </div>
      </div> */}

      {/* ──── LOWER SECTION: OPERATIONAL GRID ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Schedule */}
        <div className="lg:col-span-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200">
          <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)] mb-3">Instructor Schedule (Today)</h2>
          <div className="space-y-2">
            {scheduleData.length > 0 ? (
              scheduleData.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors border border-transparent hover:border-[var(--border)]">
                  <span className="text-sm font-black text-[var(--primary)] bg-[#e0e7ff] px-2 py-1 rounded">{item.time}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{item.class}</p>
                    <p className="text-xs font-semibold text-[var(--text-main)] opacity-60 truncate">{item.instructor}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-[var(--text-main)] opacity-50 font-medium py-4 text-center">No classes scheduled</div>
            )}
          </div>
        </div>

        {/* Events Table */}
        <div className="lg:col-span-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-0 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200 overflow-hidden flex flex-col">
          <div className="p-4 pb-2 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)]">Events (Recent)</h2>
            <Link href="/admin/event" className="text-xs font-semibold text-[var(--primary)] hover:underline">View All</Link>
          </div>
          {eventsData.length > 0 ? (
            <div className="w-full">
              <table className="w-full text-left table-fixed">
                <colgroup>
                  <col className="w-[45%]" />
                  <col className="w-[30%]" />
                  <col className="w-[25%]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#f8fafc] border-y border-[var(--border)]">
                    <th className="px-4 py-3 text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.05em] text-center">Event</th>
                    <th className="px-4 py-3 text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.05em] text-center">Date</th>
                    <th className="px-4 py-3 text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.05em] text-center">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {eventsData.map((evt: any, i: number) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors relative group">
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--text-main)] text-center border-l-4 border-transparent group-hover:border-[var(--primary)] truncate" title={evt.title}>{evt.title}</td>
                      <td className="px-4 py-3 text-xs font-black text-[var(--primary)] text-center truncate">{convertToNepaliDate(evt.date)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--text-main)] opacity-60 text-center truncate" title={evt.location}>{evt.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-main)] opacity-50 font-medium p-6 text-center">No recent events</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--shadow)] hover:border-l-4 hover:border-l-[var(--primary)] transition-all duration-200">
          <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-main)] mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => openModal('student')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              onClick={() => openModal('program')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Add Program</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              onClick={() => router.push('/admin/expenses')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              onClick={() => router.push('/admin/fees')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>

      </div>

      {/* ──── MODALS ──── */}
      <ProgramAddEditModal
        isOpen={modals.program}
        onClose={() => closeModal("program")}
        onSuccess={() => refreshData()}
        program={null}
      />
      <InstructorModal
        isOpen={modals.instructor}
        onClose={() => closeModal("instructor")}
        onSuccess={() => refreshData()}
        instructor={null}
      />
      <EventAddEditModal
        isOpen={modals.event}
        onClose={() => closeModal("event")}
        onSuccess={() => refreshData()}
        event={null}
      />
      <GalleryAddEditModal
        isOpen={modals.gallery}
        onClose={() => closeModal("gallery")}
        onSuccess={() => refreshData()}
        categories={categories}
        editData={null}
      />
      <StudentAddEditModal
        isOpen={modals.student}
        onClose={() => closeModal("student")}
        onSuccess={() => refreshData()}
        student={null}
      />
      <BookingViewModal
        isOpen={modals.viewBooking}
        onClose={() => closeModal("viewBooking")}
        booking={selectedBooking}
        onStatusUpdate={(status, instId, start, end) => { }}
      />
    </div>
  );
};

export default Dashboard;