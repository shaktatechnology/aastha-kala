"use client";

import React, { useEffect, useState } from "react";
import Table from "@/components/layout/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import TestimonialAddEdit from "@/components/admin/TestimonialAddEdit";
import toast from "react-hot-toast";
import { Plus, Star } from "lucide-react";
import { Pagination } from "@/components/global/Pagination";

interface Testimonial {
  id: number;
  name: string;
  title?: string;
  description: string;
  rating: number;
  order: number;
  image?: string | null;
  created_at?: string;
}

const Page = () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

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

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
            }
          />
        ))}
      </div>
    );
  };

  const columns = [
    { key: "sn", label: "SN" },
    { key: "image", label: "Image" },
  { key: "name", label: "Name" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "rating", label: "Rating" },
    { key: "order", label: "Order" },
  ];

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/admin/testimonials?page=${page}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch testimonials");
      }

      const items = json.data?.data || json.data || [];

      if (items.length === 0 && page > 1) {
          fetchData(page - 1);
          return;
      }

      setData(items);
      
      if (json.data?.last_page) {
        setPagination({
          currentPage: json.data.current_page,
          totalPages: json.data.last_page,
          totalItems: json.data.total,
          itemsPerPage: json.data.per_page,
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formattedData = data.map((item, index) => ({
    ...item,
    sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,

    image: item.image ? (
      <img
        src={getImageUrl(item.image)}
        alt={item.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold uppercase">
        {getInitials(item.name)}
      </div>
    ),

    rating: renderStars(item.rating),

    title: item.title || "-",
    description:
      item.description.length > 150
        ? item.description.slice(0, 150) + "..."
        : item.description,
  }));

  const handleEdit = (row: any) => {
    const original = data.find((i) => i.id === row.id);
    setEditingItem(original || null);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (row: any) => {
    const original = data.find((i) => i.id === row.id);
    setSelectedItem(original || null);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `${API_URL}/admin/testimonials/${selectedItem.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Delete failed");
      }

      toast.success("Deleted successfully");

      fetchData(pagination.currentPage);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedItem(null);
    }
  };

  const actions: ("edit" | "delete")[] = ["edit", "delete"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 lg:p-6 bg-white border border-gray-200 rounded-2xl gap-6 shadow-sm">
        <span className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          Testimonials
        </span>

        <button
          onClick={() => {
            setEditingItem(null);
            setFormModalOpen(true);
          }}
          className="w-full sm:w-auto px-6 py-2.5 text-sm bg-gradient-to-r from-primary to-secondary text-white rounded-lg flex gap-2 items-center justify-center cursor-pointer font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm transition duration-500 mt-6">
        <Table
          columns={columns}
          data={formattedData}
          loading={loading}
          actions={actions}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          emptyMessage="No testimonials found"
        />

        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={(page) => fetchData(page)}
        />
      </div>

      {/* Add/Edit Modal */}
      <TestimonialAddEdit
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingItem(null);
        }}
        initialData={editingItem}
        onSuccess={fetchData}
        nextOrder={pagination.totalItems + 1}
      />

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Testimonial"
        description={`Are you sure you want to delete "${selectedItem?.name || ""}"?`}
      />
    </div>
  );
};

export default Page;
