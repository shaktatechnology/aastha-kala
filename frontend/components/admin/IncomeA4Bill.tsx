"use client";

import React, { forwardRef } from "react";
import { formatDate, formatBsMonthYear, nepaliMonthNames } from "@/lib/utils";

interface IncomeA4BillProps {
    income: any;
    settings: any;
}

const getLogoUrl = (logoPath: string | null | undefined) => {
    if (!logoPath) return "/images/logo.png";
    if (logoPath.startsWith("http")) return logoPath;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/storage/";
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
    return `${cleanBase}/${cleanPath}`;
};

export const IncomeA4Bill = forwardRef<HTMLDivElement, IncomeA4BillProps>(
    ({ income, settings }, ref) => {
        if (!income) return null;

        const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
        const companyName = settings?.company_name || "Aastha Kala Kendra";
        const logoUrl = getLogoUrl(settings?.logo);
        
        const items = income.items || [];
        const discount = Number(income.discount || 0);
        const returnAmount = Number(income.return_amount || 0);
        const netAmount = Number(income.amount || 0);
        const receivedAmount = Number(income.received_amount ?? netAmount) || netAmount;
        const subtotal = items.length > 0 
            ? items.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0) 
            : netAmount;

        const billNo = income.bill_number || `#INC-${String(income.id).padStart(4, "0")}`;
        const billDate = formatDate(income.income_date || income.created_at || new Date());
        const period = formatBsMonthYear(Number(income.year), Number(income.month));

        return (
            <>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          .income-a4-bill {
            font-family: 'Inter', sans-serif;
            color: #000 !important;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          .income-a4-bill * {
            color: #000 !important;
          }
          @media print {
            body * { visibility: hidden !important; }
            .income-a4-container, .income-a4-container * { visibility: visible !important; }
            .income-a4-container {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; min-height: 297mm !important;
              padding: 15mm !important; display: block !important;
              background: white !important; box-shadow: none !important;
            }
            .no-print { display: none !important; }
          }
          .bg-beige { background-color: #F5F1EE; }
          .text-beige-dark { color: #000; }
        `}} />

                <div ref={ref} className="income-a4-container income-a4-bill bg-white p-[15mm] max-w-[210mm] min-h-[297mm] mx-auto shadow-lg">

                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="pt-2">
                            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{companyName}</h1>
                            {settings?.about_short && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1 mb-2">
                                    {settings.about_short}
                                </p>
                            )}
                            {settings?.address && <p className="text-[13px] font-medium">{settings.address}</p>}
                            {settings?.phone && <p className="text-[13px] font-medium">Phone: {settings.phone}</p>}
                            {settings?.email && <p className="text-[13px] font-medium">Email: {settings.email}</p>}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-gray-900 mb-2" />
                    <div className="border-t border-gray-300 mb-8" />

                    {/* Bill title + details */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-wider text-gray-900 mb-1">INCOME RECEIPT</h2>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Official Income Record</p>
                        </div>
                        <div className="text-right space-y-1 text-sm">
                            <p><span className="font-bold">Receipt No.:</span> {billNo}</p>
                            <p><span className="font-bold">Date:</span> {billDate}</p>
                            <p><span className="font-bold">Period:</span> {period}</p>
                            {income.payment_method && (
                                <p><span className="font-bold">Method:</span> {income.payment_method}</p>
                            )}
                            {income.instructor?.name && (
                                <p><span className="font-bold">Instructor:</span> {income.instructor.name}</p>
                            )}
                            {income.payer_name && (
                                <p><span className="font-bold">Received From:</span> {income.payer_name}</p>
                            )}
                            {income.payer_phone && (
                                <p><span className="font-bold">Phone:</span> {income.payer_phone}</p>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full mb-6 border-collapse">
                        <thead>
                            <tr className="bg-beige">
                                <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50 w-14">S.N.</th>
                                <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50">Billing Topic / Item</th>
                                <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50">Description</th>
                                <th className="px-5 py-3 text-right font-bold text-sm w-48">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="border-b border-gray-200">
                            {items.length > 0 ? (
                                items.map((it: any, index: number) => (
                                    <tr key={index} className="border-b border-gray-100">
                                        <td className="px-5 py-4 text-sm border-r border-gray-100 text-gray-500 font-semibold">{index + 1}</td>
                                        <td className="px-5 py-4 text-sm border-r border-gray-100 font-bold text-gray-900">
                                            {it.category?.name || it.topic_name || "Income"}
                                        </td>
                                        <td className="px-5 py-4 text-sm border-r border-gray-100 text-gray-500 italic">
                                            {it.remarks || "—"}
                                        </td>
                                        <td className="px-5 py-4 text-right text-sm font-semibold">{fmt(Number(it.amount))}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="border-b border-gray-100">
                                    <td className="px-5 py-5 text-sm border-r border-gray-100" colSpan={3}>
                                        <p className="font-bold text-gray-900 text-base">
                                            {typeof income.category === 'object' ? income.category?.name : (income.category || "Income")}
                                        </p>
                                        {income.remarks && (
                                            <p className="text-xs text-gray-500 mt-1 italic">{income.remarks}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5 text-right text-sm font-semibold">{fmt(netAmount)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-[320px] space-y-1.5 text-sm font-semibold text-gray-700">
                            <div className="flex justify-between px-5">
                                <span>Subtotal:</span>
                                <span>{fmt(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between px-5 text-amber-700 font-bold">
                                    <span>Discount:</span>
                                    <span>-{fmt(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between px-5 font-bold text-gray-900 border-t border-gray-100 pt-1.5 mt-1.5">
                                <span>Net Total:</span>
                                <span>{fmt(netAmount)}</span>
                            </div>
                            <div className="flex justify-between px-5 text-gray-900">
                                <span>Cash Paid:</span>
                                <span>{fmt(receivedAmount)}</span>
                            </div>
                            {receivedAmount < netAmount && (
                                <div className="flex justify-between px-5 text-red-600 font-bold animate-pulse">
                                    <span>Due Amount:</span>
                                    <span>{fmt(netAmount - receivedAmount)}</span>
                                </div>
                            )}
                            {returnAmount > 0 && (
                                <div className="flex justify-between px-5 text-gray-500 font-medium">
                                    <span>Change Returned:</span>
                                    <span>{fmt(returnAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-4 px-5 bg-beige font-black text-lg text-gray-900 border-t border-gray-200 mt-2">
                                <span>TOTAL RECEIVED:</span>
                                <span>{fmt(receivedAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Remarks box */}
                    {income.remarks && (
                        <div className="mt-8 p-4 border border-gray-200 rounded bg-gray-50">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{income.remarks}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-2xl font-medium mb-4">Thank You!</p>
                    </div>
                </div>
            </>
        );
    }
);

IncomeA4Bill.displayName = "IncomeA4Bill";
