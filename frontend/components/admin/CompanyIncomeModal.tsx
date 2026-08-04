"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    X, Save, AlertCircle, TrendingUp, Calendar, Printer, Plus, Receipt,
    Check as CheckIcon,
    ChevronDown as ChevronDownIcon,
    Banknote as BanknoteIcon,
    Building as BuildingIcon,
    Smartphone as SmartphoneIcon,
    FileText as FileTextIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";
import { NepaliDateInput } from "@/components/ui/NepaliDateInput";
import { cn, formatDate, formatBsMonthYear, getBsDateParts, nepaliMonthNames, toNepaliDigits } from "@/lib/utils";
import { IncomeA4Bill } from "@/components/admin/IncomeA4Bill";
import { IncomeThermalBill } from "@/components/admin/IncomeThermalBill";

export interface CompanyIncomeItemData {
    id?: number;
    income_category_id: string;
    topic_name?: string;
    amount: string;
    remarks?: string;
}

export interface CompanyIncome {
    id?: number;
    income_category_id: string;
    instructor_id?: string | number | null;
    instructor?: { name: string; id: number };
    commission_percentage?: string | number | null;
    commission_amount?: string | number | null;
    category?: { name: string; id: number };
    amount: string;
    income_date: string;
    month: number;
    year: number;
    payment_method?: string; // Will be stored as comma separated string
    payer_name?: string;
    payer_phone?: string;
    remarks?: string;
    discount?: string;
    received_amount?: string;
    return_amount?: string;
    bill_number?: string;
    items?: CompanyIncomeItemData[];
}

interface IncomeCategory {
    id: number;
    name: string;
}

interface Instructor {
    id: number;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (savedIncome?: CompanyIncome) => void;
    income?: CompanyIncome | null;
    isViewMode?: boolean;
    isManualBilling?: boolean;
}

const METHODS = [
    { key: "Cash", icon: BanknoteIcon, label: "Cash" },
    { key: "Bank Transfer", icon: BuildingIcon, label: "Bank Transfer" },
    { key: "Digital Wallet", icon: SmartphoneIcon, label: "Digital Wallet" },
    { key: "Cheque", icon: FileTextIcon, label: "Cheque" },
    { key: "Esewa", icon: SmartphoneIcon, label: "Esewa" },
    { key: "Khalti", icon: SmartphoneIcon, label: "Khalti" },
] as const;

