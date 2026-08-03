"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Banknote, Calendar, Tag, CreditCard, FileText, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReactToPrint } from "react-to-print";
import { ExpenseThermalBill } from "@/components/admin/ExpenseThermalBill";

interface Expense {
  id?: number;
  title: string;
  amount: string;
  expense_date: string;
  category?: string;
  payment_method?: string;
  remarks?: string;
  receipt_image?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  'rent_utilities': 'Rent & Utilities',
  'salaries': 'Salaries & Wages',
  'maintenance': 'Studio Maintenance',
  'costumes': 'Costumes & Apparel',
  'equipment': 'Props & Equipment',
  'marketing': 'Marketing & Ads',
  'events': 'Events & Workshops',
  'other': 'Miscellaneous'
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

const ExpenseViewModal: React.FC<Props> = ({ isOpen, onClose, expense }) => {
  const [settings, setSettings] = useState<any>(null);
  const printRefThermal = useRef<HTMLDivElement>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setSettings(data.data.setting);
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSettings();
  }, [isOpen, fetchSettings]);

  const handleThermalPrint = useReactToPrint({
    contentRef: printRefThermal,
    documentTitle: `Expense_Voucher_${expense?.id || "print"}`,
    pageStyle: "@page { size: 80mm auto; margin: 0; }",
  });

  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-3xl mx-auto my-8"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{expense.title}</h2>
            <p className="text-sm text-gray-500 mt-1">Viewing expense details</p>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-blue-50 border border-blue-100">
                <div className="size-12 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                  <Banknote className="size-6" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest block mb-1">Total Amount</span>
                  <span className="text-2xl font-black text-blue-700">Rs. {parseFloat(expense.amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="size-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Date Paid</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{expense.expense_date}</span>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="size-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Category</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {CATEGORY_MAP[expense.category || ""] || expense.category || "N/A"}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="size-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Payment Method</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{expense.payment_method || "N/A"}</span>
                </div>
              </div>

              {expense.remarks && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="size-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Remarks / Notes</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed italic">{expense.remarks}</p>
                </div>
              )}
            </div>

            {/* Receipt Image */}
            <div className="space-y-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Attached Receipt</span>
              {expense.receipt_image ? (
                <div className="group relative rounded-2xl overflow-hidden border border-gray-200 aspect-[3/4] bg-gray-100">
                  <img src={expense.receipt_image} alt="Receipt" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a 
                      href={expense.receipt_image} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="size-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Download className="size-6 text-primary" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-[3/4] flex flex-col items-center justify-center text-gray-300">
                  <Banknote className="size-12 mb-2 opacity-50" />
                  <span className="text-xs font-bold uppercase">No Receipt Found</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <Button
            type="button"
            onClick={() => handleThermalPrint()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-11 text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Thermal Print
          </Button>

          <Button
            onClick={onClose}
            className="bg-gray-800 text-white px-8 h-11 text-base font-medium shadow-sm cursor-pointer"
          >
            Close View
          </Button>
        </div>

        {/* Hidden Thermal Print Container */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={printRefThermal} className="expense-thermal-wrapper">
            <ExpenseThermalBill expense={expense} settings={settings} />
            <ExpenseThermalBill expense={expense} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseViewModal;
