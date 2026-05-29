"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { formatDate, formatMonthYear } from "@/lib/utils";
import {
  X,
  User,
  CreditCard,
  Calendar,
  Printer,
  CheckCircle2,
  Clock,
  Wallet,
  Info,
  Receipt,
  Layers,
  Banknote,
  Building,
  Smartphone,
  FileText,
  BookOpen,
  Loader2,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { ThermalBill } from "./ThermalBill";
import { A4Bill } from "./A4Bill";
import { Portal } from "../global/Portal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fee: any;
}

interface ProgramItem {
  id: number | string;
  title: string;
  base: number;
  disc: number;
  discType: "cash" | "percentage";
  net: number;
  totalPaid: number;
  remaining: number;
}

/* ─── Helpers (mirrors FeeAddModal) ──────────────────────── */
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

const METHOD_MAP: Record<string, { icon: typeof Banknote; label: string }> = {
  Cash: { icon: Banknote, label: "Cash" },
  "Bank Transfer": { icon: Building, label: "Bank Transfer" },
  "Digital Wallet": { icon: Smartphone, label: "Digital Wallet" },
  Cheque: { icon: FileText, label: "Cheque" },
};

/* ─── Status Badge ───────────────────────────────────────── */
const StatusBadge: React.FC<{ remaining: number; net: number }> = ({
  remaining,
  net,
}) => {
  if (net <= 0) return <span className="text-gray-300">—</span>;
  if (remaining <= 0)
    return (
      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
        PAID
      </span>
    );
  return (
    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
      DUE
    </span>
  );
};

/* ─── Balance Cell ───────────────────────────────────────── */
const BalanceCell: React.FC<{ value: number }> = ({ value }) => {
  if (value === 0) return <span className="text-gray-300">—</span>;
  if (value < 0)
    return (
      <span className="text-[13px] font-bold text-emerald-600">
        +{fmtS(Math.abs(value))} CR
      </span>
    );
  return (
    <span className="text-[13px] font-bold text-amber-600">{fmtS(value)}</span>
  );
};

/* ─── Discount Cell ──────────────────────────────────────── */
const DiscountCell: React.FC<{
  amount: number;
  type: "cash" | "percentage";
  saved: number;
}> = ({ amount, type, saved }) => {
  if (amount <= 0) return <span className="text-gray-300">—</span>;
  return (
    <span className="text-[11px] text-gray-500 font-medium">
      −{type === "percentage" ? `${amount}%` : fmtS(amount)}
      <span className="text-gray-400 ml-1">({fmtS(saved)})</span>
    </span>
  );
};

