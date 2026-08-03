"use client";

import React, { forwardRef } from "react";
import { JetBrains_Mono } from "next/font/google";
import { formatDate } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const CATEGORY_MAP: Record<string, string> = {
  rent_utilities: "Rent & Utilities",
  salaries: "Salaries & Wages",
  maintenance: "Studio Maintenance",
  costumes: "Costumes & Apparel",
  equipment: "Props & Equipment",
  marketing: "Marketing & Ads",
  events: "Events & Workshops",
  other: "Miscellaneous",
};

interface ExpenseThermalBillProps {
  expense: any;
  settings: any;
}

export const ExpenseThermalBill = forwardRef<HTMLDivElement, ExpenseThermalBillProps>(
  ({ expense, settings }, ref) => {
    if (!expense) return null;

    const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
    const companyName = settings?.company_name || "Aastha Kala Kendra";
    const amount = Number(expense.amount || 0);

    const voucherNo = `#EXP-${String(expense.id).padStart(4, "0")}`;
    const voucherDate = formatDate(expense.expense_date || expense.created_at || new Date());
    const categoryName = CATEGORY_MAP[expense.category || ""] || expense.category || "General";

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700;800;900&display=swap');

  .expense-thermal-print-container {
    font-family: 'Roboto Mono', monospace !important;
  }

  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: hidden !important;
    }

    .expense-thermal-wrapper,
    .expense-thermal-wrapper * {
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

    .expense-thermal-wrapper {
      display: block;
      width: 80mm;
      box-sizing: border-box;
      padding: 0;
      margin: 0 !important;
    }

    .expense-thermal-print-container {
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

    .expense-thermal-print-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  }

  .expense-thermal-amount {
    font-variant-numeric: tabular-nums;
  }
`,
          }}
        />
        <div
          ref={ref}
          className={`expense-thermal-print-container ${jetbrainsMono.className} bg-white text-black w-[72mm] mx-auto`}
          style={{
            width: "80mm",
            padding: "4mm",
            fontSize: "13px",
            lineHeight: "1.45",
            backgroundColor: "#fff",
            color: "#000",
          }}
        >
          {/* ─── Header: Company Info ─── */}
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
              EXPENSE VOUCHER
            </span>
          </div>

          {/* ─── Meta ─── */}
          <div style={{ fontSize: "11.5px", color: "#000", marginBottom: "8px" }}>
            <MetaRow label="Voucher No." value={voucherNo} />
            <MetaRow label="Date" value={voucherDate} />
            <MetaRow label="Category" value={categoryName} />
            {expense.payment_method && (
              <MetaRow label="Method" value={expense.payment_method} />
            )}
          </div>

          {/* ─── Expense Details Table ─── */}
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
              <tr>
                <td style={{ padding: "4px 4px", color: "#000" }}>
                  <div style={{ fontWeight: 700 }}>{expense.title}</div>
                </td>
                <td
                  className="expense-thermal-amount"
                  style={{
                    padding: "4px 4px",
                    textAlign: "right",
                    color: "#000",
                    fontWeight: 600,
                  }}
                >
                  Rs. {fmt(amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ─── Totals ─── */}
          <div style={{ fontSize: "12.5px", color: "#000", marginTop: "2px" }}>
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
              <span>TOTAL PAID</span>
              <span className="expense-thermal-amount">Rs. {fmt(amount)}</span>
            </div>

            {expense.remarks && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "4px",
                  fontSize: "10.5px",
                  color: "#000",
                }}
              >
                <p style={{ fontWeight: 700, marginBottom: "2px" }}>
                  Remarks / Notes
                </p>
                <p style={{ fontWeight: 400, color: "#000" }}>
                  {expense.remarks}
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
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "4px",
                color: "#000",
              }}
            >
              Operational Expense Record
            </p>
          </div>
        </div>
      </>
    );
  }
);

ExpenseThermalBill.displayName = "ExpenseThermalBill";

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
