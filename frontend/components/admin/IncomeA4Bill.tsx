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
    const base = process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:8000/storage/";
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
        const amount = Number(income.amount || 0);
        const billNo = `#INC-${String(income.id).padStart(4, "0")}`;
        const billDate = formatDate(income.income_date || income.created_at || new Date());
        const period = formatBsMonthYear(Number(income.year), Number(income.month));
        const category = typeof income.category === 'object' ? income.category?.name : (income.category || "Income");

        return (
            <>
                <style dangerouslySetInnerHTML={{
                    __html: `
          .income-a4-bill { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; line-height: 1.5; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
          @media print {
            body * { visibility: hidden !important; }
            .income-a4-container, .income-a4-container * { visibility: visible !important; }
            .income-a4-container {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; min-height: 297mm !important;
              padding: 15mm !important; display: block !important;
              background: white !important; box-shadow: none !important;
            }
            @page { size: auto; margin: 0; }
            .no-print { display: none !important; }
          }
          .bg-beige { background-color: #F5F1EE; }
          .text-beige-dark { color: #8B7E74; }
        `}} />

                <div ref={ref} className="income-a4-container income-a4-bill bg-white p-[15mm] max-w-[210mm] min-h-[297mm] mx-auto shadow-lg">

                    {/* Header */}
                    <div className="relative mb-12">
                        <div className="absolute left-0 top-0 w-32">
                            <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain" />
                        </div>
                        <div className="text-center pt-2">
                            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{companyName}</h1>
                            {settings?.about_short && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1 mb-2 text-beige-dark">
                                    {settings.about_short}
                                </p>
                            )}
                            {settings?.address && <p className="text-[13px] font-medium text-gray-700">{settings.address}</p>}
                            {settings?.phone && <p className="text-[13px] font-medium text-gray-700">Phone: {settings.phone}</p>}
                            {settings?.email && <p className="text-[13px] font-medium text-gray-700">Email: {settings.email}</p>}
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
                            {income.payer_name && (
                                <p><span className="font-bold">Received From:</span> {income.payer_name}</p>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full mb-6 border-collapse">
                        <thead>
                            <tr className="bg-beige">
                                <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50">Description</th>
                                <th className="px-5 py-3 text-right font-bold text-sm w-48">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="border-b border-gray-200">
                            <tr className="border-b border-gray-100">
                                <td className="px-5 py-5 text-sm border-r border-gray-100">
                                    <p className="font-bold text-gray-900 text-base">{category}</p>
                                    {income.remarks && (
                                        <p className="text-xs text-gray-500 mt-1 italic">{income.remarks}</p>
                                    )}
                                </td>
                                <td className="px-5 py-5 text-right text-sm font-semibold">{fmt(amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-[320px]">
                            <div className="flex justify-between py-4 px-5 bg-beige">
                                <span className="font-black text-lg">TOTAL RECEIVED:</span>
                                <span className="font-black text-lg">{fmt(amount)}</span>
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
                    <div className="mt-24 text-center">
                        <p className="text-2xl font-medium mb-4">Thank You!</p>
                        <div className="flex justify-center opacity-40 mb-8">
                            <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M60 55C60 55 50 40 40 40C30 40 25 45 25 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                                <path d="M60 55C60 55 70 40 80 40C90 40 95 45 95 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                                <path d="M60 55V30" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                                <circle cx="60" cy="25" r="5" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </div>
                        <div className="flex justify-center items-center gap-2 pt-6 border-t border-gray-100">
                            <div className="w-5 h-5 bg-gray-900 flex items-center justify-center p-1">
                                <img src={logoUrl} alt="" className="w-full h-full invert brightness-0" />
                            </div>
                            <p className="text-sm font-semibold tracking-tight">{companyName}</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }
);

IncomeA4Bill.displayName = "IncomeA4Bill";
