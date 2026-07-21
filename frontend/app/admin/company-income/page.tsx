"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, TrendingUp, Eye, Edit2, Trash2, Wallet, Calendar, List, Printer
} from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";
import CompanyIncomeModal, { CompanyIncome } from "@/components/admin/CompanyIncomeModal";
import IncomeCategoryManagementModal from "@/components/admin/IncomeCategoryManagementModal";

const getMonthName = (m: number) => nepaliMonthNames[m - 1] || "Unknown";

const CompanyIncomePage = () => {
    const currentBs = getBsDateParts(new Date()) || { month: 1, year: 2081 };

    const [incomes, setIncomes] = useState<CompanyIncome[]>([]);
    const [loading, setLoading] = useState(true);
    const [storedYears, setStoredYears] = useState<number[]>([]);
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);

    // Active filters
    const [monthFilter, setMonthFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Input buffers
    const [monthInput, setMonthInput] = useState("");
    const [yearInput, setYearInput] = useState("");
    const [categoryInput, setCategoryInput] = useState("");
    const [searchInput, setSearchInput] = useState("");

    const [monthlyTotal, setMonthlyTotal] = useState<number | null>(null);

    const [pagination, setPagination] = useState({
        currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10,
    });

    const [selectedIncome, setSelectedIncome] = useState<CompanyIncome | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<CompanyIncome | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isManualBilling, setIsManualBilling] = useState(false);

    // Category management modal
    const [categoryMgmtOpen, setCategoryMgmtOpen] = useState(false);

    // Fetch years
    const fetchYears = useCallback(async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/admin/company-incomes/years`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" } }
            );
            const data = await res.json();
            if (data.success) setStoredYears(data.data);
        } catch { /* silent */ }
    }, []);

    // Fetch categories for filter
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchYears(); fetchCategories(); }, [fetchYears, fetchCategories]);

    // Fetch income records
    const fetchIncomes = useCallback(async (page: number = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: String(page) });
            if (monthFilter) params.set("month", monthFilter);
            if (yearFilter) params.set("year", yearFilter);
            if (categoryFilter) params.set("income_category_id", categoryFilter);
            if (searchTerm) params.set("search", searchTerm);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/admin/company-incomes?${params}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" } }
            );
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to fetch incomes");

            setIncomes(result.data?.data || []);
            setMonthlyTotal(result.monthly_total ?? null);

            if (result.data?.last_page) {
                setPagination({
                    currentPage: result.data.current_page,
                    totalPages: result.data.last_page,
                    totalItems: result.data.total,
                    itemsPerPage: result.data.per_page,
                });
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [monthFilter, yearFilter, categoryFilter, searchTerm]);

    useEffect(() => { fetchIncomes(1); }, [monthFilter, yearFilter, categoryFilter, searchTerm, fetchIncomes]);

    const handleApplyFilters = () => {
        setMonthFilter(monthInput);
        setYearFilter(yearInput);
        setCategoryFilter(categoryInput);
        setSearchTerm(searchInput);
    };

    const handleClearFilters = () => {
        setMonthInput("");
        setYearInput("");
        setCategoryInput("");
        setSearchInput("");
        setMonthFilter("");
        setYearFilter("");
        setCategoryFilter("");
        setSearchTerm("");
    };

    const isFiltered =
        monthInput !== "" ||
        yearInput !== "" ||
        categoryInput !== "" ||
        searchInput !== "" ||
        monthFilter !== "" ||
        yearFilter !== "" ||
        categoryFilter !== "" ||
        searchTerm !== "";

    const handleAdd = () => { 
        setEditingIncome(null); 
        setIsViewMode(false); 
        setIsManualBilling(false); 
        setFormModalOpen(true); 
    };
    const handleAddManual = () => { 
        setEditingIncome(null); 
        setIsViewMode(false); 
        setIsManualBilling(true); 
        setFormModalOpen(true); 
    };
    const handleEdit = (income: CompanyIncome) => { 
        setEditingIncome(income); 
        setIsViewMode(false); 
        const hasManual = income.items?.some((it: any) => !it.income_category_id && it.topic_name);
        setIsManualBilling(!!hasManual);
        setFormModalOpen(true); 
    };
    const handleView = (income: CompanyIncome) => { 
        setEditingIncome(income); 
        setIsViewMode(true); 
        const hasManual = income.items?.some((it: any) => !it.income_category_id && it.topic_name);
        setIsManualBilling(!!hasManual);
        setFormModalOpen(true); 
    };

    const handleDeleteClick = (income: CompanyIncome) => {
        setSelectedIncome(income); setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedIncome) return;
        setDeleting(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/admin/company-incomes/${selectedIncome.id}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Income record deleted");
            fetchIncomes(pagination.currentPage);
            setDeleteModalOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
            setSelectedIncome(null);
        }
    };

    const onFormSuccess = (savedIncome?: CompanyIncome) => {
        setFormModalOpen(false);
        fetchYears();
        fetchCategories();
        fetchIncomes(1);

        if (savedIncome) {
            setTimeout(() => {
                setEditingIncome(savedIncome);
                setIsViewMode(true);
                setFormModalOpen(true);
            }, 300);
        }
    };

    const yearOptions =
        storedYears.length > 0
            ? storedYears.map((y) => ({ value: y.toString(), label: toNepaliDigits(y) }))
            : [{ value: currentBs.year.toString(), label: toNepaliDigits(currentBs.year) }];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Company Income</h1>
                        <p className="text-sm text-gray-500 mt-1">Track hall charges, rent, and all revenue sources</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCategoryMgmtOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm cursor-pointer font-medium"
                        >
                            <List className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm">Manage Categories</span>
                        </button>
                        {/* <button
                            onClick={handleAdd}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 hover:border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50/30 transition-all shadow-sm cursor-pointer font-medium"
                        >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm">Record Income</span>
                        </button> */}
                        <button
                            onClick={handleAddManual}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md cursor-pointer font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Create General Bill</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Records Found</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{pagination.totalItems}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            {monthFilter || yearFilter ? "Total for Selected Period" : "Total Income"}
                        </p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">
                            Rs. {(monthlyTotal ?? 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Viewing Period</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                            {monthFilter && yearFilter
                                ? `${getMonthName(Number(monthFilter))} ${toNepaliDigits(Number(yearFilter))}`
                                : "All Period"}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}
                    className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-full"
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <CustomSelect
                            value={monthInput}
                            onChange={setMonthInput}
                            options={[
                                { value: "", label: "Select Month" },
                                ...Array.from({ length: 12 }, (_, i) => ({
                                    value: (i + 1).toString(),
                                    label: getMonthName(i + 1),
                                }))
                            ]}
                            className="w-40"
                        />
                        <CustomSelect
                            value={yearInput}
                            onChange={setYearInput}
                            options={[
                                { value: "", label: "Select Year" },
                                ...yearOptions
                            ]}
                            className="w-28"
                        />
                    </div>

                    <div className="w-48">
                        <CustomSelect
                            value={categoryInput}
                            onChange={setCategoryInput}
                            options={[
                                { value: "", label: "All Categories" },
                                ...categories.map(c => ({ value: String(c.id), label: c.name }))
                            ]}
                            className="w-full"
                        />
                    </div>

                    <div className="flex-1 min-w-[180px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search payer, remarks..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium cursor-pointer">
                            Apply
                        </button>
                        {isFiltered && (
                            <button type="button" onClick={handleClearFilters} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium cursor-pointer">
                                Clear
                            </button>
                        )}
                    </div>
                </form>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-14">S.N.</TableHead>
                                    <TableHead>Category / Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-2">
                                                <Spinner className="w-8 h-8 text-emerald-500" />
                                                <p className="text-gray-500">Loading income records...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : incomes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-2">
                                                <Wallet className="w-12 h-12 text-gray-200" />
                                                <p className="text-gray-500 font-medium">No income records found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    incomes.map((income, index) => {
                                        const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                                        return (
                                            <TableRow key={income.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-medium text-gray-500">{sn}</TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-gray-900">
                                                        {income.items && income.items.length > 0 
                                                            ? income.items.map((it: any) => it.category?.name).filter(Boolean).join(", ") 
                                                            : (income.category?.name || "—")}
                                                    </div>
                                                    {income.payer_name && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">From: {income.payer_name}</div>}
                                                    {income.bill_number && <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">{income.bill_number}</div>}
                                                </TableCell>
                                                <TableCell><div className="text-sm font-black text-emerald-600">Rs. {Number(income.amount).toLocaleString()}</div></TableCell>
                                                <TableCell><div className="text-sm font-medium text-gray-700">{getMonthName(income.month)}, {toNepaliDigits(income.year)}</div></TableCell>
                                                <TableCell><div className="text-sm text-gray-600">{formatDate(income.income_date)}</div></TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-widest truncate max-w-[120px]" title={income.payment_method || ""}>
                                                        {income.payment_method || "—"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => handleView(income)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="View Details"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => handleView(income)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Print Receipt"><Printer className="w-4 h-4" /></button>
                                                        <button onClick={() => handleEdit(income)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteClick(income)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
                            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} itemsPerPage={pagination.itemsPerPage} onPageChange={(page) => fetchIncomes(page)} />
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {formModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                        <CompanyIncomeModal isOpen={formModalOpen} onClose={() => setFormModalOpen(false)} onSuccess={onFormSuccess} income={editingIncome} isViewMode={isViewMode} isManualBilling={isManualBilling} />
                    </motion.div>
                )}
            </AnimatePresence>

            <IncomeCategoryManagementModal
                isOpen={categoryMgmtOpen}
                onClose={() => {
                    setCategoryMgmtOpen(false);
                    fetchCategories(); // Refresh filter options
                }}
            />

            <DeleteConfirmationModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} loading={deleting} title="Delete Income Record" description="Are you sure you want to delete this income record? This action cannot be undone." />
        </div>
    );
};

export default CompanyIncomePage;
