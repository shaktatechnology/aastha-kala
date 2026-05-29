"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Pencil, Banknote, Calendar, Tag, CreditCard, FileText, Image as ImageIcon, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatDate } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { NepaliDateInput } from '@/components/ui/NepaliDateInput';

interface Expense {
  id?: number;
  title: string;
  amount: string;
  expense_date: string;
  category?: string;
  payment_method?: string;
  remarks?: string;
  receipt_image?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  expense?: Expense | null;
}

const CATEGORIES = [
  { value: 'rent_utilities', label: 'Rent & Utilities' },
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'maintenance', label: 'Studio Maintenance' },
  { value: 'costumes', label: 'Costumes & Apparel' },
  { value: 'equipment', label: 'Props & Equipment' },
  { value: 'marketing', label: 'Marketing & Ads' },
  { value: 'events', label: 'Events & Workshops' },
  { value: 'other', label: 'Miscellaneous' }
];

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

const ExpenseAddEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  expense,
}) => {
  const isEdit = !!expense;

  const [form, setForm] = useState<Expense>({
    title: "",
    amount: "",
    expense_date: new Date().toLocaleDateString('en-CA'),
    category: "other",
    payment_method: "Cash",
    remarks: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (expense) {
      setForm({ ...expense });
      if (expense.receipt_image) {
        const imageUrl = expense.receipt_image.startsWith("http")
          ? expense.receipt_image
          : `${process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/$/, "")}/${expense.receipt_image}`;
        setPreview(imageUrl);
      } else {
        setPreview(null);
      }
      setImage(null);
      setErrors({});
    } else {
      setForm({
        title: "",
        amount: "",
        expense_date: new Date().toLocaleDateString('en-CA'),
        category: "other",
        payment_method: "Cash",
        remarks: "",
      });
      setPreview(null);
      setImage(null);
      setErrors({});
    }
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Expense, value: any) => {
    if (key === "amount" && typeof value === "string") {
      // Prevent negative values from being typed
      const val = value.replace(/[^0-9.]/g, '');
      setForm((prev) => ({
        ...prev,
        [key]: val,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }

    if (errors[key as string]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key as string];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      setErrors(prev => ({ ...prev, amount: ["Amount must be greater than zero"] }));
      return;
    }

    try {
      setLoading(true);

      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${expense?.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/expenses`;

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("amount", form.amount);
      formData.append("expense_date", form.expense_date);
      formData.append("category", form.category || "");
      formData.append("payment_method", form.payment_method || "");
      formData.append("remarks", form.remarks || "");

      if (image) {
        formData.append("receipt_image", image);
      }

      if (isEdit) {
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setErrors(result.errors);
          return;
        }
        throw new Error(result.message || "Something went wrong");
      }

      setErrors({});
      toast.success(isEdit ? "Expense updated successfully" : "Expense added successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl overflow-visible w-full max-w-2xl mx-auto my-8"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Expense Record' : 'Record New Expense'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Enter the expense details below</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <FieldLabel label="Expense Title" required />
              <Input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g. Studio Rent, Electricity Bill, New Equipment"
                className="h-11"
              />
              <ErrorMessage message={errors.title?.[0]} />
            </div>

            <div>
              <FieldLabel label="Amount Paid" required />
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

            <div>
              <FieldLabel label="Expense Date" required />
              <NepaliDateInput
                value={form.expense_date}
                onChange={(val) => handleChange("expense_date", val)}
              />
              {form.expense_date && (
                <p className="text-[10px] text-gray-500 mt-1 px-1">
                  Selected: <span className="font-semibold text-gray-700">{formatDate(form.expense_date)}</span>
                </p>
              )}
              <ErrorMessage message={errors.expense_date?.[0]} />
            </div>

            <div>
              <FieldLabel label="Category" required />
              <CustomSelect
                value={form.category || ""}
                onChange={(val) => handleChange("category", val)}
                options={CATEGORIES}
                placeholder="Select category"
              />
              <ErrorMessage message={errors.category?.[0]} />
            </div>

            <div>
              <FieldLabel label="Payment Method" />
              <Input
                value={form.payment_method || ""}
                onChange={(e) => handleChange("payment_method", e.target.value)}
                placeholder="Cash, Bank, etc."
                className="h-11"
              />
              <ErrorMessage message={errors.payment_method?.[0]} />
            </div>

            <div className="md:col-span-2">
              <FieldLabel label="Remarks / Notes" />
              <Textarea
                value={form.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
              />
              <ErrorMessage message={errors.remarks?.[0]} />
            </div>

            {/* Receipt Image */}
            <div className="md:col-span-2">
              <FieldLabel label="Receipt Image" />
              <div className="flex items-start gap-4">
                <div className="size-24 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 relative group">
                  {preview ? (
                    <img src={preview} alt="Receipt preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-gray-300" />
                  )}
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                    <input type="file" hidden onChange={handleImageChange} accept="image/*" />
                    <span className="text-[10px] text-white font-bold bg-primary/80 px-2 py-1 rounded">Change</span>
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2">
                    Upload a photo of the receipt or invoice (Max 5MB).
                  </p>
                  {preview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setImage(null);
                      }}
                      className="text-[10px] text-red-500 font-bold uppercase hover:underline"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-6 h-11 text-black bg-white border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-8 h-11 text-base font-medium shadow-sm"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                {isEdit ? 'Update Expense' : 'Save Expense'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAddEditModal;
