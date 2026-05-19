"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Table from "@/components/layout/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import { Plus, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import EventAddEditModal from "@/components/admin/EventAddEditModal";
import EventViewModal from "@/components/admin/EventViewModal";
import { Pagination } from "@/components/global/Pagination";

interface Event {
  id: number;
  title: string;
  slug: string;
  description?: string;
  event_date: string;
  location: string;
  status: "draft" | "published";
  is_active?: boolean | number;
  banner?: string;
  created_at?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
}

const Page = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  // Local filter buffers
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState<"all" | "draft" | "published">("all");

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

  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<Event | null>(null);

  // Table columns
  const columns = [
    { key: "sn", label: "SN" },
    { key: "banner", label: "Banner" },
    { key: "title", label: "Title" },
    { key: "event_date", label: "Event Date" },
    { key: "location", label: "Location" },
    { key: "is_active", label: "Overlay Ad" },
    { key: "status", label: "Status" },
  ];

  // Fetch events
  const fetchEvents = async (page: number = 1) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/events?page=${page}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to fetch events");
      }

      const list = result.data?.data || result.data || [];
      
      if (list.length === 0 && page > 1) {
          fetchEvents(page - 1);
          return;
      }

      setEvents(list);
      
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
    fetchEvents();
  }, []);

// Filtered data
  const filteredEvents = events.filter((event) =>
    (event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     event.location.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === "all" || event.status === statusFilter)
  );

  // Format data for table
  const formattedData = filteredEvents.map((event, index) => ({
    ...event,
    sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,

    banner: event.banner ? (
      <img
        src={getImageUrl(event.banner)}
        alt={event.title}
        className="w-12 h-12 object-cover rounded"
      />
    ) : (
      <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded">
        <ImageIcon className="w-5 h-5 text-white/60" />
      </div>
    ),

    status: (
      <span
        className={`px-2 py-1 rounded text-xs ${
          event.status === "published"
            ? "bg-green-500/20 text-black"
            : "bg-yellow-500/20 text-black"
        }`}
      >
        {event.status}
      </span>
    ),

    is_active: (
      <span
        className={`px-2 py-1 rounded text-xs ${
          event.is_active
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        {event.is_active ? "Active" : "Disabled"}
      </span>
    ),

    event_date: new Date(event.event_date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  }));

  // View handler
  const handleView = (row: any) => {
    const original = events.find((e) => e.id === row.id);
    setViewEvent(original || null);
    setViewModalOpen(true);
  };

  // Edit handler
  const handleEdit = (row: any) => {
    const original = events.find((e) => e.id === row.id);
    setEditingEvent(original || null);
    setFormModalOpen(true);
  };

  // Delete handler
  const handleDeleteClick = (row: any) => {
    const original = events.find((e) => e.id === row.id);
    setSelectedEvent(original || null);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/events/${selectedEvent.id}`,
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

      toast.success("Event deleted");

      fetchEvents(pagination.currentPage);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const actions: ("view" | "edit" | "delete")[] = ["view", "edit", "delete"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center p-4 lg:p-6 bg-white border border-gray-200 rounded-2xl gap-6 shadow-sm mb-6">
        <div className="flex flex-col text-center lg:text-left">
          <span className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Events
          </span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">Search title/location, filter by status</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value as "all" | "draft" | "published")}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm bg-white cursor-pointer border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition shadow-sm min-w-[120px]"
            >
              <option value="all">Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            
            <button
              type="submit"
              className="px-5 py-2.5 text-sm bg-primary hover:bg-primary-hover text-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all font-bold cursor-pointer"
            >
              Apply
            </button>

            {(searchInput !== "" || statusInput !== "all" || searchTerm !== "" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setFormModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm bg-gradient-to-r cursor-pointer from-primary to-secondary text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2 transition-all font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="mt-6">
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          {filteredEvents.length} / {events.length} events
        </div>
        <Table
          columns={columns}
          data={formattedData}
          loading={loading}
          actions={actions}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          emptyMessage="No events found"
        />

        <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={(page) => fetchEvents(page)}
        />
      </div>

      {/* Add/Edit Modal */}
      <EventAddEditModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        onSuccess={() => {
            setSearchInput("");
            setStatusInput("all");
            setSearchTerm("");
            setStatusFilter("all");
            fetchEvents();
        }}
      />

      {/* View Modal */}
      <EventViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewEvent(null);
        }}
        event={viewEvent}
      />

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Event"
        description={`Are you sure you want to delete "${
          selectedEvent?.title || ""
        }"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Page;