/* ─── Main Modal ─────────────────────────────────────────── */
const FeeViewModal: React.FC<Props> = ({ isOpen, onClose, fee }) => {
  const [enrichedFee, setEnrichedFee] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchFullDetails = useCallback(
    async (studentId: number | string, monthYear: string) => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BASE_URL}/admin/students/${studentId}/fee-info?month_year=${encodeURIComponent(monthYear)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const text = await res.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          console.error("Invalid response from server:", text);
          return;
        }
        if (res.ok && result.data) {
          const data = result.data;
          setEnrichedFee({
            ...fee,
            admission_fee: data.admission_amount || fee.admission_fee,
            admission_discount: data.admission_discount,
            admission_discount_type:
              data.admission_discount_type || fee.admission_discount_type,
            admission_paid_amount:
              data.admission_paid_amount || fee.admission_paid_amount,
            programs_breakdown: data.program_fees?.programs_breakdown || [],
            total_amount: fee.total_amount,
            paid_amount: fee.paid_amount,
            pending_amount: fee.pending_amount,
            payments: data.payments || [],
          });
        }
      } catch (error) {
        console.error("Failed to enrich fee data:", error);
      } finally {
        setLoading(false);
      }
    },
    [BASE_URL, fee],
  );

  useEffect(() => {
    if (!isOpen || !fee) {
      setEnrichedFee(null);
      return;
    }

    const isEnriched =
      fee.programs_breakdown || fee.admission_fee || fee.program_payments;

    if (!isEnriched && fee.student_id && fee.month_year) {
      fetchFullDetails(fee.student_id, fee.month_year);
    } else {
      setEnrichedFee(fee);
    }
  }, [isOpen, fee, fetchFullDetails]);

  const activeFee = enrichedFee || fee;
  const isIntegrated =
    activeFee?.fee_types?.includes("billing") ||
    activeFee?.fee_type === "billing";
  const methodInfo =
    METHOD_MAP[activeFee?.payment_method] || METHOD_MAP["Cash"];
  const MethodIcon = methodInfo.icon;

  const adm = useMemo(() => {
    if (!activeFee)
      return {
        base: 0,
        disc: 0,
        discType: "cash" as "cash" | "percentage",
        net: 0,
        totalPaid: 0,
        remaining: 0,
        exists: false,
      };
    const base = Number(activeFee.admission_fee) || 0;
    const disc = Number(activeFee.admission_discount) || 0;
    const discType =
      (activeFee.admission_discount_type as "cash" | "percentage") || "cash";
    const net = calcNet(base, disc, discType);
    const totalPaid = Number(activeFee.admission_paid_amount) || 0;
    const remaining = net - totalPaid;
    const wasInBilling =
      activeFee.fee_types?.includes("admission") ||
      activeFee.fee_type === "admission" ||
      isIntegrated;
    return {
      base,
      disc,
      discType,
      net,
      totalPaid,
      remaining,
      exists: base > 0 && wasInBilling,
    };
  }, [activeFee, isIntegrated]);

  const programs = useMemo<ProgramItem[]>(() => {
    if (!activeFee) return [];
    if (
      activeFee.programs_breakdown &&
      Array.isArray(activeFee.programs_breakdown)
    ) {
      return activeFee.programs_breakdown.map((pb: any) => {
        const base = Number(pb.program_fee) || 0;
        const disc = Number(pb.discount) || 0;
        const discType = (pb.discount_type as "cash" | "percentage") || "cash";
        const net = calcNet(base, disc, discType);
        const totalPaid = Number(pb.paid_amount) || 0;
        const remaining = net - totalPaid;
        return {
          id: pb.id,
          title: pb.title,
          base,
          disc,
          discType,
          net,
          totalPaid,
          remaining,
        };
      });
    }
    if (
      activeFee.program_payments &&
      typeof activeFee.program_payments === "object"
    ) {
      const discounts: Record<string, any> = activeFee.program_discounts || {};
      const progList: any[] =
        activeFee.programs || activeFee.selected_programs_details || [];
      return Object.entries(activeFee.program_payments).map(([id, paid]) => {
        const d = discounts[id] || {};
        const prog = progList.find((p: any) => String(p.id) === id);
        const base = Number(prog?.program_fee || prog?.fee) || 0;
        const disc = Number(d.amount) || 0;
        const discType = (d.type as "cash" | "percentage") || "cash";
        const net = calcNet(base, disc, discType);
        const totalPaid = Number(paid) || 0;
        const remaining = net - totalPaid;
        return {
          id: Number(id),
          title: prog?.title || `Program #${id}`,
          base,
          disc,
          discType,
          net,
          totalPaid,
          remaining,
        };
      });
    }
    if (Number(activeFee.program_fee) > 0) {
      const base = Number(activeFee.program_fee);
      const disc = Number(activeFee.program_discount) || 0;
      const discType =
        (activeFee.program_discount_type as "cash" | "percentage") || "cash";
      const net = calcNet(base, disc, discType);
      const isPaid = Number(activeFee.pending_amount || 0) <= 0;
      return [
        {
          id: 0,
          title: "Program Fee",
          base,
          disc,
          discType,
          net,
          totalPaid: isPaid ? net : 0,
          remaining: isPaid ? 0 : net,
        },
      ];
    }
    return [];
  }, [activeFee]);

  const itemTotals = useMemo(() => {
    const baseSum =
      (adm.exists ? adm.base : 0) +
      programs.reduce((a: number, c: ProgramItem) => a + c.base, 0);
    const netSum =
      (adm.exists ? adm.net : 0) +
      programs.reduce((a: number, c: ProgramItem) => a + c.net, 0);
    const paidSum =
      (adm.exists ? adm.totalPaid : 0) +
      programs.reduce((a: number, c: ProgramItem) => a + c.totalPaid, 0);
    const discountSum = baseSum - netSum;
    return { baseSum, netSum, paidSum, discountSum };
  }, [adm, programs]);

  const footerBill = Number(activeFee?.total_amount) || itemTotals.netSum;
  const footerCollected = Number(activeFee?.paid_amount) || itemTotals.paidSum;
  const serverPending = Number(activeFee?.pending_amount);
  const footerDue = !isNaN(serverPending)
    ? serverPending
    : Math.max(0, footerBill - footerCollected);
  const footerCost = itemTotals.baseSum || footerBill;
  const footerDiscount = footerCost - footerBill;

  const itemCount = (adm.exists ? 1 : 0) + programs.length;
  const paidCount =
    (adm.exists && adm.remaining <= 0 && adm.net > 0 ? 1 : 0) +
    programs.filter((p) => p.remaining <= 0 && p.net > 0).length;
  const fullyPaid = paidCount === itemCount && itemCount > 0;

  const printRef = React.useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<any>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setSettings(data.data.setting);
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  }, [BASE_URL]);

  useEffect(() => {
    if (isOpen) fetchSettings();
  }, [isOpen, fetchSettings]);

  const printRefA4 = React.useRef<HTMLDivElement>(null);

  const handleThermalPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Thermal_Bill_${fee?.id}`,
  });

  const handleA4Print = useReactToPrint({
    contentRef: printRefA4,
    documentTitle: `A4_Bill_${fee?.id}`,
  });

  const thermalFee = activeFee
    ? {
        ...activeFee,
        discount: footerDiscount,
        student: activeFee?.student || {
          name: activeFee?.student_name || "N/A",
        },
      }
    : null;

  if (!isOpen || !fee) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-brand-deep/30 backdrop-blur-md flex items-center justify-center z-[150] p-2 sm:p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-surface w-full max-w-[850px] max-h-[98vh] sm:max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          id="receipt-content"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-sm sticky top-0 z-20 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary tracking-tight">
                  Payment Receipt
                </h2>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
                  Ref:{" "}
                  <span className="text-text-primary">
                    #TRS-{activeFee.id?.toString().padStart(6, "0")}
                  </span>
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
            <div className="p-4 sm:p-6 space-y-6">
              {/* Branding for print */}
              <div className="hidden print:block text-center mb-8 border-b border-gray-200 pb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  AASTHA KALA KENDRA
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                  Professional Arts Center
                </p>
              </div>

              {/* Student Card */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  {initials(activeFee.student_name || "??")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-gray-900 truncate">
                    {activeFee.student_name || "N/A"}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                      ID: #{activeFee.student_id}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                      {activeFee.month_year ? formatMonthYear(activeFee.month_year) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                      fullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {fullyPaid ? "Fully Paid" : "Partial Payment"}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-2">
                    <MethodIcon className="w-3 h-3" /> Method
                  </p>
                  <p className="text-xs font-black text-gray-900 uppercase">
                    {methodInfo.label}
                  </p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Date
                  </p>
                  <p className="text-xs font-black text-gray-900 uppercase">
                    {formatDate(activeFee.payment_date)}
                  </p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Status
                  </p>
                  <StatusBadge remaining={footerDue} net={footerBill} />
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Receipt
                  </p>
                  <p className="text-xs font-black text-gray-900 uppercase">
                    #{activeFee.id}
                  </p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Description
                      </th>
                      <th className="text-right px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adm.exists && (
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-black text-gray-800">Admission Fee</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">New Student Registration</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="text-[13px] font-black text-gray-900">{fmt(adm.net)}</p>
                        </td>
                      </tr>
                    )}
                    {programs.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-black text-gray-800">{p.title}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Monthly Tuition Fee</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="text-[13px] font-black text-gray-900">{fmt(p.net)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeFee.remarks && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative Notes</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 italic leading-relaxed">
                    "{activeFee.remarks}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-5 border-t border-border bg-gray-50/80 backdrop-blur-md flex items-center justify-between print:hidden">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bill</span>
                <span className="text-lg font-black text-gray-900 tracking-tight">{fmt(footerBill)}</span>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Collected</span>
                <span className="text-lg font-black text-emerald-600 tracking-tight">{fmt(footerCollected)}</span>
              </div>
              {footerDue > 0 && (
                <>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending</span>
                    <span className="text-lg font-black text-amber-600 tracking-tight">{fmt(footerDue)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleA4Print()}
                className="px-6 py-3 border border-border bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm active:scale-95"
              >
                A4 Receipt
              </button>
              <button
                onClick={() => handleThermalPrint()}
                className="px-6 py-3 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Thermal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Content */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef} className="print-wrapper">
          {thermalFee && (
            <>
              <ThermalBill fee={thermalFee} settings={settings} />
              <ThermalBill fee={thermalFee} settings={settings} />
            </>
          )}
        </div>
        {activeFee && <A4Bill ref={printRefA4} fee={activeFee} settings={settings} />}
      </div>
    </Portal>
  );
};

export default FeeViewModal;
