"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  X,
  Search,
  Receipt,
  CreditCard,
  BookOpen,
  Wallet,
  Calendar,
  MessageSquare,
  Banknote,
  Building,
  Smartphone,
  FileText,
  Check,
  User,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { Portal } from "../global/Portal";
import {
  formatMonthYear,
  nepaliMonthNames,
  toNepaliDigits,
  getBsDateParts,
  bsToAd,
} from "@/lib/utils";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { ThermalBill } from "./ThermalBill";

/* ─── Types ──────────────────────────────────────────────── */
interface Student {
  id: number;
  name: string;
  classes?: string;
}
interface ProgramFeeEntry {
  id: number;
  title: string;
  base: number;
  discount: number;
  discountType: "cash" | "percentage";
  payingNow: string;
  initialPaid?: number;
  billingMode?: "duration" | "monthly" | "fixed";
  dueMonth?: string; // set = carry-forward row, null/undefined = current month
  monthlyDiscount?: number;
  monthlyDiscountType?: "cash" | "percentage";
}
interface FeeInfo {
  student: { id: number; name: string; classes?: string; shift?: string };
  admission_paid: boolean;
  admission_exists: boolean;
  admission_amount: number | null;
  admission_paid_amount?: number;
  admission_discount?: number;
  admission_discount_type?: "cash" | "percentage";
  global_admission_fee?: number;
  program_fees: {
    programs_breakdown?: {
      id: number;
      title: string;
      program_fee: number;
      paid_amount?: number;
      discount?: number;
      discount_type?: string;
      status?: string;
      billing_mode?: "duration" | "monthly" | "fixed";
      monthly_discount?: number;
      monthly_discount_type?: string;
      due_month?: string | null;
    }[];
  } | null;
  period_record?: { remarks?: string; payment_method?: string };
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fee?: any;
}

