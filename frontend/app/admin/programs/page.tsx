"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, BookOpen, Clock, Eye, Edit2, Trash2, X } from "lucide-react";
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
import { ProgramForm } from "@/components/admin/program/programform";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Portal } from "@/components/global/Portal";

interface Schedule {
  id?: number;
  instructor_id: number;
  start_time: string;
  end_time: string;
}

interface SubProgram {
  id?: number;
  title: string;
  description?: string;
  program_fee: number;
  schedules: Schedule[];
}

interface Program {
  id: string;
  image: string | null;
  title: string;
  schedules: Schedule[];
  is_active: boolean;
  program_fee: number;
  admission_fee: number;
  sub_programs?: SubProgram[];
}

interface Column {
  key: string;
  label: string;
}

const ProgramsPage = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const getImageUrl = useCallback((path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  }, [IMAGE_BASE]);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const columns: Column[] = [
    { key: "sn", label: "S.N." },
    { key: "image", label: "Image" },
    { key: "title", label: "Program Name" },
    { key: "fees_display", label: "Monthly Fee" },
    { key: "sub_count", label: "Sub Programs" },
    { key: "schedule_count", label: "Schedules" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const fetchPrograms = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/programs?page=${page}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to fetch programs");

      const data = result.data?.data || result.data || [];
      if (data.length === 0 && page > 1) {
        fetchPrograms(page - 1);
        return;
      }

      setPrograms(data);

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
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const filteredPrograms = programs.filter((p: Program) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === "all" ||
      (statusFilter === "active" && p.is_active) ||
      (statusFilter === "inactive" && !p.is_active))
  );

  const handleView = useCallback((program: Program) => {
    setEditingProgram(program);
    setIsViewMode(true);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((program: Program) => {
    setEditingProgram(program);
    setIsViewMode(false);
    setFormModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((program: Program) => {
    setSelectedProgram(program);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!selectedProgram) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/programs/${selectedProgram.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Program deleted successfully");
      fetchPrograms(pagination.currentPage);
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setSelectedProgram(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all";

  // Render loading state
  if (loading && programs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your course catalog and schedules</p>
            </div>
            <button
              onClick={() => {
                setEditingProgram(null);
                setIsViewMode(false);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Program</span>
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Programs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{programs.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm text-gray-500">Active Programs</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {programs.filter(p => p.is_active).length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Sub-Programs</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {programs.reduce((acc, p) => acc + (p.sub_programs?.length || 0), 0)}
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {columns.map((column) => (
                      <TableHead key={column.key} className="font-semibold text-gray-700">
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500">No programs found</p>
                          {(searchTerm || statusFilter !== "all") && (
                            <button
                              onClick={clearFilters}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrograms.map((program, index) => {
                      const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                      return (
                        <TableRow key={program.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{sn}</TableCell>
                          <TableCell>
                            {program.image ? (
                              <img
                                src={getImageUrl(program.image) || ''}
                                alt={program.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{program.title}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-gray-900">Rs. {program.program_fee?.toLocaleString() || 0}</p>
                              <p className="text-xs text-gray-500">per month</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{program.sub_programs?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {(program.sub_programs?.length || 0) > 0 
                                 ? (program.sub_programs?.reduce((acc, sp) => acc + (sp.schedules?.length || 0), 0) || 0)
                                 : (program.schedules?.length || 0)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${program.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-50 text-gray-600'
                              }`}>
                              {program.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleView(program)}
                                className="p-1.5 text-blue-600 transition-colors cursor-pointer"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(program)}
                                className="p-1.5 text-green-600 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(program)}
                                className="p-1.5 text-red-600 transition-colors cursor-pointer"
                                title="Delete"
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

            {filteredPrograms.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  itemsPerPage={pagination.itemsPerPage}
                  onPageChange={(page) => fetchPrograms(page)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Form Modal */}
      <Portal>
        <AnimatePresence>
          {formModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) setFormModalOpen(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-6xl max-h-[98vh] overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <ProgramForm
                  initialData={editingProgram}
                  isViewMode={isViewMode}
                  onSuccess={() => {
                    setFormModalOpen(false);
                    fetchPrograms();
                  }}
                  onCancel={() => setFormModalOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Program"
        description="Are you sure you want to delete this program? This action cannot be undone and will remove all associated schedules and sub-programs."
      />

      <Toaster richColors position="top-right" />
    </>
  );
};

export default ProgramsPage;