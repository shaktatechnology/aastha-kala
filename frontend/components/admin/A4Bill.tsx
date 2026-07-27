"use client";

import React, { forwardRef, useMemo } from "react";
import { formatDate, formatMonthYear } from "@/lib/utils";

interface A4BillProps {
  fee: any;
  settings: any;
}

export const A4Bill = forwardRef<HTMLDivElement, A4BillProps>(
  ({ fee, settings }, ref) => {
    if (!fee) return null;

    const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

    // Calculate breakdown totals dynamically
    // Calculate breakdown totals dynamically (using outstanding balances before today's payment)
    const showAdmission = Number(fee.admission_fee) > 0;
    const admissionBase = showAdmission ? Number(fee.admission_fee) : 0;
    const admissionDiscount = showAdmission ? Number(fee.admission_discount || 0) : 0;
    const admissionNet = showAdmission 
      ? (fee.admission_discount_type === 'percentage' 
          ? Math.max(0, admissionBase - (admissionBase * admissionDiscount / 100)) 
          : Math.max(0, admissionBase - admissionDiscount))
      : 0;
    const admissionPaid = showAdmission ? Number(fee.admission_paid_amount || 0) : 0;
    const admissionPaidToday = showAdmission ? Number(fee.admission_last_payment || 0) : 0;
    const admissionPriorPaid = Math.max(0, admissionPaid - admissionPaidToday);
    const admissionOutstanding = showAdmission ? Math.max(0, admissionNet - admissionPriorPaid) : 0;
    const renderAdmission = showAdmission && (admissionOutstanding > 0.01 || admissionPaidToday > 0.01);

    const activePrograms = fee.programs_breakdown
      ? fee.programs_breakdown.filter((pb: any) => {
          const base = Number(pb.program_fee || 0);
          const disc = Number(pb.discount || 0);
          const net = pb.discount_type === 'percentage'
            ? Math.max(0, base - (base * disc / 100))
            : Math.max(0, base - disc);
          const paid = Number(pb.paid_amount || 0);
          const lastPayment = Number(pb.last_payment_amount || 0);
          const priorPaid = Math.max(0, paid - lastPayment);
          const outstandingBeforeToday = Math.max(0, net - priorPaid);
          
          return (outstandingBeforeToday > 0.01 || lastPayment > 0.01);
        })
      : [];

    let totalBaseSum = 0;
    let totalDiscountSum = 0;
    let programOutstandingTotal = 0;
    let programPaidToday = 0;

    if (renderAdmission) {
      const isSecondSession = admissionPriorPaid > 0.01;
      totalBaseSum += isSecondSession ? admissionOutstanding : admissionBase;
      totalDiscountSum += isSecondSession ? 0 : (admissionBase - admissionNet);
    }

    activePrograms.forEach((pb: any) => {
      const base = Number(pb.program_fee || 0);
      const disc = Number(pb.discount || 0);
      const net = pb.discount_type === 'percentage'
        ? Math.max(0, base - (base * disc / 100))
        : Math.max(0, base - disc);
      const paid = Number(pb.paid_amount || 0);
      const lastPayment = Number(pb.last_payment_amount || 0);
      const priorPaid = Math.max(0, paid - lastPayment);
      const outstandingBeforeToday = Math.max(0, net - priorPaid);

      const isSecondSession = priorPaid > 0.01;
      const itemAmt = isSecondSession ? outstandingBeforeToday : (base > 0 ? base : net);
      const itemDisc = isSecondSession ? 0 : (base - net);

      totalBaseSum += itemAmt;
      totalDiscountSum += itemDisc;
      programOutstandingTotal += outstandingBeforeToday;
      programPaidToday += lastPayment;
    });

    const paidToday = admissionPaidToday + programPaidToday;
    const balanceDue = Math.max(0, (totalBaseSum - totalDiscountSum) - paidToday);

    // Derived data
    const billDate = formatDate(fee.created_at || new Date());

    const allMonths = Array.from(
      new Set(
        [
          fee.month_year,
          ...(fee.programs_breakdown
            ? fee.programs_breakdown.map((pb: any) => pb.due_month).filter(Boolean)
            : []),
        ].filter(Boolean)
      )
    ).sort();

    const lastMonth = allMonths.length > 0 ? allMonths[allMonths.length - 1] : fee.month_year;
    const period = lastMonth ? formatMonthYear(lastMonth) : "N/A";

    const allPeriodsRemark = allMonths.length > 1
      ? `Periods paid: ${allMonths.map((m: any) => formatMonthYear(m)).join(", ")}`
      : "";

    const remarksParts = [];
    if (fee.remarks) remarksParts.push(fee.remarks);
    if (allPeriodsRemark) remarksParts.push(allPeriodsRemark);
    const finalRemarks = remarksParts.join(" | ");

    const studentName = fee.student?.name || "N/A";
    const billNo = `#FEE-${fee.id?.toString().padStart(2, "0")}`;

    const getLogoUrl = (logoPath: string | null | undefined) => {
      if (!logoPath) return "/images/logo.png";
      if (logoPath.startsWith("http")) return logoPath;
      const base =
        process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:8000/storage/";
      const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
      const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
      return `${cleanBase}/${cleanPath}`;
    };

    const logoUrl = getLogoUrl(settings?.logo);

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
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
          .no-print { display: none !important; }
        }

        .bg-beige { background-color: #F5F1EE; }
        .text-beige-dark { color: #8B7E74; }
      `,
          }}
        />

        <div
          ref={ref}
          className="a4-bill-container a4-bill-print bg-white p-[15mm] max-w-[210mm] min-h-[297mm] mx-auto shadow-lg"
        >
          {/* Header - Logo and Center Text */}
          <div className="relative mb-12">
            {/* Logo */}
            <div className="absolute left-0 top-0 w-32">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Center Info */}
            <div className="text-center pt-2">
              <h1 className="text-3xl font-extrabold tracking-tight mb-1">
                {settings?.company_name}
              </h1>
              {settings?.about_short && (
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1 mb-2 text-beige-dark">
                  {settings.about_short}
                </p>
              )}
              {settings?.address && (
                <p className="text-[13px] font-medium text-gray-700">
                  {settings.address}
                </p>
              )}
              {settings?.phone && (
                <p className="text-[13px] font-medium text-gray-700">
                  Phone: {settings.phone}
                </p>
              )}
              {settings?.email && (
                <p className="text-[13px] font-medium text-gray-700">
                  Email: {settings.email}
                </p>
              )}
            </div>
          </div>

          {/* Bill Title and Details */}
          <div className="flex justify-end mb-8">
            <div className="text-right">
              <h2 className="text-3xl font-black mb-4 tracking-wider">BILL</h2>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-bold">Bill No.:</span> {billNo}
                </p>
                <p>
                  <span className="font-bold">Date:</span> {billDate}
                </p>
                <p>
                  <span className="font-bold">Student:</span> {studentName}
                </p>
                {fee.student?.roll_no && (
                  <p>
                    <span className="font-bold">Roll No:</span>{" "}
                    {fee.student.roll_no}
                  </p>
                )}
                <p>
                  <span className="font-bold">Period:</span> {period}
                </p>
                {fee.shift && (
                  <p>
                    <span className="font-bold">Shift:</span> {fee.shift}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-beige">
                <th className="px-5 py-3 text-left font-bold text-sm border-r border-white/50">
                  Description
                </th>
                <th className="px-5 py-3 text-right font-bold text-sm w-40">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="border-b border-gray-200">
              {/* Admission Fee if exists */}
              {renderAdmission && (
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-4 text-sm border-r border-gray-100">
                    Admission Fee
                  </td>
                  <td className="px-5 py-4 text-right text-sm">
                    {fmt(admissionPriorPaid > 0.01 ? admissionOutstanding : (admissionBase > 0 ? admissionBase : admissionOutstanding))}
                  </td>
                </tr>
              )}

              {/* Programs Breakdown */}
              {activePrograms && activePrograms.length > 0 ? (
                activePrograms.map((pb: any, idx: number) => {
                  const base = Number(pb.program_fee || 0);
                  const disc = Number(pb.discount || 0);
                  const net = pb.discount_type === 'percentage'
                    ? Math.max(0, base - (base * disc / 100))
                    : Math.max(0, base - disc);
                  const paid = Number(pb.paid_amount || 0);
                  const lastPayment = Number(pb.last_payment_amount || 0);
                  const priorPaid = Math.max(0, paid - lastPayment);
                  const outstandingBeforeToday = Math.max(0, net - priorPaid);

                  const isSecondSession = priorPaid > 0.01;
                  const itemAmt = isSecondSession ? outstandingBeforeToday : (base > 0 ? base : net);
                  const periodSuffix = pb.due_month ? ` (${formatMonthYear(pb.due_month)})` : "";

                  return (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-sm border-r border-gray-100">
                        {pb.title}{periodSuffix}
                      </td>
                      <td className="px-5 py-4 text-right text-sm">
                        {fmt(itemAmt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Fallback if no breakdown */
                <tr className="border-b border-gray-100 last:border-0 min-h-[40px]">
                  <td className="px-5 py-4 text-sm border-r border-gray-100 uppercase">
                    {fee.fee_type === "billing"
                      ? "Tuition Fees"
                      : fee.fee_type + " Fee"}
                  </td>
                  <td className="px-5 py-4 text-right text-sm">
                    {fmt(totalBaseSum - totalDiscountSum)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-full max-w-[320px]">
              <div className="flex justify-between py-2 px-5">
                <span className="font-bold text-sm">Subtotal:</span>
                <span className="text-sm">{fmt(totalBaseSum)}</span>
              </div>

              {totalDiscountSum > 0.01 && (
                <div className="flex justify-between py-2 px-5 text-amber-700">
                  <span className="font-bold text-sm">Discount:</span>
                  <span className="text-sm">- {fmt(totalDiscountSum)}</span>
                </div>
              )}

              {paidToday > 0 && (
                <div className="flex justify-between py-2 px-5 border-t border-gray-100 mt-2">
                  <span className="font-bold text-sm text-green-600 font-bold">Paid Today:</span>
                  <span className="font-bold text-sm text-green-600">
                    {fmt(paidToday)}
                  </span>
                </div>
              )}

              {Number(fee.return_amount) > 0 && (
                <div className="flex justify-between py-3 px-5 border-t border-gray-100">
                  <span className="font-bold text-sm text-amber-700">
                    Return Amount:
                  </span>
                  <span className="font-bold text-sm text-amber-700">
                    {fmt(Number(fee.return_amount))}
                  </span>
                </div>
              )}

              {balanceDue > 0.01 ? (
                <div className="flex justify-between py-4 px-5 bg-beige mt-2">
                  <span className="font-black text-lg uppercase tracking-tight">
                    BALANCE DUE:
                  </span>
                  <span className="font-black text-lg">{fmt(balanceDue)}</span>
                </div>
              ) : (
                <div className="flex justify-between py-4 px-5 bg-emerald-50 mt-2 border border-emerald-100">
                  <span className="font-black text-lg text-emerald-800 uppercase tracking-tight">
                    FULLY PAID
                  </span>
                  <span className="font-black text-lg text-emerald-800">{fmt(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Remarks Section */}
          {finalRemarks && (
            <div className="mt-8 px-5 py-4 bg-beige rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-widest text-beige-dark mb-1">
                Remarks
              </p>
              <p className="text-sm font-medium text-gray-700 italic">
                {finalRemarks}
              </p>
            </div>
          )}

          {/* Footer Text */}
          <div className="mt-24 text-center">
            <p className="text-2xl font-medium mb-4">Thank You!</p>

            {/* Flower Illustration SVG */}
            <div className="flex justify-center opacity-40 mb-8">
              <svg
                width="120"
                height="60"
                viewBox="0 0 120 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M60 55C60 55 50 40 40 40C30 40 25 45 25 50"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M60 55C60 55 70 40 80 40C90 40 95 45 95 50"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M60 55V30"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <circle
                  cx="60"
                  cy="25"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M60 20C60 15 65 10 70 10C75 10 80 15 80 20C80 25 75 30 70 30"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M60 20C60 15 55 10 50 10C45 10 40 15 40 20C40 25 45 30 50 30"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M60 25C65 25 70 20 70 15"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M60 25C55 25 50 20 50 15"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </div>

            <div className="flex justify-center items-center gap-2 pt-6 border-t border-gray-100">
              <div className="w-5 h-5 bg-gray-900 flex items-center justify-center p-1">
                <img
                  src={logoUrl}
                  alt=""
                  className="w-full h-full invert brightness-0"
                />
              </div>
              <p className="text-sm font-semibold tracking-tight">
                {settings?.company_name}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  },
);

A4Bill.displayName = "A4Bill";
