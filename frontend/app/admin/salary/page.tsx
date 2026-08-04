"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, CreditCard, Eye, Edit2, Trash2, Wallet, Calendar, User, Download, Layers } from "lucide-react";
import { formatDate, getBsDateParts, nepaliMonthNames, toNepaliDigits } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import { toast } from "sonner";
import { Pagination } from "@/components/global/Pagination";
import { SalaryForm } from "@/components/admin/salary/salaryform";
import { AnimatePresence, motion } from "framer-motion";
import { CustomSelect } from "@/components/ui/custom-select";
import { BulkCommissionModal } from "@/components/admin/salary/BulkCommissionModal";

interface SalaryPayment {
  id: string;
  employee_id: string;
  amount: number;
  payment_date: string;
  month: number;
  year: number;
  payment_type: 'salary' | 'pre-pay' | 'bonus' | 'commission';
  remarks: string | null;
  commission_gross?: number | null;
  commission_vat?: number | null;
  commission_percentage?: number | null;
  commission_collected_amount?: number | null;
  commission_method?: string | null;
  commission_basis?: string | null;
  employee?: {
    name: string;
    type: string;
    image?: string | null;
  };
}

const SalaryManagementPage = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const currentBs = getBsDateParts(new Date()) || { month: 1, year: 2083 };
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [storedYears, setStoredYears] = useState<number[]>([]);

  // Local filter buffers
  const [searchInput, setSearchInput] = useState("");
  const [monthInput, setMonthInput] = useState<string>("");
  const [yearInput, setYearInput] = useState<string>("");

  const handleApplyFilters = () => {
    setSearchTerm(searchInput);
    setMonthFilter(monthInput);
    setYearFilter(yearInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setMonthInput("");
    setYearInput("");
    setSearchTerm("");
    setMonthFilter("");
    setYearFilter("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyFilters();
  };

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/salary-payments/years`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "application/json",
        },
      });
      const result = await res.json();
      if (result.success) {
        setStoredYears(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch years", error);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const fetchPayments = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/admin/salary-payments`);
      url.searchParams.append('page', page.toString());
      if (monthFilter) url.searchParams.append('month', monthFilter);
      if (yearFilter) url.searchParams.append('year', yearFilter);
      if (searchTerm) url.searchParams.append('search', searchTerm);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "application/json",
        },
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(res.ok ? "Invalid response format" : "Server error: Please ensure database migrations are run.");
      }

      const result = await res.json();

      setPayments(result.data?.data || []);

      if (result.data?.last_page) {
        setPagination({
          currentPage: result.data.current_page,
          totalPages: result.data.last_page,
          totalItems: result.data.total,
          itemsPerPage: result.data.per_page,
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter, searchTerm]);

  useEffect(() => {
    fetchPayments(1);
  }, [monthFilter, yearFilter, searchTerm, fetchPayments]);

  const handleEdit = useCallback((payment: SalaryPayment) => {
    setEditingPayment(payment);
    setIsViewMode(false);
    setFormModalOpen(true);
  }, []);

  const handleView = useCallback((payment: SalaryPayment) => {
    setEditingPayment(payment);
    setIsViewMode(true);
    setFormModalOpen(true);
  }, []);


  const handleDeleteClick = useCallback((payment: SalaryPayment) => {
    setSelectedPayment(payment);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!selectedPayment) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/salary-payments/${selectedPayment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Payment deleted successfully");
      fetchPayments(pagination.currentPage);
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setSelectedPayment(null);
    }
  };

  const getMonthName = (m: number) => {
    return nepaliMonthNames[m - 1] || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Salary Management</h1>
            <p className="text-sm text-gray-500 mt-1">Track payments, pre-pays, and bonuses</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Multi-Month Payout</span>
            </button>
            <button
              onClick={() => {
                setEditingPayment(null);
                setIsViewMode(false);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Record Payment</span>
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Payments this Month</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pagination.totalItems}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Amount on This Page</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              Rs. {payments.reduce((acc, p) => acc + Number(p.amount), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pre-pays (Advances)</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {payments.filter(p => p.payment_type === 'pre-pay').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm w-full">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <CustomSelect
              value={monthInput}
              onChange={(val) => setMonthInput(val)}
              options={[
                { value: "", label: "Select Month" },
                ...Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: getMonthName(i + 1)
                }))
              ]}
              className="w-40"
            />
            <CustomSelect
              value={yearInput}
              onChange={(val) => setYearInput(val)}
              options={[
                { value: "", label: "Select Year" },
                ...(storedYears.length > 0
                  ? storedYears.map(y => ({ value: y.toString(), label: toNepaliDigits(y) }))
                  : [{ value: currentBs.year.toString(), label: toNepaliDigits(currentBs.year) }])
              ]}
              className="w-28"
            />
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all font-medium cursor-pointer"
            >
              Apply
            </button>

            {(searchInput !== "" || monthInput !== "" || yearInput !== "" || searchTerm !== "" || monthFilter !== "" || yearFilter !== "") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16">S.N.</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payment Details</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="w-12 h-12 text-gray-200" />
                        <p className="text-gray-500 font-medium">No salary records found for this period</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment, index) => {
                    const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                    return (
                      <TableRow key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-500">{sn}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {payment.employee?.image ? (
                              <img
                                src={payment.employee.image.startsWith('http') ? payment.employee.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${payment.employee.image}`}
                                alt={payment.employee?.name}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900">{payment.employee?.name}</div>
                              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{payment.employee?.type}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-black text-gray-900">Rs. {Number(payment.amount).toLocaleString()}</div>
                          {payment.commission_percentage && (
                            <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
                              <span>Rate: {payment.commission_percentage}%</span>
                              <span>Base: Rs. {Number(payment.commission_collected_amount).toLocaleString()} ({payment.commission_basis})</span>
                              {Number(payment.commission_vat) > 0 && (
                                <span className="text-red-500 font-semibold">VAT: -Rs. {Number(payment.commission_vat).toLocaleString()}</span>
                              )}
                            </div>
                          )}
                          {payment.remarks && (
                            <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{payment.remarks}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-gray-700">
                            {getMonthName(payment.month)}, {toNepaliDigits(payment.year)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">{formatDate(payment.payment_date)}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                            payment.payment_type === 'salary' ? 'bg-green-100 text-green-700' :
                            payment.payment_type === 'commission' ? 'bg-amber-100 text-amber-700' :
                            payment.payment_type === 'pre-pay' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {payment.payment_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleView(payment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(payment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Payment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteClick(payment)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={(page) => fetchPayments(page)}
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {formModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFormModalOpen(false);
            }}
          >
            <div className="min-h-screen py-8 px-4 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl"
              >
                <SalaryForm
                  initialData={editingPayment}
                  isViewMode={isViewMode}
                  onSuccess={() => {
                    setFormModalOpen(false);
                    fetchYears(); // Refresh years list after adding new payment
                    fetchPayments(1);
                  }}
                  onCancel={() => setFormModalOpen(false)}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Payment Record"
        description="Are you sure you want to delete this payment record? This action cannot be undone."
      />

      <AnimatePresence>
        {bulkModalOpen && (
          <BulkCommissionModal
            isOpen={bulkModalOpen}
            onClose={() => setBulkModalOpen(false)}
            onSuccess={() => { fetchPayments(1); fetchYears(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalaryManagementPage;
