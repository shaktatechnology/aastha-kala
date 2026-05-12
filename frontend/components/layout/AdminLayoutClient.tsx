"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { useRouter } from "next/navigation";
import { DashboardProvider } from "@/lib/DashboardContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router]);

  if (!checked) return null;

  return (
    <DashboardProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar overlay for mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-brand-deep/20 backdrop-blur-md z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out lg:relative lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            collapsed={collapsed}
            toggleCollapse={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between p-4 bg-surface border-b border-border sticky top-0 z-30 shadow-sm">
            <span className="text-xl font-black text-primary tracking-tight">Aastha Kala</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-y-auto transition-all duration-300 custom-scrollbar">
            <div className="w-full h-full min-h-screen">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
