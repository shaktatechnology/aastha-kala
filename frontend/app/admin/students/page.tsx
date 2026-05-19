"use client";

import React, { useEffect, useState } from "react";
import { Search, Plus, User, Phone, MapPin, GraduationCap, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import Table from "@/components/layout/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import toast from "react-hot-toast";
import { Pagination } from "@/components/global/Pagination";
import StudentAddEditModal from "@/components/admin/StudentAddEditModal";
import StudentViewModal from "@/components/admin/StudentViewModal";
import ProgramManagementView from "@/components/admin/ProgramManagementView";

interface Student {
  id: number;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  address?: string;
  status: "active" | "inactive" | "graduated";
  image?: string;
  image_url?: string;
  gender?: string;
  classes?: string;
}

const StudentPage = () => {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "graduated">("all");
    const [viewMode, setViewMode] = useState<"students" | "programs">("students");
  
    // Local filter state buffers
    const [searchInput, setSearchInput] = useState("");
    const [statusInput, setStatusInput] = useState<"all" | "active" | "inactive" | "graduated">("all");

    const handleApplyFilters = () => {
      setSearchTerm(searchInput);
      setStatusFilter(statusInput);
    };

    const handleClearFilters = () => {
      setSearchInput("");
      setStatusInput("all");
      setSearchTerm("");
      setStatusFilter("all");
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
  
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [deleting, setDeleting] = useState(false);
  
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewStudent, setViewStudent] = useState<Student | null>(null);
  
    const columns = [
      { key: "sn", label: "SN" },
      { key: "image", label: "Photo" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
    ];
  
    const fetchStudents = async (page: number = 1) => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/students?page=${page}&search=${searchTerm}&status=${statusFilter === 'all' ? '' : statusFilter}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
  
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Failed to fetch students");
  
        setStudents(result.data.data);
        setPagination({
          currentPage: result.data.current_page,
          totalPages: result.data.last_page,
          totalItems: result.data.total,
          itemsPerPage: result.data.per_page,
        });
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      setLoading(true);
      fetchStudents();
    }, [searchTerm, statusFilter]);
  
    const formattedData = React.useMemo(() => students.map((student, index) => ({
      ...student,
      sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,
      image: student.image_url ? (
        <div className="relative group/img">
          <img src={student.image_url} alt={student.name} className="w-12 h-12 object-cover rounded-xl ring-2 ring-border group-hover/img:ring-primary transition-all duration-300 shadow-sm" />
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl" />
        </div>
      ) : (
        <div className="w-12 h-12 flex items-center justify-center bg-primary/5 rounded-xl border border-border shadow-inner">
          <User className="w-6 h-6 text-primary/40" />
        </div>
      ),
      status: (
        <div className="flex">
          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
            student.status === 'active' ? 'bg-success/10 text-success border-success/20 shadow-sm shadow-success/10' : 
            student.status === 'inactive' ? 'bg-error/10 text-error border-error/20 shadow-sm shadow-error/10' : 
            'bg-info/10 text-info border-info/20 shadow-sm shadow-info/10'
          }`}>
            {student.status}
          </span>
        </div>
      ),
    })), [students, pagination.currentPage, pagination.itemsPerPage]);
  
    const handleEdit = (row: any) => {
      const original = students.find(s => s.id === row.id);
      setEditingStudent(original || row);
      setFormModalOpen(true);
    };
  
    const handleView = (row: any) => {
      const original = students.find(s => s.id === row.id);
      setViewStudent(original || row);
      setViewModalOpen(true);
    };
  
    const handleDeleteClick = (row: any) => {
      const original = students.find(s => s.id === row.id);
      setSelectedStudent(original || row);
      setDeleteModalOpen(true);
    };
  
    const confirmDelete = async () => {
      if (!selectedStudent) return;
      setDeleting(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/students/${selectedStudent.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Student deleted successfully");

          // If this was the last item on the page → go to previous page
          const isLastItemOnPage = students.length === 1;

          if (isLastItemOnPage && pagination.currentPage > 1) {
            fetchStudents(pagination.currentPage - 1);
          } else {
            fetchStudents(pagination.currentPage);
          }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setDeleting(false);
        setDeleteModalOpen(false);
      }
    };
  
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <header className="flex flex-col lg:flex-row justify-between items-center p-6 bg-surface border border-border rounded-xl gap-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
          
          <div className="relative z-10 flex flex-col items-center lg:items-start w-full lg:w-auto">
            <h1 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight">
              Student Management
            </h1>
            
            <div className="flex bg-background border border-border p-1 rounded-lg mt-3 w-fit shadow-sm">
                <button 
                    onClick={() => setViewMode("students")}
                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === "students" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
                >Student List</button>
                <button 
                    onClick={() => setViewMode("programs")}
                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === "programs" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
                >Program View</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64 group/search">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm placeholder:text-text-muted"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={statusInput}
                onChange={(e: any) => setStatusInput(e.target.value as any)}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-widest bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="all">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
              </select>
              
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                Apply
              </button>

              {(searchInput !== "" || statusInput !== "all" || searchTerm !== "" || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2 border border-border text-text-muted text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-background/80 transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={() => { setEditingStudent(null); setFormModalOpen(true); }}
                className="flex-1 sm:flex-none px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 transition-all flex gap-2 items-center justify-center text-[10px] font-black uppercase tracking-widest cursor-pointer whitespace-nowrap ml-1"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                <span>Add Student</span>
              </button>
            </div>
          </form>
        </header>
  
        {viewMode === "students" ? (
            <div className="overflow-hidden">
                <Table
                    columns={columns}
                    data={formattedData}
                    loading={loading}
                    actions={["view", "edit", "delete"]}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    customActions={[
                    {
                        icon: <CreditCard className="w-4 h-4" />,
                        label: "Fees & Billing",
                        onClick: (row) => router.push(`/admin/fees?student_id=${row.id}`),
                        color: "text-blue-600"
                    }
                    ]}
                />
                <div className="p-4 border-gray-100">
                    <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    itemsPerPage={pagination.itemsPerPage}
                    onPageChange={(page) => fetchStudents(page)}
                    />
                </div>
            </div>
        ) : (
            <ProgramManagementView 
              searchTerm={searchTerm} 
              statusFilter={statusFilter} 
              onRefresh={() => fetchStudents(pagination.currentPage)} 
            />
        )}

        <StudentAddEditModal
          isOpen={formModalOpen}
          onClose={() => { setFormModalOpen(false); setEditingStudent(null); }}
          student={editingStudent}
          onSuccess={() => {
            if (searchTerm === "" && statusFilter === "all") {
              fetchStudents();
            } else {
              setSearchTerm("");
              setStatusFilter("all");
              // The useEffect will trigger fetchStudents()
            }
          }}
        />

        <StudentViewModal
          isOpen={viewModalOpen}
          onClose={() => { setViewModalOpen(false); setViewStudent(null); }}
          student={viewStudent}
        />

        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Delete Student"
          description={`Are you sure you want to delete "${selectedStudent?.name}"? All records including fees will be lost.`}
        />
      </div>
    );
};

export default StudentPage;