const MethodDropdown: React.FC<{
    value: string[];
    onChange: (v: string[]) => void;
    disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const label = value.length > 0 ? value.join(", ") : "Select methods";

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm min-h-[44px]"
            >
                <span className="text-xs font-semibold text-gray-700 truncate text-left">
                    {label}
                </span>
                <ChevronDownIcon
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] py-1 animate-in fade-in zoom-in duration-200">
                    {METHODS.map((m) => {
                        const Ic = m.icon;
                        const selected = value.includes(m.key);
                        return (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => {
                                    const next = selected
                                        ? value.filter((item) => item !== m.key)
                                        : [...value, m.key];
                                    onChange(next.length ? next : ["Cash"]);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-all ${selected ? "bg-emerald-50 text-emerald-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                            >
                                <Ic className="w-4 h-4" />
                                <span className="flex-1 text-left">{m.label}</span>
                                {selected && <CheckIcon className="w-4 h-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const NEPALI_MONTH_OPTIONS = nepaliMonthNames.map((name, i) => ({
    value: (i + 1).toString(),
    label: name,
}));

function ErrorMessage({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
            <AlertCircle className="size-3" />
            {message}
        </p>
    );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
    return (
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );
}

function getDefaultForm(): CompanyIncome {
    const today = new Date().toLocaleDateString("en-CA");
    const bs = getBsDateParts(new Date()) || { month: 1, year: 2081 };
    return {
        income_category_id: "",
        instructor_id: "",
        commission_percentage: "",
        commission_amount: "",
        amount: "",
        income_date: today,
        month: bs.month,
        year: bs.year,
        payment_method: "Cash",
        payer_name: "",
        payer_phone: "",
        remarks: "",
        discount: "0",
        received_amount: "",
        return_amount: "0",
        bill_number: "",
        items: [{ income_category_id: "", topic_name: "", amount: "", remarks: "" }],
    };
}

const CompanyIncomeModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSuccess,
    income,
    isViewMode = false,
    isManualBilling = false,
}) => {
    const isEdit = !!income?.id;
    const currentBs = getBsDateParts(new Date()) || { month: 1, year: 2081 };

    const [form, setForm] = useState<CompanyIncome>(getDefaultForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [settings, setSettings] = useState<any>(null);

    const [categories, setCategories] = useState<IncomeCategory[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryLoading, setCategoryLoading] = useState(false);

    // Multi-select payment methods
    const [paymentMethods, setPaymentMethods] = useState<string[]>(["Cash"]);
    const [cashReceived, setCashReceived] = useState("");
    const [isManualMode, setIsManualMode] = useState(isManualBilling);

    useEffect(() => {
        if (isOpen) {
            if (income) {
                const hasManual = income.items?.some((it: any) => !it.income_category_id && it.topic_name) || !income.income_category_id;
                setIsManualMode(!!hasManual);
            } else {
                setIsManualMode(isManualBilling);
            }
        }
    }, [income, isOpen, isManualBilling]);

    // Print refs
    const printRefA4 = useRef<HTMLDivElement>(null);
    const printRefThermal = useRef<HTMLDivElement>(null);

    const yearOptions = Array.from({ length: 8 }, (_, i) => {
        const y = currentBs.year - 4 + i;
        return { value: y.toString(), label: toNepaliDigits(y) };
    });

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch { /* silent */ }
    }, []);

    const fetchInstructors = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/instructors`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) {
                setInstructors(data.data?.data || data.data || []);
            }
        } catch { /* silent */ }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) setSettings(data.data.setting || data.data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (income) {
            setForm({
                ...income,
                amount: String(income.amount),
                income_category_id: income.income_category_id ? String(income.income_category_id) : "",
                instructor_id: income.instructor_id ? String(income.instructor_id) : "",
                commission_percentage: income.commission_percentage !== undefined && income.commission_percentage !== null ? String(income.commission_percentage) : "",
                commission_amount: income.commission_amount !== undefined && income.commission_amount !== null ? String(income.commission_amount) : "",
                discount: String(income.discount ?? 0),
                received_amount: String(income.received_amount ?? income.amount),
                return_amount: String(income.return_amount ?? 0),
                bill_number: income.bill_number || "",
                payer_phone: income.payer_phone || "",
                items: income.items && income.items.length > 0
                    ? income.items.map((item: any) => ({
                          id: item.id,
                          income_category_id: String(item.income_category_id || ""),
                          topic_name: item.topic_name || "",
                          amount: String(item.amount),
                          remarks: item.remarks || "",
                      }))
                    : [{ income_category_id: String(income.income_category_id || ""), topic_name: "", amount: String(income.amount), remarks: income.remarks || "" }],
            });
            const methods = (income.payment_method || "Cash")
                .split(",")
                .map(m => m.trim())
                .filter(Boolean);
            setPaymentMethods(methods.length > 0 ? methods : ["Cash"]);
        } else {
            setForm(getDefaultForm());
            setPaymentMethods(["Cash"]);
        }
        setErrors({});
        fetchSettings();
        fetchCategories();
        fetchInstructors();
    }, [income, isOpen, fetchSettings, fetchCategories, fetchInstructors]);

    // Handle automatically calculating change return
    const subtotal = form.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    const discount = Number(form.discount || 0);
    const netTotal = Math.max(0, subtotal - discount);

    useEffect(() => {
        const rec = Number(form.received_amount || 0);
        if (!isNaN(rec) && rec > netTotal) {
            handleChange("return_amount", String(rec - netTotal));
        } else {
            handleChange("return_amount", "0");
        }
    }, [form.received_amount, form.items, form.discount]);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            setCategoryLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ name: newCategoryName.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Category added");
                setCategories((prev) => [...prev, data.data]);
                setNewCategoryName("");
                setIsAddingCategory(false);
            } else {
                let errorMessage = "Failed to add category";
                if (data.errors) {
                    const firstError = Object.values(data.errors).flat()[0] as string;
                    errorMessage = firstError || data.message || errorMessage;
                } else {
                    errorMessage = data.message || errorMessage;
                }
                toast.error(errorMessage);
            }
        } catch {
            toast.error("Error adding category");
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleA4Print = useReactToPrint({
        contentRef: printRefA4,
        documentTitle: `Income_A4_${income?.id ?? "new"}`,
        pageStyle: "@page { size: auto; margin: 0; }",
    });

    const handleThermalPrint = useReactToPrint({
        contentRef: printRefThermal,
        documentTitle: `Income_Thermal_${income?.id ?? "new"}`,
        pageStyle: "@page { size: 80mm auto; margin: 0; }",
    });

    if (!isOpen) return null;

    const handleChange = <K extends keyof CompanyIncome>(key: K, value: CompanyIncome[K]) => {
        if (key === "amount" && typeof value === "string") {
            const val = (value as string).replace(/[^0-9.]/g, "");
            setForm((prev) => ({ ...prev, [key]: val }));
        } else {
            setForm((prev) => ({ ...prev, [key]: value }));
        }
        if (errors[key as string]) {
            setErrors((prev) => { const n = { ...prev }; delete n[key as string]; return n; });
        }
    };

    const handleDateChange = (val: string) => {
        const bs = getBsDateParts(val);
        setForm((prev) => ({
            ...prev,
            income_date: val,
            ...(bs ? { month: bs.month, year: bs.year } : {}),
        }));
    };

    const handleSubmit = async () => {
        const invalidItem = form.items?.find(item => 
            (isManualMode ? !item.topic_name : !item.income_category_id) || 
            isNaN(Number(item.amount)) || 
            Number(item.amount) <= 0
        );
        if (invalidItem) {
            toast.error(isManualMode ? "Please fill in valid billing topics and amounts for all items" : "Please fill in valid categories and amounts for all items");
            return;
        }

        try {
            setLoading(true);
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/company-incomes/${income!.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/company-incomes`;

            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    income_date: form.income_date,
                    month: form.month,
                    year: form.year,
                    payment_method: paymentMethods.join(", "),
                    payer_name: form.payer_name || null,
                    payer_phone: form.payer_phone || null,
                    remarks: form.remarks || null,
                    discount: Number(form.discount || 0),
                    received_amount: Number(form.received_amount || 0),
                    return_amount: Number(form.return_amount || 0),
                    bill_number: form.bill_number || null,
                    instructor_id: form.instructor_id || null,
                    commission_percentage: form.commission_percentage !== "" && form.commission_percentage !== null ? Number(form.commission_percentage) : null,
                    commission_amount: form.commission_amount !== "" && form.commission_amount !== null ? Number(form.commission_amount) : null,
                    items: form.items?.map(item => ({
                        income_category_id: isManualMode ? null : item.income_category_id,
                        topic_name: isManualMode ? item.topic_name : null,
                        amount: Number(item.amount),
                        remarks: item.remarks || null,
                    })),
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                if (result.errors) { setErrors(result.errors); return; }
                throw new Error(result.message || "Something went wrong");
            }

            setErrors({});
            toast.success(isEdit ? "Income updated successfully" : "Income recorded successfully");
            onSuccess?.(result.data);
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const period = formatBsMonthYear(form.month, form.year);
    const displayMethods = paymentMethods.join(", ");

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl overflow-visible w-full max-w-2xl mx-auto my-8"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isViewMode ? "Income Receipt" : isEdit ? "Edit Income Record" : "Record New Income"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {isViewMode ? `Receipt ${income?.bill_number || `#INC-${String(income?.id).padStart(4, "0")}`} · ${period}` : isEdit ? `Editing Receipt ${form.bill_number || `#INC-${String(income?.id).padStart(4, "0")}`} · ${period}` : "Enter company income details below"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                {/* View-mode summary */}
                {isViewMode && income && (
                    <div className="px-8 py-6 bg-gray-50 border-b border-gray-200 space-y-6">
                        {/* Table of Items */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 tracking-wider">S.N.</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 tracking-wider">Billing Topic</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 tracking-wider">Description</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-500 tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150">
                                    {form.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-xs text-gray-500 font-bold">{idx + 1}</td>
                                            <td className="px-4 py-3 text-xs text-gray-900 font-black">
                                                {categories.find(c => String(c.id) === String(item.income_category_id))?.name || item.topic_name || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 italic">{item.remarks || "—"}</td>
                                            <td className="px-4 py-3 text-xs text-gray-900 font-black text-right">Rs. {Number(item.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Bill Number</p>
                                <p className="text-sm font-black text-gray-900">{income.bill_number || `INC-${String(income.id).padStart(4, "0")}`}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Subtotal</p>
                                <p className="text-sm font-black text-gray-900">Rs. {subtotal.toLocaleString()}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Discount</p>
                                <p className="text-sm font-black text-amber-600">Rs. {Number(income.discount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm bg-gradient-to-br from-emerald-50/20 to-teal-50/20 border-emerald-100">
                                <p className="text-[10px] font-bold uppercase text-emerald-800 tracking-widest mb-1">Net Bill Amount</p>
                                <p className="text-sm font-black text-emerald-600">Rs. {Number(income.amount).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Date</p>
                                <p className="text-sm font-black text-gray-900">{formatDate(income.income_date)}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Method(s)</p>
                                <p className="text-sm font-black text-gray-900">{displayMethods || "—"}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Amount Received</p>
                                <p className="text-sm font-black text-blue-600">Rs. {Number(income.received_amount || income.amount).toLocaleString()}</p>
                            </div>
                            {Number(income.return_amount) > 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Returned Change</p>
                                    <p className="text-sm font-black text-gray-900">Rs. {Number(income.return_amount).toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        {(income.payer_name || income.payer_phone) && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Payer Details</p>
                                <p className="text-sm font-black text-gray-900">
                                    {income.payer_name || "—"}
                                    {income.payer_phone && <span className="text-xs text-gray-500 font-semibold ml-2">({income.payer_phone})</span>}
                                </p>
                            </div>
                        )}
                        {(income.instructor || income.instructor_id) && (
                            <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest mb-0.5">Assigned Instructor</p>
                                    <p className="text-sm font-black text-gray-900">{income.instructor?.name || `Instructor #${income.instructor_id}`}</p>
                                </div>
                                {income.commission_percentage && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest mb-0.5">Commission ({income.commission_percentage}%)</p>
                                        <p className="text-sm font-black text-emerald-700">Rs. {Number(income.commission_amount || 0).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {income.remarks && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 mb-0">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Remarks</p>
                                <p className="text-sm text-gray-700 italic">{income.remarks}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit/Create Form */}
                {!isViewMode && (
                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            
                            {/* Date */}
                            <div>
                                <FieldLabel label="Billing Date" required />
                                <NepaliDateInput
                                    value={form.income_date}
                                    onChange={handleDateChange}
                                    placeholder="Select date"
                                />
                                <ErrorMessage message={errors.income_date?.[0]} />
                            </div>

                            {/* Dynamic Items Section */}
                            <div className="md:col-span-2 border-t border-gray-150 pt-4 mt-2">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">Billing Items / Topics</p>
                                    <div className="flex gap-2">
                                        {!isAddingCategory && (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCategory(true)}
                                                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm"
                                            >
                                                <Plus className="size-3" /> Add Category
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm(prev => ({
                                                    ...prev,
                                                    items: [...(prev.items || []), { income_category_id: "", amount: "", remarks: "" }]
                                                }));
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-lg shadow-sm font-bold"
                                        >
                                            <Plus className="size-3" /> Add Item/Topic
                                        </button>
                                    </div>
                                </div>

                                {isAddingCategory && (
                                    <div className="flex gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-in slide-in-from-top-1 duration-200">
                                        <Input
                                            autoFocus
                                            placeholder="Enter new category name..."
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            className="h-10"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={categoryLoading}
                                            className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 shadow-sm"
                                        >
                                            {categoryLoading ? <Spinner size="sm" /> : "Add"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}
                                            className="h-10 border-gray-300 shadow-sm"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {form.items?.map((item, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50/50 border border-gray-150 rounded-xl items-start sm:items-center relative group">
                                            {/* Category dropdown or topic text input */}
                                            <div className="flex-1 w-full">
                                                {isManualMode ? (
                                                    <>
                                                        <Input
                                                            type="text"
                                                            list="billing-categories-datalist"
                                                            value={item.topic_name || ""}
                                                            placeholder="Enter Billing Topic (e.g. Hall Charges)"
                                                            onChange={(e) => {
                                                                const nextItems = [...(form.items || [])];
                                                                nextItems[idx].topic_name = e.target.value;
                                                                setForm(prev => ({ ...prev, items: nextItems }));
                                                            }}
                                                            className="h-10 text-sm font-semibold"
                                                        />
                                                        <datalist id="billing-categories-datalist">
                                                            {categories.map((c) => (
                                                                <option key={c.id} value={c.name} />
                                                            ))}
                                                        </datalist>
                                                    </>
                                                ) : (
                                                    <CustomSelect
                                                        value={item.income_category_id}
                                                        onChange={(val) => {
                                                            const nextItems = [...(form.items || [])];
                                                            nextItems[idx].income_category_id = val;
                                                            setForm(prev => ({ ...prev, items: nextItems }));
                                                        }}
                                                        options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                                                        placeholder="Select Topic / Topic category"
                                                        className="h-10"
                                                    />
                                                )}
                                            </div>

                                            {/* Item Amount */}
                                            <div className="relative w-full sm:w-36">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Rs.</span>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={item.amount}
                                                    placeholder="Amount"
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, "");
                                                        const nextItems = [...(form.items || [])];
                                                        nextItems[idx].amount = val;
                                                        setForm(prev => ({ ...prev, items: nextItems }));
                                                    }}
                                                    className="pl-8 h-10 text-sm font-semibold"
                                                />
                                            </div>

                                            {/* Item Remarks / Description */}
                                            <div className="flex-1 w-full">
                                                <Input
                                                    type="text"
                                                    value={item.remarks || ""}
                                                    placeholder="Remarks/notes for this item"
                                                    onChange={(e) => {
                                                        const nextItems = [...(form.items || [])];
                                                        nextItems[idx].remarks = e.target.value;
                                                        setForm(prev => ({ ...prev, items: nextItems }));
                                                    }}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Remove button */}
                                            {form.items && form.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextItems = form.items?.filter((_, i) => i !== idx) || [];
                                                        setForm(prev => ({ ...prev, items: nextItems }));
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-1 sm:mt-0 transition-colors"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Discount */}
                            <div>
                                <FieldLabel label="Discount (Rs.)" />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.discount || "0"}
                                        onChange={(e) => handleChange("discount", e.target.value.replace(/[^0-9.]/g, ""))}
                                        className="pl-10 h-11"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Multi-Select Payment Methods */}
                            <div>
                                <FieldLabel label="Payment Method(s)" />
                                <MethodDropdown
                                    value={paymentMethods}
                                    onChange={setPaymentMethods}
                                />
                            </div>

                            {/* Cash Received */}
                            <div>
                                <FieldLabel label="Amount Received (Cash)" />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.received_amount || ""}
                                        onChange={(e) => handleChange("received_amount", e.target.value.replace(/[^0-9.]/g, ""))}
                                        className="pl-10 h-11"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Return amount */}
                            <div>
                                <FieldLabel label="Return Amount (Change)" />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                                    <Input
                                        type="text"
                                        disabled
                                        value={form.return_amount || "0"}
                                        className="pl-10 h-11 bg-gray-50 border-gray-200 text-gray-500 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Period */}
                            <div>
                                <FieldLabel label="Billing Period (BS)" required />
                                <div className="grid grid-cols-2 gap-2">
                                    <CustomSelect
                                        value={form.month.toString()}
                                        onChange={(val) => handleChange("month", Number(val))}
                                        options={NEPALI_MONTH_OPTIONS}
                                    />
                                    <CustomSelect
                                        value={form.year.toString()}
                                        onChange={(val) => handleChange("year", Number(val))}
                                        options={yearOptions}
                                    />
                                </div>
                            </div>

                            {/* Instructor Selection & Teacher Commission */}
                            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Assign Instructor & Commission</p>
                                    <span className="text-[10px] text-slate-400 font-medium">Optional instructor commission for this bill</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel label="Select Instructor" />
                                        <CustomSelect
                                            value={form.instructor_id?.toString() || ""}
                                            onChange={(val) => {
                                                handleChange("instructor_id", val);
                                                if (!val) {
                                                    handleChange("commission_percentage", "");
                                                    handleChange("commission_amount", "");
                                                }
                                            }}
                                            options={[
                                                { value: "", label: "No Instructor (None)" },
                                                ...instructors.map((inst) => ({
                                                    value: inst.id.toString(),
                                                    label: inst.name,
                                                })),
                                            ]}
                                            placeholder="Select Instructor"
                                        />
                                    </div>

                                    {form.instructor_id && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <FieldLabel label="Teacher Commission %" />
                                                {netTotal > 0 && form.commission_percentage && (
                                                    <span className="text-[10px] font-bold text-emerald-600">
                                                        Rs. {((netTotal * Number(form.commission_percentage)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative flex items-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="e.g. 10, 20, 50"
                                                    value={form.commission_percentage || ""}
                                                    onChange={(e) => {
                                                        const pct = e.target.value;
                                                        handleChange("commission_percentage", pct);
                                                        if (pct !== "") {
                                                            const calculatedComm = ((netTotal * Number(pct)) / 100).toFixed(2);
                                                            handleChange("commission_amount", calculatedComm);
                                                        } else {
                                                            handleChange("commission_amount", "");
                                                        }
                                                    }}
                                                    className="pr-8 h-10 text-sm font-semibold"
                                                />
                                                <span className="absolute right-3 text-xs font-bold text-gray-400 pointer-events-none">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payer Name */}
                            <div>
                                <FieldLabel label="Received From (Payer Name)" />
                                <Input
                                    value={form.payer_name || ""}
                                    onChange={(e) => handleChange("payer_name", e.target.value)}
                                    placeholder="Payer name"
                                    className="h-11"
                                />
                            </div>

                            {/* Payer Phone */}
                            <div>
                                <FieldLabel label="Payer Phone Number" />
                                <Input
                                    value={form.payer_phone || ""}
                                    onChange={(e) => handleChange("payer_phone", e.target.value)}
                                    placeholder="Payer phone number"
                                    className="h-11"
                                />
                            </div>

                            {/* Summary Totals Box */}
                            <div className="md:col-span-2 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col gap-2">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                    <span>Subtotal Amount:</span>
                                    <span>Rs. {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                    <span>Discount Applied:</span>
                                    <span>Rs. {discount.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-emerald-100/50 my-1"></div>
                                <div className="flex justify-between text-base font-black text-emerald-800">
                                    <span>NET BILL TOTAL:</span>
                                    <span>Rs. {netTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="md:col-span-2">
                                <FieldLabel label="Remarks / Notes" />
                                <Textarea
                                    value={form.remarks || ""}
                                    onChange={(e) => handleChange("remarks", e.target.value)}
                                    placeholder="Add any additional details..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-between items-center gap-3 rounded-b-2xl">
                    {isViewMode ? (
                        <>
                            <div className="flex gap-2">
                                <button onClick={handleA4Print} className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-sm">
                                    A4 Receipt
                                </button>
                                <button onClick={handleThermalPrint} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-700 cursor-pointer flex items-center gap-2">
                                    <Printer className="w-4 h-4" /> Thermal
                                </button>
                            </div>
                            <Button onClick={onClose} className="bg-gray-800 text-white px-8 h-11 font-medium">Close</Button>
                        </>
                    ) : (
                        <div className="flex flex-1 justify-end gap-3">
                            <Button variant="outline" onClick={onClose} className="px-6 h-11 border-gray-300 cursor-pointer">Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer px-8 h-11 font-medium shadow-sm"
                            >
                                {loading ? (
                                    <Spinner size="sm" className="mr-2" />
                                ) : (
                                    <Save className="size-4 mr-2 cursor-pointer" />
                                )}

                                {isEdit ? "Update Income" : "Record Income"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Print Area */}
            {isViewMode && income && (() => {
                const printableItems = (income.items && income.items.length > 0)
                    ? income.items
                    : form.items?.map(it => {
                        const cat = categories.find(c => String(c.id) === String(it.income_category_id));
                        return {
                            ...it,
                            category: cat ? { id: cat.id, name: cat.name } : null
                        };
                    }) || [];
                
                return (
                    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                        <div ref={printRefThermal} className="income-thermal-wrapper">
                            <IncomeThermalBill income={{ ...income, items: printableItems, payment_method: displayMethods }} settings={settings} />
                            <IncomeThermalBill income={{ ...income, items: printableItems, payment_method: displayMethods }} settings={settings} />
                        </div>
                        <IncomeA4Bill ref={printRefA4} income={{ ...income, items: printableItems, payment_method: displayMethods }} settings={settings} />
                    </div>
                );
            })()}
        </div>
    );
};

export default CompanyIncomeModal;
