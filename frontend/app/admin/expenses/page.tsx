"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Banknote, Eye, Edit2, Trash2, Wallet, Calendar, Tag, Filter, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";
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
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import ExpenseAddEditModal from "@/components/admin/ExpenseAddEditModal";
import ExpenseViewModal from "@/components/admin/ExpenseViewModal";
import { CustomSelect } from "@/components/ui/custom-select";

interface Expense {
  id: number;
  title: string;
  amount: string;
  expense_date: string;
  category?: string;
  payment_method?: string;
  remarks?: string;
  receipt_image?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  'rent_utilities': 'Rent & Utilities',
  'salaries': 'Salaries & Wages',
  'maintenance': 'Studio Maintenance',
  'costumes': 'Costumes & Apparel',
  'equipment': 'Props & Equipment',
  'marketing': 'Marketing & Ads',
  'events': 'Events & Workshops',
  'other': 'Other'
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...Object.entries(CATEGORY_MAP).map(([value, label]) => ({ value, label }))
];

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [globalRecentCategory, setGlobalRecentCategory] = useState<string>("");

  // Local filter buffers
  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  const handleApplyFilters = () => {
    setSearchTerm(searchInput);
    setCategoryFilter(categoryInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setCategoryInput("");
    setSearchTerm("");
    setCategoryFilter("");
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

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const fetchExpenses = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page) });
      if (searchTerm) params.set("search", searchTerm);
      if (categoryFilter) params.set("category", categoryFilter);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/expenses?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "application/json",
        },
      });

      const result = await res.json();
      if (res.ok) {
        const data = result.data?.data || [];
        setExpenses(data);
        
        // Update global recent category only when viewing unfiltered first page
        if (page === 1 && !searchTerm && !categoryFilter && result.recent_category) {
           setGlobalRecentCategory(result.recent_category);
        }

        if (result.data?.last_page) {
          setPagination({
            currentPage: result.data.current_page,
            totalPages: result.data.last_page,
            totalItems: result.data.total,
            itemsPerPage: result.data.per_page,
          });
        }
      } else {
        throw new Error(result.message || "Failed to fetch expenses");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchExpenses(1);
  }, [searchTerm, categoryFilter, fetchExpenses]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormModalOpen(true);
  };

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedExpense) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${selectedExpense.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Expense deleted successfully");
      fetchExpenses(pagination.currentPage);
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setSelectedExpense(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inhouse Expenses</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage operational costs</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingExpense(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Record Expense</span>
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pagination.totalItems}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Spending</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              Rs. {expenses.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Recent Category</p>
            <p className="text-xl font-bold text-blue-600 mt-1 truncate">
              {CATEGORY_MAP[globalRecentCategory] || globalRecentCategory || "General"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm w-full">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>
          
          <div className="w-full sm:w-48">
             <CustomSelect
                value={categoryInput}
                onChange={(val) => setCategoryInput(val)}
                options={CATEGORY_OPTIONS}
                placeholder="Filter by Category"
             />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all font-medium cursor-pointer"
            >
              Apply
            </button>

            {(searchInput !== "" || categoryInput !== "" || searchTerm !== "" || categoryFilter !== "") && (
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
                  <TableHead>Expense Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Spinner className="w-8 h-8 text-primary" />
                        <p className="text-gray-500">Loading expenses...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="w-12 h-12 text-gray-200" />
                        <p className="text-gray-500 font-medium">No expense records found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense, index) => {
                    const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                    return (
                      <TableRow key={expense.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-500">{sn}</TableCell>
                        <TableCell>
                          <div className="font-bold text-gray-900">{expense.title}</div>
                          <div className="flex items-center gap-2">
                             <div className="text-sm font-black text-primary">Rs. {Number(expense.amount).toLocaleString()}</div>
                             {expense.receipt_image && <div className="px-1.5 py-0.5 bg-green-100 text-[9px] font-bold text-green-700 rounded uppercase tracking-tighter">Receipt</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter bg-gray-100 text-gray-600">
                            {CATEGORY_MAP[expense.category || ""] || expense.category || "General"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">{formatDate(expense.expense_date)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">{expense.payment_method || "N/A"}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleView(expense)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Print Thermal Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleView(expense)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(expense)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(expense)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Expense"
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
                onPageChange={(page) => fetchExpenses(page)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExpenseAddEditModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSearchInput("");
          setCategoryInput("");
          setSearchTerm("");
          setCategoryFilter("");
          fetchExpenses(1);
        }}
        expense={editingExpense}
      />
      <ExpenseViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        expense={selectedExpense}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Expense Record"
        description="Are you sure you want to delete this expense? This action will permanently remove the record and any associated receipt image."
      />
    </div>
  );
};

export default ExpensesPage;
