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
                    textAlign: "right",
                    padding: "4px 6px",
                    fontWeight: 700,
                    borderBottom: "1px solid #000",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Admission Fee */}
              {Number(fee.admission_fee) > 0 && (
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
                    {fmt(fee.admission_fee)}
                  </td>
                </tr>
              )}

              {/* Program breakdown */}
              {fee.programs_breakdown && fee.programs_breakdown.length > 0 ? (
                fee.programs_breakdown.map((pb: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #000" }}>
                    <td
                      style={{
                        padding: "4px 6px",
                        color: "#000",
                        fontWeight: 600,
                      }}
                    >
                      {pb.title}
                      {pb.due_month ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginLeft: "6px",
                            textTransform: "uppercase",
                            color: "#d97706",
                          }}
                        >
                          (Due: {formatMonthYear(pb.due_month)})
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            marginLeft: "6px",
                            textTransform: "uppercase",
                            color: "#2563eb",
                          }}
                        >
                          (Current:{" "}
                          {fee.month_year
                            ? formatMonthYear(fee.month_year)
                            : "N/A"}
                          )
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "right",
                        color: "#000",
                        fontWeight: 600,
                      }}
                    >
                      {fmt(pb.program_fee)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: "1px solid #000" }}>
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
            {/* Gross Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 6px",
                color: "#000",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#000", fontWeight: 600 }}>
                Gross Total:
              </span>
              <span style={{ color: "#000", fontWeight: 600 }}>
                {fmt(totalGross)}
              </span>
            </div>

            {totalDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 6px",
                  color: "#000",
                  fontStyle: "italic",
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "#000", fontWeight: 600 }}>
                  Discount:
                </span>
                <span style={{ color: "#000", fontWeight: 600 }}>
                  ({fmt(totalDiscount)})
                </span>
              </div>
            )}

            {/* Amount Paid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 6px",
                marginTop: "2px",
              }}
            >
              <span style={{ fontWeight: 700, color: "#000" }}>
                Amount Paid:
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#000",
                }}
              >
                {fmt(paidAmount)}
              </span>
            </div>

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

            {/* Balance Due - highlighted with border instead of tint */}
            {balanceDue > 0.01 && (
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
                <span style={{ color: "#000" }}>BALANCE DUE:</span>
                <span style={{ color: "#000" }}>{fmt(balanceDue)}</span>
              </div>
            )}
            {/* ─── Remarks ─── */}
            {fee.remarks && (
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
                <p style={{ fontWeight: 600, color: "#000" }}>{fee.remarks}</p>
              </div>
            )}
          </div>

          {/* ─── Payment History ─── */}
          {fee.payments &&
            fee.payments.filter((p: any) => Number(p.paid_amount) > 0).length >
              0 && (
              <div
                style={{
                  marginTop: "8px",
                  borderTop: "1px dashed #000",
                  paddingTop: "4px",
                }}
              >
                <p
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "3px",
                    color: "#000",
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
                        fontSize: "12px",
                        padding: "1px 0",
                        color: "#000",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: "#000", fontWeight: 600 }}>
                        {formatDate(p.created_at)}
                      </span>
                      <span style={{ color: "#000", fontWeight: 600 }}>
                        {p.payment_method || "Cash"}
                      </span>
                      <span style={{ fontWeight: 700, color: "#000" }}>
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
