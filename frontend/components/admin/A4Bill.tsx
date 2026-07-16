"use client";

import React, { forwardRef, useMemo } from "react";
import { formatDate, formatMonthYear } from "@/lib/utils";

interface A4BillProps {
  fee: any;
  settings: any;
}

export const A4Bill = forwardRef<HTMLDivElement, A4BillProps>(({ fee, settings }, ref) => {
  if (!fee) return null;

  const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
  
  // Calculate breakdown totals
  const totalGross = Number(fee.gross_amount || 0);
  const totalDiscount = Number(fee.discount_amount || 0);
  const netBill = Number(fee.net_amount || fee.total_amount || 0);
  const paidAmount = Number(fee.paid_amount || 0);
  const balanceDue = Math.max(0, netBill - paidAmount);
  
  // Derived data
  const billDate = formatDate(fee.created_at || new Date());

  const studentName = fee.student?.name || "N/A";
  const period = fee.month_year ? formatMonthYear(fee.month_year) : "N/A";
  const billNo = `#FEE-${fee.id?.toString().padStart(2, "0")}`;

  const getLogoUrl = (logoPath: string | null | undefined) => {
    if (!logoPath) return "/images/logo.png";
    if (logoPath.startsWith("http")) return logoPath;
    const base = process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:8000/storage/";
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
    return `${cleanBase}/${cleanPath}`;
  };

  const logoUrl = getLogoUrl(settings?.logo);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .a4-bill-print {
          font-family: 'Inter', sans-serif;
          color: #1a1a1a;
          line-height: 1.5;
        }

        @media print {
          body * { visibility: hidden !important; }
          .a4-bill-container, .a4-bill-container *, .thermal-print-container, .thermal-print-container * { 
            visibility: visible !important; 
          }
          .a4-bill-container, .thermal-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
          }
          .a4-bill-container {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 15mm !important;
            display: block !important;
            background: white !important;
            box-shadow: none !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
          .no-print { display: none !important; }
        }

        .bg-beige { background-color: #F5F1EE; }
        .text-beige-dark { color: #8B7E74; }
      `}} />
      
      <div ref={ref} className="a4-bill-container a4-bill-print bg-white p-[15mm] max-w-[210mm] min-h-[297mm] mx-auto shadow-lg">
        
        {/* Header - Logo and Center Text */}
        <div className="relative mb-12">
          {/* Logo */}
          <div className="absolute left-0 top-0 w-32">
            <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain" />
          </div>
          
          {/* Center Info */}
          <div className="text-center pt-2">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{settings?.company_name}</h1>
            {settings?.about_short && <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1 mb-2 text-beige-dark">{settings.about_short}</p>}
            {settings?.address && <p className="text-[13px] font-medium text-gray-700">{settings.address}</p>}
            {settings?.phone && <p className="text-[13px] font-medium text-gray-700">Phone: {settings.phone}</p>}
            {settings?.email && <p className="text-[13px] font-medium text-gray-700">Email: {settings.email}</p>}
          </div>
        </div>

        {/* Bill Title and Details */}
        <div className="flex justify-end mb-8">
          <div className="text-right">
            <h2 className="text-3xl font-black mb-4 tracking-wider">BILL</h2>
            <div className="space-y-1 text-sm">
              <p><span className="font-bold">Bill No.:</span> {billNo}</p>
              <p><span className="font-bold">Date:</span> {billDate}</p>
              <p><span className="font-bold">Student:</span> {studentName}</p>
              {fee.student?.roll_no && <p><span className="font-bold">Roll No:</span> {fee.student.roll_no}</p>}
              <p><span className="font-bold">Period:</span> {period}</p>
              {fee.shift && <p><span className="font-bold">Shift:</span> {fee.shift}</p>}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="bg-beige">
              <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50">Description</th>
              <th className="px-5 py-3 text-right font-bold text-sm w-40">Amount</th>
            </tr>
          </thead>
          <tbody className="border-b border-gray-200">
            {/* Admission Fee if exists */}
            {Number(fee.admission_fee) > 0 && (
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-sm border-r border-gray-100">Admission Fee</td>
                <td className="px-5 py-4 text-right text-sm">{fmt(fee.admission_fee)}</td>
              </tr>
            )}
            
            {/* Programs Breakdown */}
            {fee.programs_breakdown && fee.programs_breakdown.length > 0 ? (
              fee.programs_breakdown.map((pb: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-4 text-sm border-r border-gray-100">
                    {pb.title}
                    {pb.due_month && (
                      <span className="text-xs text-gray-500 font-bold ml-1.5 uppercase tracking-wide">
                        (Due: {formatMonthYear(pb.due_month)})
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-sm">{fmt(pb.program_fee)}</td>
                </tr>
              ))
            ) : (
              /* Fallback if no breakdown */
              <tr className="border-b border-gray-100 last:border-0 min-h-[40px]">
                <td className="px-5 py-4 text-sm border-r border-gray-100 uppercase">
                  {fee.fee_type === 'billing' ? 'Tuition Fees' : fee.fee_type + ' Fee'}
                </td>
                <td className="px-5 py-4 text-right text-sm">{fmt(totalGross)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-full max-w-[320px]">
            <div className="flex justify-between py-2 px-5">
              <span className="font-bold text-sm">Subtotal:</span>
              <span className="text-sm">{fmt(totalGross)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between py-2 px-5 text-gray-500 italic">
                <span className="text-sm">Discount:</span>
                <span className="text-sm">({fmt(totalDiscount)})</span>
              </div>
            )}
            {/* Image shows Tax (5%) - if system doesn't have it, we can calculate if needed, 
                but usually it's already in net. Let's show it only if net doesn't equal subtotal.
                In the provided image, subtotal is 10500, tax is 525, total is 11025.
                If netBill (11025) > subtotal (10500), then tax exists.
            */}
            {netBill > (totalGross - totalDiscount) && (
              <div className="flex justify-between py-2 px-5">
                <span className="font-bold text-sm">Tax (5%):</span>
                <span className="text-sm">{fmt(netBill - (totalGross - totalDiscount))}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 px-5 border-t border-gray-200 mt-2">
              <span className="font-bold text-sm">Total Amount (Gross):</span>
              <span className="text-sm">{fmt(totalGross)}</span>
            </div>
            
            <div className="flex justify-between py-3 px-5 bg-beige mt-2">
              <span className="font-black text-lg">Net Bill:</span>
              <span className="font-black text-lg">{fmt(netBill)}</span>
            </div>
            
            <div className="flex justify-between py-3 px-5">
              <span className="font-bold text-sm">Amount Paid:</span>
              <span className={`font-bold text-sm ${paidAmount === 0 ? "text-red-600" : ""}`}>{fmt(paidAmount)}</span>
            </div>
            
            {Number(fee.return_amount) > 0 && (
              <div className="flex justify-between py-3 px-5 border-t border-gray-100">
                <span className="font-bold text-sm text-amber-700">Return Amount:</span>
                <span className="font-bold text-sm text-amber-700">{fmt(Number(fee.return_amount))}</span>
              </div>
            )}
            
            {balanceDue > 0.01 && (
              <div className="flex justify-between py-4 px-5 bg-beige">
                <span className="font-black text-lg uppercase tracking-tight">BALANCE DUE:</span>
                <span className="font-black text-lg">{fmt(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Remarks Section */}
        {fee.remarks && (
          <div className="mt-8 px-5 py-4 bg-beige rounded-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-beige-dark mb-1">Remarks</p>
            <p className="text-sm font-medium text-gray-700 italic">{fee.remarks}</p>
          </div>
        )}

        {/* Footer Text */}
        <div className="mt-24 text-center">
          <p className="text-2xl font-medium mb-4">Thank You!</p>
          
          {/* Flower Illustration SVG */}
          <div className="flex justify-center opacity-40 mb-8">
            <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 55C60 55 50 40 40 40C30 40 25 45 25 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M60 55C60 55 70 40 80 40C90 40 95 45 95 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M60 55V30" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="60" cy="25" r="5" stroke="currentColor" strokeWidth="1"/>
              <path d="M60 20C60 15 65 10 70 10C75 10 80 15 80 20C80 25 75 30 70 30" stroke="currentColor" strokeWidth="1"/>
              <path d="M60 20C60 15 55 10 50 10C45 10 40 15 40 20C40 25 45 30 50 30" stroke="currentColor" strokeWidth="1"/>
              <path d="M60 25C65 25 70 20 70 15" stroke="currentColor" strokeWidth="1"/>
              <path d="M60 25C55 25 50 20 50 15" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>

          <div className="flex justify-center items-center gap-2 pt-6 border-t border-gray-100">
            <div className="w-5 h-5 bg-gray-900 flex items-center justify-center p-1">
               <img src={logoUrl} alt="" className="w-full h-full invert brightness-0" />
            </div>
            <p className="text-sm font-semibold tracking-tight">
              {settings?.company_name}
            </p>
          </div>
        </div>
      </div>
    </>
  );
});

A4Bill.displayName = "A4Bill";

