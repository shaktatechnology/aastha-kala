"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    X, Plus, Edit2, Trash2, Save, AlertCircle, List
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";

interface IncomeCategory {
    id: number;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const IncomeCategoryManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [categories, setCategories] = useState<IncomeCategory[]>([]);
    const [loading, setLoading] = useState(false);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [categoryName, setCategoryName] = useState("");
    const [saving, setSaving] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch {
            toast.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchCategories();
    }, [isOpen, fetchCategories]);

    const handleEdit = (cat: IncomeCategory) => {
        setEditingId(cat.id);
        setCategoryName(cat.name);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setCategoryName("");
    };

    const handleSubmit = async () => {
        if (!categoryName.trim()) return;
        try {
            setSaving(true);
            const isEdit = !!editingId;
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories`;

            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ name: categoryName.trim() }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(isEdit ? "Category updated" : "Category added");
                fetchCategories();
                handleCancel();
            } else {
                let errorMessage = "Failed to save category";
                if (data.errors) {
                    const firstError = Object.values(data.errors).flat()[0] as string;
                    errorMessage = firstError || data.message || errorMessage;
                } else {
                    errorMessage = data.message || errorMessage;
                }
                toast.error(errorMessage);
            }
        } catch {
            toast.error("Error saving category");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (cat: IncomeCategory) => {
        setSelectedCategory(cat);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCategory) return;
        setDeleting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/income-categories/${selectedCategory.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Category deleted");
                fetchCategories();
                setDeleteModalOpen(false);
            } else {
                toast.error(data.message || "Failed to delete category");
            }
        } catch {
            toast.error("Error deleting category");
        } finally {
            setDeleting(false);
            setSelectedCategory(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-xl animate-in zoom-in duration-200"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <List className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-bold text-gray-900">Manage Income Categories</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Action Row */}
                    {!isAdding && !editingId && (
                        <div className="mb-6 flex justify-end">
                            <Button
                                onClick={() => setIsAdding(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 h-9 px-4 text-xs font-bold uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add New
                            </Button>
                        </div>
                    )}

                    {/* Form */}
                    {(isAdding || editingId) && (
                        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in slide-in-from-top-1">
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">
                                {editingId ? "Edit Category Name" : "Create New Category"}
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    autoFocus
                                    placeholder="Category Name..."
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    className="h-10 bg-white"
                                />
                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving || !categoryName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4"
                                >
                                    {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="h-10 px-3 bg-white border-gray-300"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto custom-scrollbar shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="w-12 py-2">#</TableHead>
                                    <TableHead className="py-2">Category Name</TableHead>
                                    <TableHead className="text-right py-2">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8">
                                            <Spinner className="mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs italic">
                                            No categories found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((cat, i) => (
                                        <TableRow key={cat.id} className="hover:bg-gray-50/50 transition-colors h-11">
                                            <TableCell className="text-gray-400 text-xs font-medium py-2">{i + 1}</TableCell>
                                            <TableCell className="font-bold text-gray-800 text-sm py-2">{cat.name}</TableCell>
                                            <TableCell className="text-right py-2">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button
                                                        onClick={() => handleEdit(cat)}
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(cat)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <Button onClick={onClose} className="bg-gray-800 text-white h-9 px-6 text-xs font-bold uppercase tracking-widest">
                        Close
                    </Button>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Delete Category"
                description={`Delete "${selectedCategory?.name}"? Action only possible if NO records linked.`}
            />
        </div>
    );
};

export default IncomeCategoryManagementModal;
