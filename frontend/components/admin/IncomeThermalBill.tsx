"use client";

import React, { forwardRef } from "react";
import { formatDate, formatBsMonthYear } from "@/lib/utils";

interface IncomeThermalBillProps {
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

export const IncomeThermalBill = forwardRef<HTMLDivElement, IncomeThermalBillProps>(
    ({ income, settings }, ref) => {
        if (!income) return null;

        const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
        const companyName = settings?.company_name || "Aastha Kala Kendra";
        const logoUrl = getLogoUrl(settings?.logo);
        const amount = Number(income.amount || 0);
        const billNo = `#INC-${String(income.id).padStart(4, "0")}`;
        const billDate = formatDate(income.income_date || income.created_at || new Date());
        const period = formatBsMonthYear(Number(income.year), Number(income.month));

        return (
            <>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');

          .income-thermal-container {
            font-family: 'Roboto Mono', monospace !important;
          }

          @media print {
            body * { visibility: hidden !important; }
            .income-thermal-wrapper, .income-thermal-wrapper * { visibility: visible !important; }
            body { margin: 0; padding: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
            }
            .income-thermal-wrapper { display: block; width: 80mm; box-sizing: border-box; padding: 0; }
            .income-thermal-container {
              width: 72mm !important; margin: 0 auto !important;
              padding: 4mm !important; background: white !important;
              color: black !important;
              page-break-inside: avoid !important;
              page-break-after: always !important;
              break-after: page !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: optimizeLegibility !important;
            }
            .income-thermal-container:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
          }
        `}} />

                <div ref={ref} className="income-thermal-container bg-white text-black w-[72mm] mx-auto"
                    style={{ width: "72mm", padding: "4mm", fontSize: "11px", lineHeight: "1.4" }}
                >
                    {/* Company Header */}
                    <div style={{ textAlign: "center", marginBottom: "4px" }}>
                        <h1 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 2px 0", letterSpacing: "0.5px" }}>
                            {companyName}
                        </h1>
                        {settings?.address && (
                            <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>{settings.address}</p>
                        )}
                        {settings?.phone && (
                            <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>Phone: {settings.phone}</p>
                        )}
                        {settings?.email && (
                            <p style={{ fontSize: "9px", margin: "1px 0", color: "#555" }}>Email: {settings.email}</p>
                        )}
                    </div>

                    {/* Logo + Bill Details */}
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "4px",
                        borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd", padding: "2px 0"
                    }}>
                        <div style={{ width: "50px", flexShrink: 0 }}>
                            <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "auto" }} />
                        </div>
                        <div style={{ flex: 1, textAlign: "right", fontSize: "10px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 900, margin: "0 0 4px 0" }}>INCOME</p>
                            <p style={{ margin: "1px 0" }}><strong>Receipt No.:</strong> {billNo}</p>
                            <p style={{ margin: "1px 0" }}><strong>Date:</strong> {billDate}</p>
                            <p style={{ margin: "1px 0" }}><strong>Period:</strong> {period}</p>
                            {income.payer_name && (
                                <p style={{ margin: "1px 0" }}><strong>From:</strong> {income.payer_name}</p>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "10px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#F0ECE8" }}>
                                <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 700, borderBottom: "1px solid #ccc" }}>
                                    Description
                                </th>
                                <th style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700, borderBottom: "1px solid #ccc" }}>
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "5px 6px" }}>
                                    <div style={{ fontWeight: 700 }}>{typeof income.category === 'object' ? income.category?.name : (income.category || "Income")}</div>
                                    {income.remarks && (
                                        <div style={{ fontSize: "8px", color: "#777", marginTop: "2px" }}>{income.remarks}</div>
                                    )}
                                </td>
                                <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Total */}
                    <div style={{ fontSize: "10px" }}>
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "5px 6px", backgroundColor: "#F0ECE8",
                            marginTop: "4px", fontWeight: 900, fontSize: "12px"
                        }}>
                            <span>TOTAL RECEIVED:</span>
                            <span>{fmt(amount)}</span>
                        </div>

                        {income.payment_method && (
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 6px", marginTop: "2px" }}>
                                <span style={{ fontWeight: 700 }}>Payment Method:</span>
                                <span>{income.payment_method}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: "center", marginTop: "12px", borderTop: "1px dashed #999", paddingTop: "8px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 6px 0" }}>Thank You!</p>
                        <p style={{ fontSize: "8px", fontWeight: 600, color: "#666", margin: "0" }}>{companyName}</p>
                    </div>
                </div>
            </>
        );
    }
);

IncomeThermalBill.displayName = "IncomeThermalBill";