/* ─── Helpers ────────────────────────────────────────────── */
function calcNet(
  base: number,
  discount: number,
  type: "cash" | "percentage",
): number {
  if (!discount || discount <= 0) return base;
  if (type === "percentage")
    return Math.max(0, base - (base * Math.min(discount, 100)) / 100);
  return Math.max(0, base - discount);
}
function fmt(n: number) {
  return "Rs. " + Math.round(n).toLocaleString("en-IN");
}
function fmtS(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function getCurrentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function bsMonthYearToAdPeriod(by: number, bm: number) {
  let adY: number;
  let adM: number;
  if (bm >= 1 && bm <= 8) {
    adM = bm + 4;
    adY = by - 57;
  } else {
    adM = bm - 8;
    adY = by - 56;
  }
  return `${adY}-${String(adM).padStart(2, "0")}`;
}

function formatPeriodToReadable(val: string) {
  if (!val || !val.includes("-")) return val;
  const [y, m] = val.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

/**
 * Proportionally distribute `amount` across items by their due.
 * Returns a map of id → allocated amount (capped at item.due).
 */
function distributePayment(
  amount: number,
  items: { id: string; due: number }[],
): Record<string, number> {
  const totalDue = items.reduce((s, i) => s + i.due, 0);
  if (totalDue <= 0 || amount <= 0) return {};
  let remaining = Math.min(amount, totalDue); // never exceed total due
  const result: Record<string, number> = {};
  for (const item of items) {
    const share = Math.min(
      item.due,
      Math.round((item.due / totalDue) * amount),
    );
    result[item.id] = share;
    remaining -= share;
  }
  // Fix rounding remainders
  let idx = 0;
  while (remaining > 0 && idx < items.length) {
    const item = items[idx];
    const canAdd = item.due - (result[item.id] || 0);
    if (canAdd > 0) {
      const add = Math.min(canAdd, remaining);
      result[item.id] = (result[item.id] || 0) + add;
      remaining -= add;
    }
    idx++;
  }
  return result;
}

function blockNeg(e: React.KeyboardEvent<HTMLInputElement>) {
  if ("eE+-".includes(e.key)) e.preventDefault();
}
function clamp(v: string): string {
  if (v === "" || v === "0") return v === "" ? "" : "0";
  const n = Number(v);
  return isNaN(n) || n < 0 ? "0" : v;
}

/* ─── Toggle Pill ─────────────────────────────────────────── */
const TogglePill: React.FC<{
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  size?: "sm" | "xs";
}> = ({ options, value, onChange, disabled, size = "sm" }) => (
  <div className="inline-flex bg-background border border-border rounded-lg p-1 gap-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        disabled={disabled}
        onClick={() => onChange(o.value)}
        className={`${size === "xs" ? "px-2.5 py-1 text-[10px]" : "px-4 py-1.5 text-xs"} font-black uppercase tracking-wider rounded-md transition-all disabled:opacity-40 ${value === o.value ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Checkbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onChange}
    className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${checked ? "bg-primary border-primary shadow-sm shadow-primary/20" : "border-border bg-surface hover:border-primary/50"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {checked && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
  </button>
);

/* ─── Payment Method Dropdown ─────────────────────────────── */
const METHODS = [
  { key: "Cash", icon: Banknote, label: "Cash" },
  { key: "Bank Transfer", icon: Building, label: "Bank Transfer" },
  { key: "Digital Wallet", icon: Smartphone, label: "Digital Wallet" },
  { key: "Cheque", icon: FileText, label: "Cheque" },
  { key: "Esewa", icon: Smartphone, label: "Esewa" },
] as const;

const MethodDropdown: React.FC<{
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = value.length > 0 ? value.join(", ") : "Select methods";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 bg-background hover:bg-surface-hover hover:border-primary/50 transition-all cursor-pointer shadow-sm"
      >
        <span className="text-xs font-black uppercase tracking-wider text-text-primary truncate max-w-[140px]">
          {label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 bg-surface border border-border rounded-lg shadow-xl z-50 py-1 w-48 animate-scale-in">
          {METHODS.map((m) => {
            const Ic = m.icon;
            const selected = value.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  const next = selected
                    ? value.filter((item) => item !== m.key)
                    : [...value, m.key];
                  onChange(next.length ? next : ["Cash"]);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${selected ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
              >
                <Ic className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{m.label}</span>
                {selected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Main Modal ──────────────────────────────────────────── */
const FeeAddModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, fee }) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);
  const [loadingFeeInfo, setLoadingFeeInfo] = useState(false);

  const [admBase, setAdmBase] = useState("");
  const [admDisc, setAdmDisc] = useState(0);
  const [admDiscType, setAdmDiscType] = useState<"cash" | "percentage">("cash");
  const [admPayingNow, setAdmPayingNow] = useState("");
  const [initialAdmPaid, setInitialAdmPaid] = useState(0);
  const [isOverwriteMode, setIsOverwriteMode] = useState(false);

  const [progEntries, setProgEntries] = useState<ProgramFeeEntry[]>([]);
  const [progPeriod, setProgPeriod] = useState(getCurrentPeriod());
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Cash"]);
  const [shift, setShift] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggleOverwriteMode = (enabled: boolean) => {
    setIsOverwriteMode(enabled);
    if (feeInfo) {
      if (enabled) {
        // Overwrite Mode: set initialPaid to 0, pre-populate payingNow with db values
        setInitialAdmPaid(0);
        setAdmPayingNow(
          feeInfo.admission_paid_amount
            ? feeInfo.admission_paid_amount.toString()
            : ""
        );
        setProgEntries((prev) =>
          prev.map((pe) => {
            const pb = feeInfo.program_fees?.programs_breakdown?.find(
              (x) => x.id === pe.id
            );
            return {
              ...pe,
              initialPaid: 0,
              payingNow: pb?.paid_amount ? pb.paid_amount.toString() : "",
            };
          })
        );
      } else {
        // Add Payment Mode: set initialPaid to db values, clear payingNow
        setInitialAdmPaid(feeInfo.admission_paid_amount ?? 0);
        setAdmPayingNow("");
        setProgEntries((prev) =>
          prev.map((pe) => {
            const pb = feeInfo.program_fees?.programs_breakdown?.find(
              (x) => x.id === pe.id
            );
            return {
              ...pe,
              initialPaid: pb?.paid_amount || 0,
              payingNow: "",
            };
          })
        );
      }
    }
  };

  const bsParts = useMemo(() => {
    return getBsDateParts(progPeriod || getCurrentPeriod());
  }, [progPeriod]);

  const selectedBsYear = bsParts?.year || 2083;
  const selectedBsMonth = bsParts?.month || 3;

  const handleBsYearChange = (year: number) => {
    const newPeriod = bsMonthYearToAdPeriod(year, selectedBsMonth);
    setProgPeriod(newPeriod);
  };

  const handleBsMonthChange = (month: number) => {
    const newPeriod = bsMonthYearToAdPeriod(selectedBsYear, month);
    setProgPeriod(newPeriod);
  };

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Single "total to pay" input that drives auto-distribution across checked items
  const [totalPayInput, setTotalPayInput] = useState("");

  const [settings, setSettings] = useState<any>(null);
  const [thermalFee, setThermalFee] = useState<any>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data?.setting || data.data);
      }
    } catch (e) {
      console.error("Settings fetch failed", e);
    }
  }, [BASE_URL]);

  useEffect(() => {
    if (isOpen) fetchSettings();
  }, [isOpen, fetchSettings]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Thermal_Bill_New`,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchFeeInfo = useCallback(
    async (studentId: string, month?: string) => {
      if (!studentId) return;
      try {
        setLoadingFeeInfo(true);
        setIsOverwriteMode(false);
        const token = localStorage.getItem("token");
        let url = `${BASE_URL}/admin/students/${studentId}/fee-info`;
        if (month) url += `?month_year=${encodeURIComponent(month)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          const d = data.data as FeeInfo;
          setFeeInfo(d);
          setShift(d.student?.shift || "");
          if (d.admission_exists) {
            setAdmBase((d.admission_amount ?? 0).toString());
            setAdmDisc(d.admission_discount ?? 0);
            setAdmDiscType(d.admission_discount_type ?? "cash");
            setInitialAdmPaid(d.admission_paid_amount ?? 0);
            setAdmPayingNow("");
          } else {
            setAdmBase((d.global_admission_fee ?? 0).toString());
            setAdmDisc(0);
            setAdmDiscType("cash");
            setInitialAdmPaid(0);
            setAdmPayingNow("");
          }
          setTotalPayInput("");
          if (d.period_record) {
            setRemarks((prev) => prev || d.period_record?.remarks || "");
            setPaymentMethods((prev) => {
              if (prev.length === 1 && prev[0] === "Cash") {
                const methods = String(
                  d.period_record?.payment_method || "Cash",
                )
                  .split(",")
                  .map((m) => m.trim())
                  .filter(Boolean);
                return methods.length > 0 ? methods : ["Cash"];
              }
              return prev;
            });
          }
          if (d.program_fees?.programs_breakdown) {
            setProgEntries(
              d.program_fees.programs_breakdown.map((pb) => ({
                id: pb.id,
                title: pb.title,
                base: pb.program_fee,
                // For carry-forward rows (due_month set): no discount; for monthly: use monthly_discount as default
                discount: pb.due_month ? 0 : (pb.discount ?? 0),
                discountType: pb.due_month
                  ? "cash"
                  : ((pb.discount_type as "cash" | "percentage") ?? "cash"),
                payingNow: "",
                initialPaid: pb.paid_amount || 0,
                billingMode: pb.billing_mode,
                dueMonth: pb.due_month ?? undefined,
                monthlyDiscount: pb.monthly_discount ?? 0,
                monthlyDiscountType:
                  (pb.monthly_discount_type as "cash" | "percentage") ?? "cash",
              })),
            );
          }
        }
      } catch (err) {
        console.error("Fee info error:", err);
      } finally {
        setLoadingFeeInfo(false);
      }
    },
    [BASE_URL],
  );

  useEffect(() => {
    if (selectedStudentId && isOpen) {
      fetchFeeInfo(selectedStudentId, progPeriod);
    }
  }, [selectedStudentId, progPeriod, isOpen, fetchFeeInfo]);

  useEffect(() => {
    if (!feeInfo) return;
    const ids = new Set<string>();
    if (feeInfo.admission_exists || (feeInfo.global_admission_fee ?? 0) > 0)
      ids.add("admission");
    feeInfo.program_fees?.programs_breakdown?.forEach((pb) =>
      ids.add(String(pb.id)),
    );
    setCheckedIds(ids);
  }, [feeInfo]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoadingStudents(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/admin/students?per_page=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStudents(data.data?.data || data.data || []);
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    })();
    if (fee) {
      setSelectedStudentId(fee.student_id?.toString() ?? "");
      setSelectedStudent(fee.student ?? null);
      setSearchQuery(fee.student?.name ?? "");
      setProgPeriod(fee.month_year ?? "");
      const methods = String(fee.payment_method || "Cash")
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean);
      setPaymentMethods(methods.length > 0 ? methods : ["Cash"]);
      setRemarks(fee.remarks ?? "");
      setShift(fee.shift ?? "");
    }
  }, [isOpen, fee, BASE_URL]);

  /* ─── Calculations ─────────────────────────────────── */
  const calculations = useMemo(() => {
    const admissionPaidGlobally = feeInfo?.admission_paid ?? false;
    const admBaseNum = Number(admBase) || 0;
    const admNet = calcNet(admBaseNum, admDisc, admDiscType);
    const admCurrentPaying = Math.max(0, Number(admPayingNow) || 0);
    const totalAdmPaid = initialAdmPaid + admCurrentPaying;
    const admDue = admNet - initialAdmPaid; // "still owed before this session"
    const admRemaining = admDue - admCurrentPaying; // after entering paying now
    const hasAdm =
      (admBaseNum > 0 || admCurrentPaying > 0 || initialAdmPaid > 0) &&
      !(admissionPaidGlobally && admDue <= 0 && !fee);

    const progData = progEntries.map((pe) => {
      const net = calcNet(pe.base, pe.discount, pe.discountType);
      const currentPaying = Math.max(0, Number(pe.payingNow) || 0);
      const due = net - (pe.initialPaid || 0); // owed before this session (can be negative = credit)
      const remaining = due - currentPaying; // after this payment
      const totalPaid = (pe.initialPaid || 0) + currentPaying;
      return { ...pe, net, currentPaying, totalPaid, due, remaining };
    });

    const progBaseSum = progData.reduce((a, c) => a + c.base, 0);
    const progNetSum = progData.reduce((a, c) => a + c.net, 0);
    const hasProg = progBaseSum > 0;

    const grandTotal = (hasAdm ? admNet : 0) + (hasProg ? progNetSum : 0);
    const totalCollected =
      (hasAdm ? totalAdmPaid : 0) +
      progData.reduce((a, c) => a + c.totalPaid, 0);
    const grandDue = Math.max(0, grandTotal - totalCollected);
    const totalDiscount =
      (hasAdm ? admBaseNum - admNet : 0) +
      progData.reduce((a, c) => a + (c.base - c.net), 0);

    return {
      hasAdm,
      hasProg,
      admBaseNum,
      admNet,
      totalAdmPaid,
      admDue,
      admRemaining,
      admCurrentPaying,
      admissionPaidGlobally,
      progData,
      progBaseSum,
      progNetSum,
      grandTotal,
      totalCollected,
      grandDue,
      totalDiscount,
    };
  }, [
    admBase,
    admDisc,
    admDiscType,
    admPayingNow,
    initialAdmPaid,
    progEntries,
    fee,
    feeInfo,
  ]);

  // Total Gross (before discount) for checked items
  const selectedGrossTotal = useMemo(() => {
    let t = 0;
    if (checkedIds.has("admission") && calculations.hasAdm)
      t += calculations.admBaseNum;
    calculations.progData.forEach((p) => {
      if (checkedIds.has(String(p.id))) t += p.base;
    });
    return t;
  }, [checkedIds, calculations]);

  // Total DUE (before this session) for checked items
  const selectedDueTotal = useMemo(() => {
    let t = 0;
    if (checkedIds.has("admission") && calculations.hasAdm)
      t += calculations.admDue;
    calculations.progData.forEach((p) => {
      if (checkedIds.has(String(p.id))) t += p.due;
    });
    return t;
  }, [checkedIds, calculations]);

  // Total being paid THIS session for checked items
  const selectedPayingTotal = useMemo(() => {
    let t = 0;
    if (checkedIds.has("admission") && calculations.hasAdm)
      t += calculations.admCurrentPaying;
    calculations.progData.forEach((p) => {
      if (checkedIds.has(String(p.id))) t += p.currentPaying;
    });
    return t;
  }, [checkedIds, calculations]);

  const excessAmount = Math.max(0, selectedPayingTotal - selectedDueTotal);
  const hasExcess = excessAmount > 0;

  const selectedCheckedCount = useMemo(() => {
    let c = 0;
    if (checkedIds.has("admission") && calculations.hasAdm) c++;
    calculations.progData.forEach((p) => {
      if (checkedIds.has(String(p.id))) c++;
    });
    return c;
  }, [checkedIds, calculations]);

  const totalItemCount = useMemo(() => {
    let c = 0;
    if (calculations.hasAdm) c++;
    c += calculations.progData.length;
    return c;
  }, [calculations]);

  const allChecked =
    selectedCheckedCount === totalItemCount && totalItemCount > 0;

  const toggleCheck = (id: string) =>
    setCheckedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
      return;
    }
    const ids = new Set<string>();
    if (calculations.hasAdm) ids.add("admission");
    calculations.progData.forEach((p) => ids.add(String(p.id)));
    setCheckedIds(ids);
  };

  /* ─── Auto-distribute total pay input ─────────────── */
  const applyDistribution = useCallback(
    (amount: number) => {
      const items: { id: string; due: number }[] = [];
      if (
        checkedIds.has("admission") &&
        calculations.hasAdm &&
        calculations.admDue > 0
      )
        items.push({ id: "admission", due: calculations.admDue });
      calculations.progData.forEach((p) => {
        if (checkedIds.has(String(p.id)) && p.due > 0)
          items.push({ id: String(p.id), due: p.due });
      });

      if (items.length === 0) return;

      const dist = distributePayment(amount, items);
      if (dist["admission"] !== undefined)
        setAdmPayingNow(
          dist["admission"] > 0 ? dist["admission"].toString() : "",
        );
      setProgEntries((prev) =>
        prev.map((pe) => ({
          ...pe,
          payingNow:
            dist[String(pe.id)] !== undefined
              ? dist[String(pe.id)] > 0
                ? dist[String(pe.id)].toString()
                : ""
              : pe.payingNow,
        })),
      );
    },
    [checkedIds, calculations],
  );

  const handleTotalPayChange = (raw: string) => {
    const clamped = clamp(raw);
    setTotalPayInput(clamped);
    applyDistribution(Number(clamped) || 0);
  };

  const handlePayFull = () => {
    if (selectedCheckedCount === 0) {
      toast.error("Select at least one item");
      return;
    }
    const full = String(selectedDueTotal);
    setTotalPayInput(full);
    applyDistribution(selectedDueTotal);
  };

  const handleClear = () => {
    setAdmPayingNow("");
    setProgEntries((prev) => prev.map((pe) => ({ ...pe, payingNow: "" })));
    setTotalPayInput("");
    toast("Payment amounts cleared", { icon: "🗑️" });
  };

  const handleSubmit = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    if (!calculations.hasAdm && !calculations.hasProg) {
      toast.error("Enter at least one fee amount");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token")!;
      const url = fee
        ? `${BASE_URL}/admin/student-fees/${fee.id}`
        : `${BASE_URL}/admin/student-fees`;

      let activeFeeType: string = "program";
      if (fee) {
        const typesStr = fee.fee_type || fee.fee_types || "";
        if (typesStr.includes("admission") && typesStr.includes("program")) {
          activeFeeType = "billing";
        } else if (typesStr.includes("admission")) {
          activeFeeType = "admission";
        } else if (typesStr.includes("billing")) {
          activeFeeType = "billing";
        } else {
          activeFeeType = "program";
        }
      } else {
        if (calculations.hasAdm && calculations.hasProg) {
          activeFeeType = "billing";
        } else if (calculations.hasAdm) {
          activeFeeType = "admission";
        } else {
          activeFeeType = "program";
        }
      }

      const payload: Record<string, any> = {
        student_id: selectedStudentId,
        fee_type: activeFeeType,
        month_year: progPeriod,
        payment_method: paymentMethods.join(", "),
        remarks: remarks || `${activeFeeType} — ${formatMonthYear(progPeriod)}`,
        shift: shift || undefined,
      };

      const feeItems: any[] = [];

      // 1. Admission item if checked and exists
      if (checkedIds.has("admission") && calculations.hasAdm) {
        feeItems.push({
          type: "admission",
          month_year: progPeriod,
          base_amount: calculations.admBaseNum,
          discount: admDisc,
          discount_type: admDiscType,
          paying_now: fee ? calculations.totalAdmPaid : calculations.admCurrentPaying,
        });
      }

      // 2. Program items
      calculations.progData.forEach((p) => {
        if (checkedIds.has(String(p.id))) {
          feeItems.push({
            type: "program",
            program_id: p.id,
            month_year: p.dueMonth || progPeriod,
            base_amount: p.base,
            discount: p.discount,
            discount_type: p.discountType,
            paying_now: fee ? p.totalPaid : p.currentPaying,
          });
        }
      });

      payload.fee_items = feeItems;

      const res = await fetch(url, {
        method: fee ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to save payment");

      toast.success("Payment processed successfully!");

      const printFee = {
        id: result.id || fee?.id || "N/A",
        student: selectedStudent,
        month_year: progPeriod,
        payment_method: paymentMethods.join(", "),
        shift: shift || undefined,
        remarks: remarks || undefined,
        fee_type: activeFeeType,
        total_amount: calculations.grandTotal,
        gross_amount:
          calculations.progBaseSum +
          (calculations.hasAdm ? calculations.admBaseNum : 0),
        discount_amount: calculations.totalDiscount,
        paid_amount: calculations.totalCollected,
        admission_fee: calculations.hasAdm ? calculations.admBaseNum : 0,
        admission_discount: admDisc,
        admission_discount_type: admDiscType,
        admission_paid_amount: calculations.totalAdmPaid,
        programs_breakdown: calculations.progData
          .filter((p) => checkedIds.has(String(p.id)))
          .map((p) => ({
            title: p.title,
            program_fee: p.base,
            discount: p.discount,
            discount_type: p.discountType,
            paid_amount: p.totalPaid,
          })),
        payments: [
          {
            created_at: new Date().toISOString(),
            payment_method: paymentMethods.join(", "),
            paid_amount: calculations.totalCollected,
          },
        ],
      };

      setThermalFee(printFee);

      setTimeout(() => {
        handlePrint();
        onSuccess();
        onClose();
      }, 500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      students.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [students, searchQuery],
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-brand-deep/30 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 animate-fade-in">
        <div className="bg-surface w-full max-w-[1100px] max-h-[98vh] sm:max-h-[94vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-scale-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary tracking-tight">
                  {fee ? "Edit Payment Record" : "New Payment Entry"}
                </h2>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
                  {selectedStudent ? (
                    <>
                      Processing for{" "}
                      <span className="text-primary">
                        {selectedStudent.name}
                      </span>
                    </>
                  ) : (
                    "Manage fees and billing"
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-error/10 hover:text-error rounded-md transition-all duration-300 text-text-muted cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-5">
              {/* 1. Student */}
              <section className="space-y-4">
                {!fee && !selectedStudent ? (
                  <div ref={dropdownRef} className="relative">
                    <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-sm group">
                      <Search className="w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setDropdownOpen(true);
                        }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder="Search by name or class..."
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-muted text-text-primary font-medium"
                      />
                    </div>
                    {dropdownOpen && filteredStudents.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto py-1 animate-scale-in custom-scrollbar">
                        {filteredStudents.slice(0, 50).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setSelectedStudentId(s.id.toString());
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-surface-hover text-sm flex items-center justify-between transition-colors border-b border-border/50 last:border-0 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary transition-transform group-hover:scale-110">
                                {initials(s.name)}
                              </div>
                              <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                                {s.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted bg-background px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                              {s.classes}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/10 rounded-xl animate-fade-in group hover:bg-primary/10 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center font-black text-base shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                      {initials(selectedStudent?.name ?? "??")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-text-primary tracking-tight">
                        {selectedStudent?.name}
                      </p>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
                        {selectedStudent?.classes}
                      </p>
                    </div>
                    {!fee && (
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setSelectedStudentId("");
                          setFeeInfo(null);
                          setProgEntries([]);
                          setCheckedIds(new Set());
                          setTotalPayInput("");
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white bg-white hover:bg-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* 2. Fee Breakdown */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">
                      2
                    </span>
                    <h3 className="text-[15px] font-black text-text-primary tracking-tight">
                      Fee Breakdown
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <MethodDropdown
                      value={paymentMethods}
                      onChange={setPaymentMethods}
                    />

                    {/* Nepali Year Selector */}
                    <div className="relative">
                      <select
                        value={selectedBsYear}
                        onChange={(e) =>
                          handleBsYearChange(Number(e.target.value))
                        }
                        className="px-3 py-2 text-xs font-black uppercase tracking-wider text-text-primary bg-background border border-border rounded-lg hover:bg-surface-hover hover:border-primary/50 transition-all cursor-pointer shadow-sm outline-none appearance-none pr-8 min-w-[90px]"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2080 + i).map(
                          (year) => (
                            <option key={year} value={year}>
                              {toNepaliDigits(year)}
                            </option>
                          ),
                        )}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Nepali Month Selector */}
                    <div className="relative">
                      <select
                        value={selectedBsMonth}
                        onChange={(e) =>
                          handleBsMonthChange(Number(e.target.value))
                        }
                        className="px-3 py-2 text-xs font-black uppercase tracking-wider text-text-primary bg-background border border-border rounded-lg hover:bg-surface-hover hover:border-primary/50 transition-all cursor-pointer shadow-sm outline-none appearance-none pr-8 min-w-[110px]"
                      >
                        {nepaliMonthNames.map((name, index) => (
                          <option key={name} value={index + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {loadingFeeInfo && selectedStudent ? (
                  <div className="text-center py-12 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-gray-400 font-medium">
                      Loading fee details...
                    </p>
                  </div>
                ) : selectedStudent &&
                  (calculations.hasAdm || calculations.hasProg) ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/70">
                              <th className="w-10 px-3 py-2.5">
                                <Checkbox
                                  checked={allChecked}
                                  onChange={toggleAll}
                                />
                              </th>
                              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Item
                              </th>
                              <th className="text-right px-3 py-2.5 w-[90px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Base
                              </th>
                              <th className="text-center px-3 py-2.5 w-[170px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Discount
                              </th>
                              <th className="text-right px-3 py-2.5 w-[80px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Net
                              </th>
                              <th className="px-3 py-2.5 w-[170px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                                Paying Now
                              </th>
                              <th className="text-right px-3 py-2.5 w-[80px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Balance
                              </th>
                              <th className="text-center px-3 py-2.5 w-[70px] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {calculations.hasAdm && (
                              <tr
                                className={`group transition-colors ${calculations.admissionPaidGlobally ? "bg-emerald-50/40" : "hover:bg-gray-50/50"}`}
                              >
                                <td className="px-3 py-3">
                                  <Checkbox
                                    checked={checkedIds.has("admission")}
                                    onChange={() => toggleCheck("admission")}
                                    disabled={
                                      calculations.admissionPaidGlobally
                                    }
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <Wallet className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <div>
                                      <p className="text-[13px] font-semibold text-gray-800">
                                        Admission Fee
                                      </p>
                                      {calculations.admissionPaidGlobally && (
                                        <span className="text-[10px] text-emerald-600 font-bold">
                                          FULLY PAID
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={admBase}
                                    onChange={(e) =>
                                      setAdmBase(clamp(e.target.value))
                                    }
                                    onKeyDown={blockNeg}
                                    disabled={
                                      calculations.admissionPaidGlobally
                                    }
                                    className="w-full text-right bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-300 font-medium disabled:opacity-50"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      value={admDisc || ""}
                                      onChange={(e) =>
                                        setAdmDisc(
                                          Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                          ),
                                        )
                                      }
                                      onKeyDown={blockNeg}
                                      disabled={
                                        calculations.admissionPaidGlobally
                                      }
                                      placeholder="0"
                                      className="w-14 text-right bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-300 disabled:opacity-50"
                                    />
                                    <TogglePill
                                      size="xs"
                                      options={[
                                        { label: "Rs.", value: "cash" },
                                        { label: "%", value: "percentage" },
                                      ]}
                                      value={admDiscType}
                                      onChange={(v) =>
                                        setAdmDiscType(
                                          v as "cash" | "percentage",
                                        )
                                      }
                                      disabled={
                                        calculations.admissionPaidGlobally
                                      }
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span className="text-[13px] font-bold text-gray-900">
                                    {fmtS(calculations.admNet)}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    {initialAdmPaid > 0 && (
                                      <div className="flex justify-between items-center bg-emerald-50/80 rounded-md px-2 py-0.5">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                                          Prev paid
                                        </span>
                                        <span className="text-[11px] font-bold text-emerald-700">
                                          {fmtS(initialAdmPaid)}
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="number"
                                      min={0}
                                      value={admPayingNow}
                                      onChange={(e) =>
                                        setAdmPayingNow(clamp(e.target.value))
                                      }
                                      onKeyDown={blockNeg}
                                      disabled={
                                        calculations.admissionPaidGlobally
                                      }
                                      placeholder="0"
                                      className="w-full text-right bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-400 font-semibold disabled:opacity-50 placeholder:text-gray-300"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span
                                    className={`text-[13px] font-bold ${calculations.admRemaining > 0 ? "text-amber-600" : calculations.admRemaining < 0 ? "text-emerald-600" : "text-gray-300"}`}
                                  >
                                    {calculations.admRemaining !== 0
                                      ? calculations.admRemaining < 0
                                        ? `+${fmtS(Math.abs(calculations.admRemaining))} CR`
                                        : fmtS(calculations.admRemaining)
                                      : "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {calculations.admRemaining <= 0 &&
                                  calculations.admNet > 0 ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                      PAID
                                    </span>
                                  ) : calculations.admNet > 0 ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                      DUE
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            )}

                            {calculations.progData.map((p) => (
                              <tr
                                key={p.id}
                                className="group hover:bg-gray-50/50 transition-colors"
                              >
                                <td className="px-3 py-3">
                                  <Checkbox
                                    checked={checkedIds.has(String(p.id))}
                                    onChange={() => toggleCheck(String(p.id))}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.dueMonth ? "bg-amber-50" : "bg-violet-50"}`}
                                    >
                                      <BookOpen
                                        className={`w-3.5 h-3.5 ${p.dueMonth ? "text-amber-500" : "text-violet-500"}`}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[160px]">
                                        {p.title}
                                      </p>
                                      {p.dueMonth ? (
                                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                          DUE:{" "}
                                          {formatPeriodToReadable(p.dueMonth)}
                                        </span>
                                      ) : p.billingMode === "monthly" ? (
                                        <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                          Monthly
                                        </span>
                                      ) : p.billingMode === "fixed" ? (
                                        <span className="text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                          Fixed
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  {/* Carry-forward rows: base is read-only (historical amount) */}
                                  {p.dueMonth ? (
                                    <div className="text-right text-[12px] font-bold text-gray-700 px-2">
                                      {fmtS(p.base)}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.base}
                                      onChange={(e) =>
                                        setProgEntries((prev) =>
                                          prev.map((o) =>
                                            o.id === p.id
                                              ? {
                                                  ...o,
                                                  base:
                                                    Number(
                                                      clamp(e.target.value),
                                                    ) || 0,
                                                }
                                              : o,
                                          ),
                                        )
                                      }
                                      onKeyDown={blockNeg}
                                      className="w-full text-right bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-300 font-medium"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.discount || ""}
                                      onChange={(e) =>
                                        setProgEntries((prev) =>
                                          prev.map((o) =>
                                            o.id === p.id
                                              ? {
                                                  ...o,
                                                  discount: Math.max(
                                                    0,
                                                    Number(e.target.value) || 0,
                                                  ),
                                                }
                                              : o,
                                          ),
                                        )
                                      }
                                      onKeyDown={blockNeg}
                                      placeholder="0"
                                      className="w-14 text-right bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-300"
                                    />
                                    <TogglePill
                                      size="xs"
                                      options={[
                                        { label: "Rs.", value: "cash" },
                                        { label: "%", value: "percentage" },
                                      ]}
                                      value={p.discountType}
                                      onChange={(v) =>
                                        setProgEntries((prev) =>
                                          prev.map((o) =>
                                            o.id === p.id
                                              ? {
                                                  ...o,
                                                  discountType: v as
                                                    | "cash"
                                                    | "percentage",
                                                }
                                              : o,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span className="text-[13px] font-bold text-gray-900">
                                    {fmtS(p.net)}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    {(p.initialPaid ?? 0) > 0 && (
                                      <div className="flex justify-between items-center bg-emerald-50/80 rounded-md px-2 py-0.5">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                                          Prev paid
                                        </span>
                                        <span className="text-[11px] font-bold text-emerald-700">
                                          {fmtS(p.initialPaid!)}
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.payingNow}
                                      onChange={(e) =>
                                        setProgEntries((prev) =>
                                          prev.map((o) =>
                                            o.id === p.id
                                              ? {
                                                  ...o,
                                                  payingNow: clamp(
                                                    e.target.value,
                                                  ),
                                                }
                                              : o,
                                          ),
                                        )
                                      }
                                      onKeyDown={blockNeg}
                                      placeholder="0"
                                      className="w-full text-right bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-gray-400 font-semibold placeholder:text-gray-300"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span
                                    className={`text-[13px] font-bold ${p.remaining > 0 ? "text-amber-600" : p.remaining < 0 ? "text-emerald-600" : "text-gray-300"}`}
                                  >
                                    {p.remaining !== 0
                                      ? p.remaining < 0
                                        ? `+${fmtS(Math.abs(p.remaining))} CR`
                                        : fmtS(p.remaining)
                                      : "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {p.remaining <= 0 && p.net > 0 ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                      PAID
                                    </span>
                                  ) : p.net > 0 ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                      DUE
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 border transition-colors ${hasExcess ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400 font-medium">
                              Selected
                            </span>
                            <span className="text-[13px] font-bold text-gray-900">
                              {selectedCheckedCount}
                              <span className="text-gray-400 font-medium text-[11px]">
                                /{totalItemCount}
                              </span>
                            </span>
                          </div>
                          <div className="w-px h-5 bg-gray-200" />
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-px">
                              Gross Total
                            </span>
                            <span className="text-[15px] font-extrabold text-gray-500">
                              {fmt(selectedGrossTotal)}
                            </span>
                          </div>
                          <div className="w-px h-5 bg-gray-200" />
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-px">
                              Due This Session
                            </span>
                            <span
                              className={`text-[15px] font-extrabold ${selectedDueTotal > 0 ? "text-gray-900" : "text-emerald-600"}`}
                            >
                              {fmt(selectedDueTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          {hasExcess && (
                            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                              <RotateCcw className="w-3 h-3 text-amber-500" />
                              <div>
                                <span className="text-[8px] text-amber-500 font-bold uppercase tracking-widest block leading-none mb-0.5">
                                  Return
                                </span>
                                <span className="text-[13px] font-extrabold text-amber-600 leading-none">
                                  {fmt(excessAmount)}
                                </span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={handleClear}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-red-500 rounded-lg text-[11px] font-medium transition-colors border border-transparent hover:border-red-100 hover:bg-red-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Clear
                          </button>
                          <button
                            onClick={handlePayFull}
                            disabled={
                              selectedCheckedCount === 0 ||
                              selectedDueTotal <= 0
                            }
                            className="px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-all disabled:opacity-30"
                          >
                            Pay Full
                          </button>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400 pointer-events-none">
                              Rs.
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={totalPayInput}
                              onChange={(e) =>
                                handleTotalPayChange(e.target.value)
                              }
                              onKeyDown={blockNeg}
                              placeholder={
                                selectedDueTotal > 0
                                  ? fmtS(selectedDueTotal)
                                  : "0"
                              }
                              disabled={selectedCheckedCount === 0}
                              className={`w-[160px] bg-white border rounded-xl pl-7 pr-3 py-2 text-[14px] font-bold outline-none transition-all placeholder:text-gray-300 disabled:opacity-40 ${hasExcess ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-amber-700" : Number(totalPayInput) > 0 ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-emerald-700" : "border-gray-300 focus:border-gray-400"}`}
                            />
                          </div>
                        </div>
                      </div>
                      {selectedCheckedCount === 0 && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          ☝ Check items above to activate payment entry
                        </p>
                      )}
                      {fee && (
                        <div className="mt-3 flex items-center justify-end">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isOverwriteMode}
                              onChange={(e) =>
                                handleToggleOverwriteMode(e.target.checked)
                              }
                              className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            Correct previous payment typo (overwrite mode)
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ) : !selectedStudent ? (
                  <div className="text-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                    <User className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">
                      Select a student to view fee breakdown
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                    <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">
                      No fee items found for this student
                    </p>
                  </div>
                )}
              </section>

              {/* 3. Notes */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <h3 className="text-[15px] font-black text-text-primary tracking-tight">
                    Additional Notes
                  </h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any specific details or remarks about this payment..."
                    className="flex-1 border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none h-24 bg-background placeholder:text-text-muted"
                    rows={3}
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-border bg-surface/80 backdrop-blur-sm sticky bottom-0 z-20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center sm:justify-start">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                    Total cost
                  </span>
                  <span className="text-xl font-black text-text-primary tracking-tight">
                    {fmt(
                      calculations.progBaseSum +
                        (calculations.hasAdm ? calculations.admBaseNum : 0),
                    )}
                  </span>
                </div>
                <div className="text-border text-lg font-light hidden sm:block">
                  −
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                    Discount
                  </span>
                  <span className="text-xl font-black text-primary tracking-tight">
                    {fmt(calculations.totalDiscount)}
                  </span>
                </div>
                <div className="text-border text-lg font-light hidden sm:block">
                  =
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                    Final Bill
                  </span>
                  <span className="text-xl font-black text-text-primary tracking-tight">
                    {fmt(calculations.grandTotal)}
                  </span>
                </div>
                <div className="w-px h-10 bg-border hidden sm:block mx-1" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                    Collecting
                  </span>
                  <span className="text-xl font-black text-success tracking-tight">
                    {fmt(calculations.totalCollected)}
                  </span>
                </div>
                <div className="w-px h-10 bg-border hidden sm:block mx-1" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
                    Balance Due
                  </span>
                  <span
                    className={`text-xl font-black tracking-tight ${calculations.grandDue > 0 ? "text-warning" : "text-success"}`}
                  >
                    {calculations.grandDue < 0
                      ? `+${fmt(Math.abs(calculations.grandDue))} Credit`
                      : fmt(calculations.grandDue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-3.5 text-sm font-black uppercase tracking-widest text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-2xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedStudentId}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/25 hover:bg-primary-hover hover:-translate-y-1 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>{fee ? "Update Payment" : "Record Payment"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 bg-background border border-border rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${calculations.grandTotal > 0 ? Math.min(100, (calculations.totalCollected / calculations.grandTotal) * 100) : 0}%`,
                  backgroundColor:
                    calculations.totalCollected >= calculations.grandTotal &&
                    calculations.grandTotal > 0
                      ? "var(--success)"
                      : "var(--primary)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Print Template - Hidden from UI */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {thermalFee && (
            <div ref={printRef} className="print-wrapper">
              <ThermalBill fee={thermalFee} settings={settings} />
              <ThermalBill fee={thermalFee} settings={settings} />
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default FeeAddModal;
