"use client";

import React, { useEffect, useState } from "react";
import Table from "@/components/layout/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import InstructorModal from "@/components/admin/InstructorModal";
import InstructorViewModal from "@/components/admin/InstructorViewModal";
import { Pagination } from "@/components/global/Pagination";
import { useRouter } from "next/navigation";

interface Instructor {
  id: number;
  name: string;
  title?: string;
  about?: string;
  facebook_url?: string;
  instagram_url?: string;
  email?: string;
  phone?: string;
  image?: string;
  created_at?: string;
}

const Page = () => {
  const router = useRouter();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(
    null,
  );

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingInstructor, setViewingInstructor] = useState<Instructor | null>(
    null,
  );


  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";

    const parts = name.trim().split(" ");
    return parts.length > 1
      ? parts[0].charAt(0) + parts[1].charAt(0)
      : parts[0].charAt(0);
  };

  const columns = [
    { key: "sn", label: "SN" },
    { key: "image", label: "Image" },
    { key: "name", label: "Name" },
    { key: "title", label: "Title" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ];

  const fetchInstructors = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructors?page=${page}&search=${searchTerm}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to fetch instructors");
      }

      const list = result.data?.data || result.data || [];
      
      if (list.length === 0 && page > 1) {
          fetchInstructors(page - 1);
          return;
      }

      setInstructors(list);

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
  };

  useEffect(() => {
    fetchInstructors(1);
  }, [searchTerm]);

  const handleApplyFilters = () => {
    setSearchTerm(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyFilters();
  };

  const formattedData = instructors.map((inst, index) => ({
    ...inst,
    sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,

    image: inst.image ? (
      <div className="relative group">
        <img
          src={getImageUrl(inst.image)}
          alt={inst.name}
          className="w-12 h-12 rounded-xl object-cover ring-2 ring-border group-hover:ring-primary transition-all duration-300 shadow-sm"
        />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
      </div>
    ) : (
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-black uppercase shadow-inner">
        {getInitials(inst.name)}
      </div>
    ),

    about: inst.about ? (
      <span className="text-sm text-text-secondary line-clamp-1 max-w-xs">{inst.about}</span>
    ) : (
      <span className="text-text-muted text-xs italic font-medium">No bio provided</span>
    ),
  }));

  const handleView = (row: any) => {
    const original = instructors.find((i) => i.id === row.id);
    setViewingInstructor(original || null);
    setViewModalOpen(true);
  };

  const handleEdit = (row: any) => {
    const original = instructors.find((i) => i.id === row.id);
    setEditingInstructor(original || null);
    setFormModalOpen(true);
  };


  const handleDeleteClick = (row: any) => {
    const original = instructors.find((i) => i.id === row.id);
    setSelectedInstructor(original || null);
    setDeleteModalOpen(true);
  };



  const confirmDelete = async () => {
    if (!selectedInstructor) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructors/${selectedInstructor.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Delete failed");
      }

      toast.success("Instructor deleted successfully");

      fetchInstructors(pagination.currentPage);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedInstructor(null);
    }
  };

  const actions: ("view" | "edit")[] = ["view", "edit"];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <header className="flex flex-col lg:flex-row justify-between items-center p-6 bg-surface border border-border rounded-xl gap-6 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
        
        <div className="relative z-10 flex flex-col items-center lg:items-start w-full lg:w-auto">
          <h1 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight">
            Instructor Management
          </h1>
          
          <div className="flex bg-background border border-border p-1 rounded-lg mt-3 w-fit shadow-sm">
            <button 
              onClick={() => router.push("/admin/instructor")}
              className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all bg-surface text-primary shadow-sm"
            >
              Instructor List
            </button>
            <button 
              onClick={() => router.push("/admin/instructor/schedule")}
              className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all text-text-muted hover:text-text-secondary"
            >
              Schedules
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 group/search">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search instructors..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-background border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-text-primary placeholder:text-text-muted shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2.5 text-[9px] font-black uppercase tracking-widest bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                Search
              </button>
              {(searchInput || searchTerm) && (
                <button 
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border border-border text-text-secondary rounded-xl hover:bg-surface-hover transition-all cursor-pointer whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          </div>
      </header>

      <div className="mt-6">
        <Table
          columns={columns}
          data={formattedData}
          loading={loading}
          actions={actions}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}

          emptyMessage="No instructors found"
        />

        <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={(page) => fetchInstructors(page)}
        />
      </div>

      <InstructorModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingInstructor(null);
        }}
        instructor={editingInstructor}
        onSuccess={() => fetchInstructors(pagination.currentPage)}
      />

      <InstructorViewModal
        key={viewingInstructor?.id || "view"}
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewingInstructor(null);
        }}
        instructor={viewingInstructor}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Instructor"
        description={`Are you sure you want to delete "${
          selectedInstructor?.name || ""
        }"? This action cannot be undone.`}
      />

    </div>
  );
};

export default Page;
