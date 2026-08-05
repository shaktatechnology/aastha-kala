"use client";

import React, { forwardRef } from "react";
import { JetBrains_Mono } from "next/font/google";
import { formatDate, formatBsMonthYear } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface IncomeThermalBillProps {
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

export const IncomeThermalBill = forwardRef<HTMLDivElement, IncomeThermalBillProps>(
  ({ income, settings }, ref) => {
    if (!income) return null;

    const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
    const companyName = settings?.company_name || "Aastha Kala Kendra";
    const logoUrl = getLogoUrl(settings?.logo);

    const items = income.items || [];
    const discount = Number(income.discount || 0);
    const returnAmount = Number(income.return_amount || 0);
    const netAmount = Number(income.amount || 0);
    const receivedAmount = Number(income.received_amount ?? netAmount) || netAmount;
    const subtotal =
      items.length > 0
        ? items.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0)
        : netAmount;

    const billNo = income.bill_number || `#INC-${String(income.id).padStart(4, "0")}`;
    const billDate = formatDate(income.income_date || income.created_at || new Date());
    const period = formatBsMonthYear(Number(income.year), Number(income.month));

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700;800;900&display=swap');

  .income-thermal-print-container {
    font-family: 'Roboto Mono', monospace !important;
  }

  .income-thermal-bill-text {
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

    .income-thermal-wrapper,
    .income-thermal-wrapper * {
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

    .income-thermal-wrapper {
      display: block;
      width: 80mm;
      box-sizing: border-box;
      padding: 0;
      margin: 0 !important;
    }

    .income-thermal-print-container {
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

    .income-thermal-print-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  }

  .income-thermal-amount {
    font-variant-numeric: tabular-nums;
  }
`,
          }}
        />
        <div
          ref={ref}
          className={`income-thermal-print-container ${jetbrainsMono.className} bg-white text-black w-[72mm] mx-auto`}
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
              {companyName}
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
              {[settings?.phone && `Tel: ${settings.phone}`, settings?.email]
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
              INCOME RECEIPT
            </span>
          </div>

          {/* ─── Bill Meta ─── */}
          <div style={{ fontSize: "11.5px", color: "#000", marginBottom: "8px" }}>
            <MetaRow label="Receipt No." value={billNo} />
            <MetaRow label="Date" value={billDate} />
            <MetaRow label="Period" value={period} />
            {income.instructor?.name && <MetaRow label="Teacher" value={income.instructor.name} />}
            {income.payer_name && <MetaRow label="From" value={income.payer_name} />}
            {income.payer_phone && <MetaRow label="Phone" value={income.payer_phone} />}
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
                  Item (Topic)
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
              {items.length > 0 ? (
                items.map((it: any, index: number) => (
                  <LineItem
                    key={index}
                    label={it.category?.name || it.topic_name || "Income"}
                    subLabel={it.remarks !== income.remarks ? it.remarks : undefined}
                    amount={fmt(Number(it.amount))}
                  />
                ))
              ) : (
                <LineItem
                  label={
                    typeof income.category === "object"
                      ? income.category?.name
                      : income.category || "Income"
                  }
                  amount={fmt(netAmount)}
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
              <span className="income-thermal-amount">Rs. {fmt(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 4px",
                  fontWeight: 600,
                }}
              >
                <span>Discount</span>
                <span className="income-thermal-amount">-Rs. {fmt(discount)}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 4px",
                fontWeight: "bold",
                borderTop: "1px solid #000",
                marginTop: "2px",
                paddingTop: "4px",
              }}
            >
              <span>Net Total</span>
              <span className="income-thermal-amount">Rs. {fmt(netAmount)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 4px",
                fontWeight: 600,
              }}
            >
              <span>Cash Paid</span>
              <span className="income-thermal-amount">Rs. {fmt(receivedAmount)}</span>
            </div>

            {receivedAmount < netAmount && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 4px",
                  fontWeight: "bold",
                  color: "#000",
                }}
              >
                <span>Due Amount</span>
                <span className="income-thermal-amount">Rs. {fmt(netAmount - receivedAmount)}</span>
              </div>
            )}

            {returnAmount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 4px",
                  fontWeight: 600,
                }}
              >
                <span>Change Return</span>
                <span className="income-thermal-amount">Rs. {fmt(returnAmount)}</span>
              </div>
            )}

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
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                letterSpacing: "0.3px",
              }}
            >
              <span>TOTAL RECEIVED</span>
              <span className="income-thermal-amount">Rs. {fmt(receivedAmount)}</span>
            </div>

            {income.payment_method && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 4px",
                  fontWeight: 600,
                  color: "#000",
                }}
              >
                <span>Method</span>
                <span>{income.payment_method}</span>
              </div>
            )}

            {income.remarks && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "4px",
                  fontSize: "10.5px",
                  color: "#000",
                }}
              >
                <p style={{ fontWeight: 700, marginBottom: "2px" }}>
                  Remarks
                </p>
                <p style={{ fontWeight: 400, color: "#000" }}>
                  {income.remarks}
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
              Thank You!
            </p>
          </div>
        </div>
      </>
    );
  },
);

IncomeThermalBill.displayName = "IncomeThermalBill";

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
  subLabel,
  amount,
}: {
  label: string;
  subLabel?: string;
  amount: string;
}) {
  return (
    <tr>
      <td style={{ padding: "4px 4px", color: "#000" }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        {/* {subLabel && (
          <div style={{ fontSize: "9.5px", color: "#000", marginTop: "2px", fontWeight: 400 }}>
            {subLabel}
          </div>
        )} */}
      </td>
      <td
        className="income-thermal-amount"
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