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

    const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

    const totalGross = Number(fee.gross_amount || fee.total_amount || 0);
    const totalDiscount = Number(fee.discount_amount || fee.discount || 0);
    const netBill = Number(fee.net_amount || fee.total_amount || 0);
    const paidAmount = Number(fee.paid_amount || 0);
    const balanceDue = Math.max(0, netBill - paidAmount);

    const billDate = formatDate(fee.created_at || new Date());

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
      page-break-after: avoid !important;
      page-break-before: avoid !important;
    }

    .thermal-bill-text {
      font-family: 'Arial', 'Helvetica', sans-serif;
    }

    .thermal-beige {
      background-color: #F0ECE8;
    }
  }
`,
          }}
        />
        <div
          ref={ref}
          className="thermal-print-container thermal-bill-text bg-white text-black w-[72mm] mx-auto"
          style={{
            width: "72mm",
            padding: "4mm",
            fontSize: "11px",
            lineHeight: "1.4",
          }}
        >
          {/* ─── Header: Company Info ─── */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <h1
              style={{
                fontSize: "14px",
                fontWeight: 800,
                margin: "0 0 2px 0",
                letterSpacing: "0.5px",
              }}
            >
              {settings?.company_name}
            </h1>
            {settings?.address && (
              <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>
                {settings.address}
              </p>
            )}
            {settings?.phone && (
              <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>
                Phone: {settings.phone}
              </p>
            )}
            {settings?.email && (
              <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>
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
              borderTop: "1px solid #ddd",
              borderBottom: "1px solid #ddd",
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
            <div style={{ flex: 1, textAlign: "right", fontSize: "10px" }}>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 900,
                  margin: "0 0 4px 0",
                }}
              >
                BILL
              </p>
              <p style={{ margin: "1px 0" }}>
                <strong>Bill No.:</strong> {billNo}
              </p>
              <p style={{ margin: "1px 0" }}>
                <strong>Date:</strong> {billDate}
              </p>
              <p style={{ margin: "1px 0" }}>
                <strong>Student:</strong> {fee.student?.name || "N/A"}
              </p>
              <p style={{ margin: "1px 0" }}>
                <strong>Period:</strong> {fee.month_year ? formatMonthYear(fee.month_year) : "N/A"}
              </p>
            </div>
          </div>

          {/* ─── Items Table ─── */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "6px",
              fontSize: "10px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#F0ECE8" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "4px 6px",
                    fontWeight: 700,
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "4px 6px",
                    fontWeight: 700,
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Admission Fee */}
              {Number(fee.admission_fee) > 0 && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 6px" }}>Admission Fee</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>
                    {fmt(fee.admission_fee)}
                  </td>
                </tr>
              )}

              {/* Program breakdown */}
              {fee.programs_breakdown && fee.programs_breakdown.length > 0 ? (
                fee.programs_breakdown.map((pb: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "4px 6px" }}>{pb.title}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>
                      {fmt(pb.program_fee)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td
                    style={{ padding: "4px 6px", textTransform: "capitalize" }}
                  >
                    {fee.fee_type === "billing"
                      ? "Tuition Fees"
                      : fee.fee_type || "Fee"}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>
                    {fmt(totalGross)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ─── Totals ─── */}
          <div style={{ fontSize: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 6px",
              }}
            >
              <span style={{ fontWeight: 700 }}>Subtotal:</span>
              <span>{fmt(totalGross)}</span>
            </div>

            {totalDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 6px",
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                <span>Discount:</span>
                <span>({fmt(totalDiscount)})</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 6px",
                borderTop: "1px solid #ddd",
                marginTop: "2px",
              }}
            >
              <span style={{ fontWeight: 700 }}>Total Amount (Gross):</span>
              <span>{fmt(netBill)}</span>
            </div>

            {/* Net Bill - highlighted */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 6px",
                backgroundColor: "#F0ECE8",
                marginTop: "4px",
                fontWeight: 900,
                fontSize: "12px",
              }}
            >
              <span>Net Bill:</span>
              <span>{fmt(netBill)}</span>
            </div>

            {/* Amount Paid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 6px",
                marginTop: "2px",
              }}
            >
              <span style={{ fontWeight: 700 }}>Amount Paid:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: paidAmount === 0 ? "#dc2626" : "#000",
                }}
              >
                {fmt(paidAmount)}
              </span>
            </div>

            {/* Balance Due - highlighted */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 6px",
                backgroundColor: "#F0ECE8",
                fontWeight: 900,
                fontSize: "12px",
              }}
            >
              <span>BALANCE DUE:</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          </div>

          {/* ─── Payment History ─── */}
          {fee.payments &&
            fee.payments.filter((p: any) => Number(p.paid_amount) > 0).length >
              0 && (
              <div
                style={{
                  marginTop: "8px",
                  borderTop: "1px dashed #999",
                  paddingTop: "4px",
                }}
              >
                <p
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "3px",
                  }}
                >
                  Payment History
                </p>
                {fee.payments
                  .filter((p: any) => Number(p.paid_amount) > 0)
                  .map((p: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "9px",
                        padding: "1px 0",
                      }}
                    >
                      <span>{formatDate(p.created_at)}</span>
                      <span>{p.payment_method || "Cash"}</span>
                      <span style={{ fontWeight: 700 }}>
                        {fmt(p.paid_amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

          {/* ─── Footer ─── */}
          <div
            style={{
              textAlign: "center",
              marginTop: "12px",
              borderTop: "1px dashed #999",
              paddingTop: "8px",
            }}
          >
            <p
              style={{ fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}
            >
              Thank You!
            </p>
            <p style={{ fontSize: "8px", fontWeight: 600, color: "#666" }}>
              {settings?.company_name}
            </p>
          </div>
        </div>
      </>
    );
  },
);

ThermalBill.displayName = "ThermalBill";
