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

export interface CompanyIncome {
    id?: number;
    income_category_id: string;
    category?: { name: string; id: number };
    amount: string;
    income_date: string;
    month: number;
    year: number;
    payment_method?: string; // Will be stored as comma separated string
    payer_name?: string;
    remarks?: string;
}

interface IncomeCategory {
    id: number;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    income?: CompanyIncome | null;
    isViewMode?: boolean;
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
        amount: "",
        income_date: today,
        month: bs.month,
        year: bs.year,
        payment_method: "Cash",
        payer_name: "",
        remarks: "",
    };
}

const CompanyIncomeModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSuccess,
    income,
    isViewMode = false,
}) => {
    const isEdit = !!income?.id;
    const currentBs = getBsDateParts(new Date()) || { month: 1, year: 2081 };

    const [form, setForm] = useState<CompanyIncome>(getDefaultForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [settings, setSettings] = useState<any>(null);

    const [categories, setCategories] = useState<IncomeCategory[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryLoading, setCategoryLoading] = useState(false);

    // Multi-select payment methods
    const [paymentMethods, setPaymentMethods] = useState<string[]>(["Cash"]);

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
                income_category_id: String(income.income_category_id)
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
    }, [income, isOpen, fetchSettings, fetchCategories]);

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
                setForm((prev) => ({ ...prev, income_category_id: String(data.data.id) }));
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
    });

    const handleThermalPrint = useReactToPrint({
        contentRef: printRefThermal,
        documentTitle: `Income_Thermal_${income?.id ?? "new"}`,
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
        const parsedAmount = Number(form.amount);
        if (!form.income_category_id) {
            setErrors((prev) => ({ ...prev, income_category_id: ["Income category is required"] }));
            toast.error("Please select an income category");
            return;
        }
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setErrors((prev) => ({ ...prev, amount: ["Amount must be greater than zero"] }));
            toast.error("Please enter a valid positive amount");
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
                    income_category_id: form.income_category_id,
                    amount: form.amount,
                    income_date: form.income_date,
                    month: form.month,
                    year: form.year,
                    payment_method: paymentMethods.join(", "),
                    payer_name: form.payer_name || null,
                    remarks: form.remarks || null,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                if (result.errors) { setErrors(result.errors); return; }
                throw new Error(result.message || "Something went wrong");
            }

            setErrors({});
            toast.success(isEdit ? "Income updated successfully" : "Income recorded successfully");
            onSuccess?.();
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const period = formatBsMonthYear(form.month, form.year);
    const selectedCategoryName = categories.find(c => String(c.id) === String(form.income_category_id))?.name || income?.category?.name || "—";
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
                                {isViewMode ? `Receipt #INC-${String(income?.id).padStart(4, "0")} · ${period}` : "Enter company income details below"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                {/* View-mode summary */}
                {isViewMode && income && (
                    <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Category</p>
                                <p className="text-sm font-black text-gray-900">{selectedCategoryName}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Amount</p>
                                <p className="text-sm font-black text-emerald-600">Rs. {Number(income.amount).toLocaleString()}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Period</p>
                                <p className="text-sm font-black text-gray-900">{period}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Date</p>
                                <p className="text-sm font-black text-gray-900">{formatDate(income.income_date)}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Method(s)</p>
                                <p className="text-sm font-black text-gray-900">{displayMethods || "—"}</p>
                            </div>
                            {income.payer_name && (
                                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Payer</p>
                                    <p className="text-sm font-black text-gray-900">{income.payer_name}</p>
                                </div>
                            )}
                        </div>
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
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Category Dropdown */}
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                    <FieldLabel label="Income Category" required />
                                    {!isAddingCategory && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory(true)}
                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="size-3" /> New Category
                                        </button>
                                    )}
                                </div>

                                {isAddingCategory ? (
                                    <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                                        <Input
                                            autoFocus
                                            placeholder="Enter new category name..."
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            className="h-11"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={categoryLoading}
                                            className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 shadow-sm"
                                        >
                                            {categoryLoading ? <Spinner size="sm" /> : "Add"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}
                                            className="h-11 border-gray-300 shadow-sm"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <CustomSelect
                                        value={form.income_category_id}
                                        onChange={(val) => handleChange("income_category_id", val)}
                                        options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                                        placeholder="Select an income category"
                                        className="h-11"
                                    />
                                )}
                                <ErrorMessage message={errors.income_category_id?.[0]} />
                            </div>

                            {/* Amount */}
                            <div>
                                <FieldLabel label="Amount Received" required />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.amount}
                                        onChange={(e) => handleChange("amount", e.target.value)}
                                        className="pl-10 h-11"
                                        placeholder="0.00"
                                    />
                                </div>
                                <ErrorMessage message={errors.amount?.[0]} />
                            </div>

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

                            {/* Multi-Select Payment Methods */}
                            <div>
                                <FieldLabel label="Payment Method(s)" />
                                <MethodDropdown
                                    value={paymentMethods}
                                    onChange={setPaymentMethods}
                                />
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

                            {/* Payer */}
                            <div className="md:col-span-2">
                                <FieldLabel label="Received From (Payer Name)" />
                                <Input
                                    value={form.payer_name || ""}
                                    onChange={(e) => handleChange("payer_name", e.target.value)}
                                    placeholder="Name of person or organization who paid"
                                    className="h-11"
                                />
                            </div>

                            {/* Remarks */}
                            <div className="md:col-span-2">
                                <FieldLabel label="Remarks / Notes" />
                                <Textarea
                                    value={form.remarks || ""}
                                    onChange={(e) => handleChange("remarks", e.target.value)}
                                    placeholder="Add any additional details..."
                                    rows={3}
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
            {isViewMode && income && (
                <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                    <div ref={printRefThermal} className="income-thermal-wrapper">
                        <IncomeThermalBill income={{ ...income, category: { name: selectedCategoryName }, payment_method: displayMethods }} settings={settings} />
                        <IncomeThermalBill income={{ ...income, category: { name: selectedCategoryName }, payment_method: displayMethods }} settings={settings} />
                    </div>
                    <IncomeA4Bill ref={printRefA4} income={{ ...income, category: { name: selectedCategoryName }, payment_method: displayMethods }} settings={settings} />
                </div>
            )}
        </div>
    );
};

export default CompanyIncomeModal;
