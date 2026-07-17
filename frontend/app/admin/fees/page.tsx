"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  Filter,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Table from "@/components/layout/Table";
import toast from "react-hot-toast";
import { Pagination } from "@/components/global/Pagination";
import FeeAddModal from "@/components/admin/FeeAddModal";
import FeeViewModal from "@/components/admin/FeeViewModal";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { ThermalBill } from "@/components/admin/ThermalBill";
import {
  formatDate,
  getBsDateParts,
  nepaliMonthNames,
  toNepaliDigits,
  formatMonthYear,
  bsMonthYearToAdMonthYear,
  bsToAd,
} from "@/lib/utils";

interface Student {
  id: number;
  name: string;
}

interface StudentFee {
  id: number;
  student_id: number;
  student: Student;
  fee_type: "admission" | "program";
  fee_types?: string;
  month_year?: string;
  total_amount: number;
  discount: number;
  paid_amount: number;
  pending_amount: number;
  status: "paid" | "pending";
  created_at?: string;
  total_discount_amount?: number;
  payments?: any[];
  gross_amount?: number;
  discount_amount?: number;
  payment_method?: string;
  net_amount?: number;
  remaining_amount?: number;
  admission_fee?: number;
  admission_discount?: number;
  admission_discount_type?: "cash" | "percentage";
  admission_paid_amount?: number;
  programs_breakdown?: any[];
  shift?: string;
  return_amount?: number;
}

