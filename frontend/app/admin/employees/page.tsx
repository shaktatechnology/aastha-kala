"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, User, Eye, Edit2, Trash2, X, Users, Mail, Phone, MapPin } from "lucide-react";
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
import { EmployeeForm } from "@/components/admin/employee/employeeform";
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'staff' | 'instructor';
  salary_basis: 'salary' | 'percentage' | 'none';
  salary_amount: number | null;
  percentage: number | null;
  status: boolean;
  image: string | null;
  instructor?: any;
}

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "staff" | "instructor">("all");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    staff: 0,
    instructors: 0,
  });

  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const getImageUrl = useCallback((path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${path.replace(/^\/+/, "")}`;
  }, []);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const columns = [
    { key: "sn", label: "S.N." },
    { key: "image", label: "Image" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "salary", label: "Salary Details" },
    { key: "contact", label: "Contact" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const fetchEmployees = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/admin/employees`);
      url.searchParams.append('page', page.toString());
      if (searchTerm) url.searchParams.append('search', searchTerm);
      if (typeFilter !== 'all') url.searchParams.append('type', typeFilter);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "application/json",
        },
      });
      
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(res.ok ? "Invalid response format" : "Server error: Please ensure database migrations are run.");
      }

      const result = await res.json();

      const data = result.data?.data || result.data || [];
      setEmployees(data);

      if (result.data?.last_page) {
        setPagination({
          currentPage: result.data.current_page,
          totalPages: result.data.last_page,
          totalItems: result.data.total,
          itemsPerPage: result.data.per_page,
        });
      }

      setGlobalStats({
        total: result.totalEmployees ?? 0,
        staff: result.totalStaff ?? 0,
        instructors: result.totalInstructor ?? 0,
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchEmployees(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, fetchEmployees]);

  const handleView = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setIsViewMode(true);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setIsViewMode(false);
    setFormModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!selectedEmployee) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/employees/${selectedEmployee.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Employee deleted successfully");
      fetchEmployees(pagination.currentPage);
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setSelectedEmployee(null);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500 mt-1">Manage staff and instructors</p>
          </div>
          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsViewMode(false);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Employee</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{globalStats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Instructors</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {globalStats.instructors}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm text-gray-500">Staff</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {globalStats.staff}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as any)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'staff', label: 'Staff' },
              { value: 'instructor', label: 'Instructor' }
            ]}
            className="w-full sm:w-48"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {columns.map((col) => (
                    <TableHead key={col.key} className="font-semibold text-gray-700">
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No employees found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee, index) => {
                    const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                    return (
                      <TableRow key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">{sn}</TableCell>
                        <TableCell>
                          {employee.image ? (
                            <img
                              src={employee.image.startsWith('http') ? employee.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${employee.image}`}
                              alt={employee.name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-900">{employee.name}</div>
                          {employee.type === 'instructor' && employee.instructor?.title && (
                            <div className="text-xs text-gray-500 font-medium">{employee.instructor.title}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            employee.type === 'instructor' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {employee.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {employee.salary_basis === 'salary' ? (
                            <div>
                              <div className="font-bold text-gray-900">Rs. {Number(employee.salary_amount).toLocaleString()}</div>
                              <div className="text-[10px] text-gray-400 uppercase font-bold">Monthly Salary</div>
                            </div>
                          ) : employee.salary_basis === 'percentage' ? (
                            <div>
                              <div className="font-bold text-blue-600">{employee.percentage}%</div>
                              <div className="text-[10px] text-gray-400 uppercase font-bold">Commission</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 font-medium italic">Unpaid</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail className="w-3 h-3 text-gray-400" />
                                {employee.email}
                              </div>
                            )}
                            {employee.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {employee.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                            employee.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {employee.status ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(employee)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(employee)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(employee)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={(page) => fetchEmployees(page)}
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
            <div className="min-h-screen py-8 px-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-4xl mx-auto"
              >
                <EmployeeForm
                  initialData={editingEmployee}
                  isViewMode={isViewMode}
                  onSuccess={() => {
                    setFormModalOpen(false);
                    fetchEmployees(pagination.currentPage);
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
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This will also remove the associated instructor record if any. This action cannot be undone."
      />
    </div>
  );
};

export default EmployeesPage;
