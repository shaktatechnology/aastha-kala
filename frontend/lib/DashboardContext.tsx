"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface DashboardData {
  stats: any;
  recent_bookings: any[];
  recent_messages: any[];
  employee_attendance?: any[];
  expense_categories?: any[];
  schedules?: any[];
  recent_events?: any[];
  revenue_gauges?: any[];
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  categories: any[];
  refreshData: (params?: Record<string, string>) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchData = useCallback(async (showLoading = true, params?: Record<string, string>) => {
    try {
      if (showLoading) setLoading(true);
      const queryStr = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard${queryStr}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Accept': 'application/json'
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to fetch dashboard data");
      setData({...result.data});
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/gallery-categories`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Accept': 'application/json'
        },
      });
      const result = await res.json();
      if (res.ok) {
        setCategories(result.data?.data || result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch gallery categories", error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchData();
      fetchCategories();
    }
  }, [fetchData, fetchCategories]);

  const refreshData = useCallback(async (params?: Record<string, string>) => {
    await fetchData(false, params);
    await fetchCategories();
  }, [fetchData, fetchCategories]);

  return (
    <DashboardContext.Provider value={{ data, loading, categories, refreshData }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
