"use client";

import React, { forwardRef } from "react";
import { formatDate, formatMonthYear } from "@/lib/utils";

interface ThermalBillProps {
  fee: any;
  settings: any;
}

export const ThermalBill = forwardRef<HTMLDivElement, ThermalBillProps>(
  ({ fee, settings }, ref) => {
    if (!fee) return null;

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

    const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

    // Calculate breakdown totals dynamically
    // Calculate breakdown totals dynamically (using outstanding balances before today's payment)
    const showAdmission = Number(fee.admission_fee) > 0;
    const admissionBase = showAdmission ? Number(fee.admission_fee) : 0;
    const admissionDiscount = showAdmission
      ? Number(fee.admission_discount || 0)
      : 0;
    const admissionNet = showAdmission
      ? fee.admission_discount_type === "percentage"
        ? Math.max(0, admissionBase - (admissionBase * admissionDiscount) / 100)
        : Math.max(0, admissionBase - admissionDiscount)
      : 0;
    const admissionPaid = showAdmission
      ? Number(fee.admission_paid_amount || 0)
      : 0;
    const admissionPaidToday = showAdmission
      ? Number(fee.admission_last_payment || 0)
      : 0;
    const admissionOutstanding = showAdmission
      ? Math.max(0, admissionNet - (admissionPaid - admissionPaidToday))
      : 0;
    const renderAdmission = showAdmission && admissionOutstanding > 0.01;

    const activePrograms = fee.programs_breakdown
      ? fee.programs_breakdown.filter((pb: any) => {
          const base = Number(pb.program_fee || 0);
          const disc = Number(pb.discount || 0);
          const net =
            pb.discount_type === "percentage"
              ? Math.max(0, base - (base * disc) / 100)
              : Math.max(0, base - disc);
          const paid = Number(pb.paid_amount || 0);
          const lastPayment = Number(pb.last_payment_amount || 0);
          const outstandingBeforeToday = net - (paid - lastPayment);

          return outstandingBeforeToday > 0.01;
        })
      : [];

    let programOutstandingTotal = 0;
    let programPaidToday = 0;

    activePrograms.forEach((pb: any) => {
      const base = Number(pb.program_fee || 0);
      const disc = Number(pb.discount || 0);
      const net =
        pb.discount_type === "percentage"
          ? Math.max(0, base - (base * disc) / 100)
          : Math.max(0, base - disc);
      const paid = Number(pb.paid_amount || 0);
      const lastPayment = Number(pb.last_payment_amount || 0);
      const outstandingBeforeToday = Math.max(0, net - (paid - lastPayment));

      programOutstandingTotal += outstandingBeforeToday;
      programPaidToday += lastPayment;
    });

    const totalGross = admissionOutstanding + programOutstandingTotal; // Outstanding sum before today
    const totalDiscount = 0;
    const netBill = totalGross;
    const paidToday = admissionPaidToday + programPaidToday;
    const balanceDue = Math.max(0, netBill - paidToday);

    const billDate = formatDate(fee.created_at || new Date());

    const dueRemarks = activePrograms
      ? activePrograms
          .filter((pb: any) => pb.due_month)
          .map((pb: any) => `${pb.title} — ${formatMonthYear(pb.due_month)}`)
      : [];

    const remarksParts = [];
    if (fee.remarks) remarksParts.push(fee.remarks);
    if (dueRemarks.length > 0) {
      remarksParts.push(...dueRemarks);
    }
    const finalRemarks = remarksParts.join(" | ");

    const billNo = `#FEE-${fee.id}`;

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
  @media print {
    body * {
      visibility: hidden !important;
    }

    .print-wrapper,
    .print-wrapper * {
      visibility: visible !important;
    }

    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
    }

    .print-wrapper {
      display: block;
      width: 80mm;
      box-sizing: border-box;
      padding: 0;
    }

    .thermal-print-container {
      width: 72mm !important;
      margin: 0 auto !important;
      padding: 4mm !important;
      background: white !important;
      color: black !important;
      position: relative !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-before: avoid !important;
    }

    .thermal-print-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .thermal-bill-text {
      font-family: "Courier New", "DejaVu Sans Mono", monospace;
    }
  }
`,
          }}
        />
        <div
          ref={ref}
          className="thermal-print-container thermal-bill-text bg-white text-black w-[72mm] mx-auto"
          style={{
            width: "80mm",
            padding: "4mm",
            fontSize: "14px",
            lineHeight: "1.4",
            backgroundColor: "#fff",
            color: "#000",
          }}
        >
          {/* ─── Header: Company Info ─── */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 800,
                margin: "0 0 2px 0",
                letterSpacing: "0.5px",
                color: "#000",
              }}
            >
              {settings?.company_name}
            </h1>
            {settings?.address && (
              <p
                style={{
                  fontSize: "12px",
                  margin: "1px 0",
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                {settings.address}
              </p>
            )}
            {settings?.phone && (
              <p
                style={{
                  fontSize: "12px",
                  margin: "1px 0",
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                Phone: {settings.phone}
              </p>
            )}
            {settings?.email && (
              <p
                style={{
                  fontSize: "12px",
                  margin: "1px 0",
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                Email: {settings.email}
              </p>
            )}
          </div>

          {/* ─── Logo + Bill Details Row ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              marginBottom: "8px",
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
              padding: "6px 0",
            }}
          >
            {/* Logo */}
            <div style={{ width: "50px", flexShrink: 0 }}>
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            {/* Bill Details */}
            <div
              style={{
                flex: 1,
                textAlign: "right",
                fontSize: "13px",
                color: "#000",
              }}
            >
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  margin: "0 0 4px 0",
                }}
              >
                BILL
              </p>
              <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                <strong>Bill No.:</strong> {billNo}
              </p>
              <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                <strong>Date:</strong> {billDate}
              </p>
              <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                <strong>Student:</strong> {fee.student?.name || "N/A"}
              </p>
              {fee.student?.roll_no && (
                <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                  <strong>Roll No:</strong> {fee.student.roll_no}
                </p>
              )}
              <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                <strong>Period:</strong>{" "}
                {fee.month_year ? formatMonthYear(fee.month_year) : "N/A"}
              </p>
              {fee.shift && (
                <p style={{ margin: "1px 0", color: "#000", fontWeight: 600 }}>
                  <strong>Shift:</strong> {fee.shift}
                </p>
              )}
            </div>
          </div>

          {/* ─── Items Table ─── */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "6px",
              fontSize: "13px",
              color: "#000",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#fff" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "4px 6px",
                    fontWeight: 700,
                    borderBottom: "1px solid #000",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    width: "100px",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    padding: "4px 6px",
                    fontWeight: 700,
                    borderBottom: "1px solid #000",
                  }}
                >
                  Amount Rs.
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Admission Fee */}
              {renderAdmission && (
                <tr>
                  <td
                    style={{
                      padding: "4px 6px",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    Admission Fee
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "right",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(admissionOutstanding)}
                  </td>
                </tr>
              )}

              {/* Program breakdown */}
              {activePrograms && activePrograms.length > 0 ? (
                activePrograms.map((pb: any, idx: number) => {
                  const base = Number(pb.program_fee || 0);
                  const disc = Number(pb.discount || 0);
                  const net =
                    pb.discount_type === "percentage"
                      ? Math.max(0, base - (base * disc) / 100)
                      : Math.max(0, base - disc);
                  const paid = Number(pb.paid_amount || 0);
                  const lastPayment = Number(pb.last_payment_amount || 0);
                  const outstandingBeforeToday = Math.max(
                    0,
                    net - (paid - lastPayment),
                  );

                  return (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: "4px 6px",
                          color: "#000",
                          fontWeight: 600,
                        }}
                      >
                        {pb.title}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "right",
                          color: "#000",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(outstandingBeforeToday)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    style={{
                      padding: "4px 6px",
                      textTransform: "capitalize",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    {fee.fee_type === "billing"
                      ? "Tuition Fees"
                      : fee.fee_type || "Fee"}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "right",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(totalGross)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ─── Totals ─── */}
          <div style={{ fontSize: "13px", color: "#000", marginTop: "4px" }}>
            {/* Amount Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 6px",
                borderTop: "1px solid #000",
                fontWeight: 600,
              }}
            >
              <span>Amount Total:</span>
              <span>{fmt(totalGross)}</span>
            </div>

            {/* Amount Paid */}
            {paidToday > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  marginTop: "2px",
                  fontWeight: 600,
                  color: "green",
                }}
              >
                <span>Amount Paid:</span>
                <span>{fmt(paidToday)}</span>
              </div>
            )}

            {Number(fee.return_amount) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  marginTop: "2px",
                  borderTop: "1px dashed #000",
                }}
              >
                <span style={{ fontWeight: 700, color: "#000" }}>
                  Returned:
                </span>
                <span style={{ fontWeight: 700, color: "#000" }}>
                  {fmt(Number(fee.return_amount))}
                </span>
              </div>
            )}

            {/* Balance Due / Fully Paid */}
            {balanceDue > 0.01 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 6px",
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                  fontWeight: 900,
                  fontSize: "15px",
                  color: "#000",
                }}
              >
                <span>BALANCE DUE:</span>
                <span>{fmt(balanceDue)}</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 6px",
                  backgroundColor: "#ecfdf5",
                  border: "2px solid #059669",
                  fontWeight: 900,
                  fontSize: "15px",
                  color: "#047857",
                }}
              >
                <span>FULLY PAID</span>
                <span>{fmt(balanceDue)}</span>
              </div>
            )}
            {/* ─── Remarks ─── */}
            {finalRemarks && (
              <div
                style={{
                  marginTop: "8px",
                  borderTop: "1px dashed #000",
                  paddingTop: "4px",
                  fontSize: "12px",
                  color: "#000",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    marginBottom: "2px",
                    color: "#000",
                  }}
                >
                  Remarks:
                </p>
                <p style={{ fontWeight: 600, color: "#000" }}>{finalRemarks}</p>
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <div
            style={{
              textAlign: "center",
              marginTop: "12px",
              borderTop: "1px dashed #000",
              paddingTop: "8px",
            }}
          >
            <p
              style={{
                fontSize: "18px",
                fontWeight: 500,
                marginBottom: "6px",
                color: "#000",
              }}
            >
              Thank You!
            </p>
          </div>
        </div>
      </>
    );
  },
);

ThermalBill.displayName = "ThermalBill";