const FeesPage = () => {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("student_id");

  const [fees, setFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "admission" | "program">(
    "all",
  );
  const [programFilter, setProgramFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");

  // Local filter buffers
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState<"all" | "paid" | "pending">(
    "all",
  );
  const [typeInput, setTypeInput] = useState<"all" | "admission" | "program">(
    "all",
  );
  const [shiftInput, setShiftInput] = useState("all");
  const [programInput, setProgramInput] = useState("all");
  const [instructorInput, setInstructorInput] = useState("all");
  const [nepaliYearInput, setNepaliYearInput] = useState("");
  const [nepaliMonthInput, setNepaliMonthInput] = useState("");
  const [nepaliYearFilter, setNepaliYearFilter] = useState("");
  const [nepaliMonthFilter, setNepaliMonthFilter] = useState("");

  const handleApplyFilters = () => {
    setSearchTerm(searchInput);
    setStatusFilter(statusInput);
    setTypeFilter(typeInput);
    setShiftFilter(shiftInput);
    setProgramFilter(programInput);
    setInstructorFilter(instructorInput);
    setNepaliYearFilter(nepaliYearInput);
    setNepaliMonthFilter(nepaliMonthInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusInput("all");
    setTypeInput("all");
    setShiftInput("all");
    setProgramInput("all");
    setInstructorInput("all");
    setNepaliYearInput("");
    setNepaliMonthInput("");
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setShiftFilter("all");
    setProgramFilter("all");
    setInstructorFilter("all");
    setNepaliYearFilter("");
    setNepaliMonthFilter("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyFilters();
  };

  const [programs, setPrograms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [summary, setSummary] = useState({
    total_collected: 0,
    total_pending: 0,
    paid_count: 0,
    pending_count: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [feeToEdit, setFeeToEdit] = useState<any>(null);
  const [feeToView, setFeeToView] = useState<any>(null);

  // Settings for Bill
  const [settings, setSettings] = useState<any>(null);
  const printRef = React.useRef<HTMLDivElement>(null);
  const [printingFee, setPrintingFee] = useState<any>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Bill_" + (printingFee?.student?.name || "Customer"),
    pageStyle: "@page { size: 80mm auto; margin: 0; }",
  });

  const triggerPrint = async (row: any) => {
    try {
      const original = fees.find((f) => f.id === row.id);
      if (!original) return;

      const toastId = toast.loading("Preparing bill...");
      const token = localStorage.getItem("token");
      let printUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/students/${original.student_id}/fee-info?month_year=${encodeURIComponent(original.month_year || "")}&_t=${Date.now()}`;
      if (instructorFilter !== "all") {
        printUrl += `&instructor_id=${instructorFilter}`;
      }
      const res = await fetch(
        printUrl,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const result = await res.json();
      toast.dismiss(toastId);

      if (res.ok && result.data) {
        const d = result.data;
        const feeTypes = original.fee_types ? original.fee_types.split(",") : [];
        const hasAdmission = feeTypes.includes("admission");
        setPrintingFee({
          ...original,
          admission_fee: hasAdmission ? (d.admission_amount || original.admission_fee) : 0,
          admission_discount: hasAdmission ? d.admission_discount : 0,
          admission_discount_type: hasAdmission ? d.admission_discount_type : "cash",
          admission_paid_amount: hasAdmission ? d.admission_paid_amount : 0,
          admission_last_payment: hasAdmission ? (d.admission_last_payment || 0) : 0,
          programs_breakdown: (d.program_fees?.programs_breakdown || []).map((pb: any) => ({
            ...pb,
            last_payment_amount: pb.last_payment_amount || 0,
          })),
          shift: d.student?.shift || original.shift,
        });
      } else {
        setPrintingFee(original);
      }
    } catch (e) {
      console.error("Failed to fetch bill details", e);
      const original = fees.find((f) => f.id === row.id);
      setPrintingFee(original);
    }
  };

  useEffect(() => {
    if (printingFee) {
      handlePrint();
      setTimeout(() => setPrintingFee(null), 500);
    }
  }, [printingFee]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/settings`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setSettings(data.data.setting);
      }
    } catch (error) {
      console.error("Failed to fetch settings for bill", error);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/programs`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const result = await res.json();
      const list = result.data?.data || result.data || [];
      setPrograms(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/student-fees/schedules`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const result = await res.json();
      setSchedules(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInstructors = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructors`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const result = await res.json();
      const list = result.data?.data || result.data || [];
      setInstructors(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPrograms();
    fetchSchedules();
    fetchInstructors();
  }, []);

  const columns = [
    { key: "sn", label: "SN" },
    { key: "student_name", label: "Student" },
    { key: "month_year", label: "Period" },
    { key: "total_amount", label: "Gross Total" },
    { key: "discount", label: "Discount" },
    { key: "paid_amount", label: "Paid" },
    { key: "return_amount", label: "Return" },
    { key: "remaining", label: "Remaining" },
    { key: "status", label: "Status" },
  ];

  const fetchFees = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/admin/student-fees?page=${page}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (typeFilter !== "all") url += `&fee_type=${typeFilter}`;
      if (shiftFilter !== "all") url += `&shift=${shiftFilter}`;
      if (programFilter !== "all") url += `&program_id=${programFilter}`;
      if (instructorFilter !== "all")
        url += `&instructor_id=${instructorFilter}`;
      let yearForConversion = nepaliYearFilter;
      if (!yearForConversion && nepaliMonthFilter) {
        yearForConversion = (
          getBsDateParts(new Date())?.year || 2083
        ).toString();
      }

      if (yearForConversion && nepaliMonthFilter) {
        const by = parseInt(yearForConversion);
        const bm = parseInt(nepaliMonthFilter);
        let adY: number;
        let adM: number;
        if (bm >= 1 && bm <= 8) {
          adM = bm + 4;
          adY = by - 57;
        } else {
          adM = bm - 8;
          adY = by - 56;
        }
        const formatted = `${adY}-${String(adM).padStart(2, "0")}`;
        url += `&month_year=${encodeURIComponent(formatted)}`;
      } else if (nepaliYearFilter) {
        const midAd = bsToAd(`${nepaliYearFilter}-06-15`);
        if (midAd) {
          const adYear = midAd.split("-")[0];
          url += `&month_year=${encodeURIComponent(adYear)}`;
        }
      }
      if (studentIdParam) url += `&student_id=${studentIdParam}`;
      if (searchTerm) url += `&search=${searchTerm}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message ?? "Failed to fetch fees");

      setFees(result.data.data);
      setPagination({
        currentPage: result.data.current_page,
        totalPages: result.data.last_page,
        totalItems: result.data.total,
        itemsPerPage: result.data.per_page,
      });

      if (result.summary) {
        setSummary(result.summary);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFees();
  }, [
    statusFilter,
    typeFilter,
    shiftFilter,
    programFilter,
    instructorFilter,
    nepaliYearFilter,
    nepaliMonthFilter,
    studentIdParam,
    searchTerm,
  ]);

  const handleDelete = async () => {
    if (!selectedFee) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/student-fees/${selectedFee.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to delete record");
      toast.success("Record deleted");
      setDeleteModalOpen(false);

      // If this was the last item on the page → go to previous page
      const isLastItemOnPage = fees.length === 1;
      if (isLastItemOnPage && pagination.currentPage > 1) {
        fetchFees(pagination.currentPage - 1);
      } else {
        fetchFees(pagination.currentPage);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const formattedData = React.useMemo(
    () =>
      fees.map((fee, index) => ({
        ...fee,
        sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,
        student_name: (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-sm">
              {fee.student?.name ?? "Unknown"}
            </span>
            <span className="text-[10px] text-gray-400">
              ID #{fee.student_id}
            </span>
          </div>
        ),
        fee_type: (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
              fee.fee_type === "admission"
                ? "bg-secondary/10 text-secondary"
                : "bg-info/10 text-info"
            }`}
          >
            {fee.fee_type === "admission"
              ? "Admission"
              : fee.fee_type === "program"
                ? "Program"
                : "Billing"}
          </span>
        ),
        month_year: (
          <span className="text-xs text-gray-600 font-medium">
            {fee.month_year
              ? fee.month_year.includes("-")
                ? formatMonthYear(fee.month_year)
                : fee.month_year.includes(" ") && /\d{4}/.test(fee.month_year)
                  ? /\d{1,2}\s/.test(fee.month_year)
                    ? formatDate(fee.month_year)
                    : formatMonthYear(fee.month_year)
                  : fee.month_year
              : "—"}
          </span>
        ),
        total_amount: (
          <span className="text-sm font-bold text-gray-900">
            Rs. {Number(fee.gross_amount || fee.total_amount).toLocaleString()}
          </span>
        ),
        discount: (
          <span className="text-sm font-medium text-blue-500">
            {Number(fee.discount_amount || 0) > 0
              ? `Rs. ${Number(fee.discount_amount).toLocaleString()}`
              : "—"}
          </span>
        ),
        paid_amount: (
          <span className="text-sm font-bold text-success">
            Rs. {Number(fee.paid_amount).toLocaleString()}
          </span>
        ),
        return_amount: (
          <span className="text-sm font-bold text-amber-700">
            {Number(fee.return_amount || 0) > 0
              ? `Rs. ${Number(fee.return_amount).toLocaleString()}`
              : "—"}
          </span>
        ),
        remaining: (
          <span
            className={`text-sm font-bold ${Number((fee.net_amount || fee.total_amount) - fee.paid_amount) > 0 ? "text-amber-600" : "text-gray-400"}`}
          >
            Rs.{" "}
            {Math.max(
              0,
              Number((fee.net_amount || fee.total_amount) - fee.paid_amount),
            ).toLocaleString()}
          </span>
        ),
        status: (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
              fee.status === "paid"
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${fee.status === "paid" ? "bg-success" : "bg-warning"}`}
            />
            {fee.status}
          </span>
        ),
      })),
    [fees, pagination.currentPage, pagination.itemsPerPage],
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <header className="flex flex-col lg:flex-row justify-between items-center p-6 bg-surface border border-border rounded-xl gap-6 shadow-sm">
          {/* ... header content ... */}
          <div className="flex flex-col text-center lg:text-left">
            <h1 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight">
              Fees & Billing
            </h1>
            <p className="text-xs text-text-muted font-medium mt-1">
              Manage student payments and billing records
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-center gap-3 w-full"
          >
            {/* Search */}
            <div className="relative w-full sm:w-64 group">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
              />
            </div>

            {/* Status */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value as any)}
                className="w-full px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-bold appearance-none min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Shift Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={shiftInput}
                onChange={(e) => setShiftInput(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-medium appearance-none"
              >
                <option value="all">All Schedules</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={programInput}
                onChange={(e) => setProgramInput(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-medium appearance-none"
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <React.Fragment key={p.id}>
                    <option value={p.id} className="font-bold">
                      {p.title}
                    </option>
                    {p.sub_programs?.map((sp: any) => (
                      <option key={sp.id} value={sp.id}>
                        &nbsp;&nbsp;— {sp.title}
                      </option>
                    ))}
                  </React.Fragment>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={instructorInput}
                onChange={(e) => setInstructorInput(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-medium appearance-none"
              >
                <option value="all">All Teachers</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nepali Month/Year Filter */}
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Year Select */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={nepaliYearInput}
                  onChange={(e) => setNepaliYearInput(e.target.value)}
                  className="w-full sm:w-28 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-medium appearance-none"
                >
                  <option value="">Year</option>
                  {Array.from({ length: 11 }, (_, i) => 2080 + i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {toNepaliDigits(year)}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Month Select */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={nepaliMonthInput}
                  onChange={(e) => setNepaliMonthInput(e.target.value)}
                  className="w-full sm:w-32 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none cursor-pointer font-medium appearance-none"
                >
                  <option value="">Month</option>
                  {nepaliMonthNames.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                Apply
              </button>

              {(shiftInput !== "all" ||
                programInput !== "all" ||
                instructorInput !== "all" ||
                nepaliYearInput !== "" ||
                nepaliMonthInput !== "" ||
                statusInput !== "all" ||
                searchInput !== "" ||
                shiftFilter !== "all" ||
                programFilter !== "all" ||
                instructorFilter !== "all" ||
                nepaliYearFilter !== "" ||
                nepaliMonthFilter !== "" ||
                statusFilter !== "all" ||
                searchTerm !== "") && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[10px] font-black uppercase tracking-widest text-error hover:text-error/80 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Collected",
              value: summary.total_collected,
              icon: TrendingUp,
              color: "success",
              prefix: "Rs. ",
            },
            {
              label: "Total Pending",
              value: summary.total_pending,
              icon: TrendingDown,
              color: "warning",
              prefix: "Rs. ",
            },
            {
              label: "Paid Entries",
              value: summary.paid_count,
              icon: BarChart3,
              color: "success",
            },
            {
              label: "Unpaid Entries",
              value: summary.pending_count,
              icon: CreditCard,
              color: "warning",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg bg-${stat.color === "success" ? "success" : "warning"}/10 flex items-center justify-center transition-transform group-hover:scale-110`}
                >
                  <stat.icon
                    className={`w-5 h-5 text-${stat.color === "success" ? "success" : "warning"}`}
                  />
                </div>
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                  {stat.label}
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-text-primary tracking-tight">
                  {stat.prefix}
                  {stat.value.toLocaleString()}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="nvidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {pagination.totalItems} Records
            </p>
          </div>

          <Table
            columns={columns}
            data={formattedData}
            loading={loading}
            actions={["view", "edit"]}
            onView={async (row) => {
              const original = fees.find((f) => f.id === row.id);
              if (!original) return;
              try {
                const toastId = toast.loading("Loading fee details...");
                const token = localStorage.getItem("token");
                let feeInfoUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/students/${original.student_id}/fee-info?month_year=${encodeURIComponent(original.month_year || "")}&_t=${Date.now()}`;
                if (instructorFilter !== "all") {
                  feeInfoUrl += `&instructor_id=${instructorFilter}`;
                }
                const res = await fetch(
                  feeInfoUrl,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                  },
                );
                const result = await res.json();
                toast.dismiss(toastId);

                if (res.ok && result.data) {
                  const d = result.data;
                  setFeeToView({
                    ...original,
                    payments: d.payments || [],
                    programs_breakdown: d.program_fees?.programs_breakdown || [],
                  });
                } else {
                  setFeeToView(original);
                }
              } catch (e) {
                console.error("Failed to load fee details", e);
                setFeeToView(original);
              }
              setViewModalOpen(true);
            }}
            onEdit={(row) => {
              const original = fees.find((f) => f.id === row.id);
              setFeeToEdit(original);
              setFeeModalOpen(true);
            }}
            onDelete={(row) => {
              const original = fees.find((f) => f.id === row.id);
              setSelectedFee(original || null);
              setDeleteModalOpen(true);
            }}
            customActions={[
              {
                icon: <Printer className="w-4 h-4" />,
                label: "Print Bill",
                onClick: triggerPrint,
                color: "text-purple-600",
              },
            ]}
          />

          <div className="px-6 py-4 border-gray-100">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={(page) => fetchFees(page)}
            />
          </div>
        </div>
      </div>

      <FeeAddModal
        isOpen={feeModalOpen}
        fee={feeToEdit}
        instructorId={instructorFilter !== "all" ? instructorFilter : undefined}
        onClose={() => setFeeModalOpen(false)}
        onSuccess={() => {
          if (
            searchTerm === "" &&
            statusFilter === "all" &&
            typeFilter === "all"
          ) {
            fetchFees(pagination.currentPage);
          } else {
            setSearchInput("");
            setStatusInput("all");
            setTypeInput("all");
            setSearchTerm("");
            setStatusFilter("all");
            setTypeFilter("all");
          }
        }}
      />

      <FeeViewModal
        isOpen={viewModalOpen}
        fee={feeToView}
        onClose={() => setViewModalOpen(false)}
      />

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef} className="print-wrapper">
          <ThermalBill fee={printingFee} settings={settings} />
          <ThermalBill fee={printingFee} settings={settings} />
        </div>
      </div>
    </>
  );
};

export default FeesPage;
