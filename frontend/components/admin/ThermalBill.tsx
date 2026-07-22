"use client";

import React, { forwardRef } from "react";
import { JetBrains_Mono } from "next/font/google";
import { formatDate, formatMonthYear } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

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

    // ── Calculate breakdown totals (unchanged business logic) ──
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

    const totalGross = admissionOutstanding + programOutstandingTotal;
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
    if (dueRemarks.length > 0) remarksParts.push(...dueRemarks);
    const finalRemarks = remarksParts.join(" | ");

    const billNo = `#FEE-${fee.id}`;

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700;800;900&display=swap');

  .thermal-print-container {
    font-family: 'Roboto Mono', monospace !important;
  }

  .thermal-bill-text {
    font-family: 'Roboto Mono', monospace;
  }

  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: hidden !important;
    }

    .print-wrapper,
    .print-wrapper * {
      visibility: visible !important;
      height: auto !important;
      min-height: 0 !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }

    .print-wrapper {
      display: block;
      width: 80mm;
      box-sizing: border-box;
      padding: 0;
      margin: 0 !important;
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
      height: auto !important;
      min-height: 0 !important;
    }

    .thermal-print-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  }

  .thermal-amount {
    font-variant-numeric: tabular-nums;
  }
`,
          }}
        />
        <div
          ref={ref}
          className={`thermal-print-container ${jetbrainsMono.className} bg-white text-black w-[72mm] mx-auto`}
          style={{
            width: "80mm",
            padding: "4mm",
            fontSize: "13px",
            lineHeight: "1.45",
            backgroundColor: "#fff",
            color: "#000",
          }}
        >
          {/* ─── Header: Logo + Company Info ─── */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            {/* {settings?.logo && (
              <div style={{ marginBottom: "6px" }}>
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    height: "40px",
                    width: "auto",
                    margin: "0 auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            )} */}
            <h1
              style={{
                fontSize: "17px",
                fontWeight: 800,
                margin: "0 0 3px 0",
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                color: "#000",
              }}
            >
              {settings?.company_name}
            </h1>
            {settings?.address && (
              <p
                style={{
                  fontSize: "10.5px",
                  margin: "1px 0",
                  color: "#000",
                  fontWeight: 500,
                }}
              >
                {settings.address}
              </p>
            )}
            <p
              style={{
                fontSize: "10.5px",
                margin: "1px 0",
                color: "#000",
                fontWeight: 500,
              }}
            >
              {[
                settings?.phone && `Tel: ${settings.phone}`,
                settings?.email,
              ]
                .filter(Boolean)
                .join("   ·   ")}
            </p>
          </div>

          {/* ─── Document Title ─── */}
          <div
            style={{
              textAlign: "center",
              borderTop: "1.5px solid #000",
              borderBottom: "1.5px solid #000",
              padding: "5px 0",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "3px",
                color: "#000",
              }}
            >
              PAYMENT RECEIPT
            </span>
          </div>

          {/* ─── Bill Meta ─── */}
          <div style={{ fontSize: "11.5px", color: "#000", marginBottom: "8px" }}>
            <MetaRow label="Bill No." value={billNo} />
            <MetaRow label="Date" value={billDate} />
            <MetaRow label="Student" value={fee.student?.name || "N/A"} />
            {fee.student?.roll_no && (
              <MetaRow label="Roll No." value={fee.student.roll_no} />
            )}
            <MetaRow
              label="Period"
              value={fee.month_year ? formatMonthYear(fee.month_year) : "N/A"}
            />
            {fee.shift && <MetaRow label="Shift" value={fee.shift} />}
          </div>

          {/* ─── Items Table ─── */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "2px",
              fontSize: "12px",
              color: "#000",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3px 4px 5px 4px",
                    fontWeight: 700,
                    fontSize: "10.5px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    borderBottom: "1.5px solid #000",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    width: "90px",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    padding: "3px 4px 5px 4px",
                    fontWeight: 700,
                    fontSize: "10.5px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    borderBottom: "1.5px solid #000",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {renderAdmission && (
                <LineItem label="Admission Fee" amount={fmt(admissionOutstanding)} />
              )}

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
                    <LineItem
                      key={idx}
                      label={pb.title}
                      amount={fmt(outstandingBeforeToday)}
                    />
                  );
                })
              ) : (
                <LineItem
                  label={
                    fee.fee_type === "billing"
                      ? "Tuition Fees"
                      : fee.fee_type || "Fee"
                  }
                  amount={fmt(totalGross)}
                  capitalize
                />
              )}
            </tbody>
          </table>

          {/* ─── Totals ─── */}
          <div style={{ fontSize: "12.5px", color: "#000", marginTop: "2px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 4px",
                borderTop: "1px dashed #000",
                fontWeight: 600,
              }}
            >
              <span>Subtotal</span>
              <span className="thermal-amount">Rs. {fmt(totalGross)}</span>
            </div>

            {paidToday > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 4px",
                  fontWeight: 600,
                  color: "#000",
                }}
              >
                <span>Amount Paid</span>
                <span className="thermal-amount">Rs. {fmt(paidToday)}</span>
              </div>
            )}

            {Number(fee.return_amount) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 4px",
                  fontWeight: 600,
                }}
              >
                <span>Change Returned</span>
                <span className="thermal-amount">
                  Rs. {fmt(Number(fee.return_amount))}
                </span>
              </div>
            )}

            {balanceDue > 0.01 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 4px",
                  marginTop: "5px",
                  borderTop: "1px solid #000",
                  borderBottom: "1px solid #000",
                  fontWeight: "800",
                  fontSize: "14px",
                  color: "#000",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  letterSpacing: "0px",
                }}
              >
                <span>BALANCE DUE</span>
                <span className="thermal-amount">Rs. {fmt(balanceDue)}</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 4px",
                  marginTop: "5px",
                  borderTop: "1.5px dashed #000",
                  borderBottom: "1.5px dashed #000",
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#000",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  letterSpacing: "0.3px",
                }}
              >
                <span>✓ FULLY PAID</span>
                <span className="thermal-amount">
                  {balanceDue > 0.01 ? `Rs. ${fmt(balanceDue)}` : ""}
                </span>
              </div>
            )}

            {finalRemarks && (
              <div
                style={{
                  marginTop: "10px",
                  borderTop: "1px dashed #000",
                  paddingTop: "5px",
                  fontSize: "10.5px",
                  color: "#000",
                }}
              >
                <p style={{ fontWeight: 700, marginBottom: "2px" }}>
                  Remarks
                </p>
                <p style={{ fontWeight: 400, color: "#000" }}>
                  {finalRemarks}
                </p>
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <div
            style={{
              textAlign: "center",
              marginTop: "14px",
              borderTop: "1.5px dashed #000",
              paddingTop: "10px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                marginBottom: "4px",
                color: "#000",
              }}
            >
              Thank You for Your Payment
            </p>
            {/* <p
              style={{
                fontSize: "9.5px",
                color: "#666",
                margin: 0,
                fontWeight: 400,
              }}
            >
              This is a system-generated receipt.
            </p> */}
          </div>
        </div>
      </>
    );
  },
);

ThermalBill.displayName = "ThermalBill";

// ─── Helper subcomponents ───

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "1.5px 0",
      }}
    >
      <span style={{ color: "#000", fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function LineItem({
  label,
  amount,
  capitalize = false,
}: {
  label: string;
  amount: string;
  capitalize?: boolean;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "4px 4px",
          color: "#000",
          fontWeight: 500,
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {label}
      </td>
      <td
        className="thermal-amount"
        style={{
          padding: "4px 4px",
          textAlign: "right",
          color: "#000",
          fontWeight: 600,
        }}
      >
        {amount}
      </td>
    </tr>
  );
}