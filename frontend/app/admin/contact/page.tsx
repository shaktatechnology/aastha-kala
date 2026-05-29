"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Table from "@/components/layout/Table";
import { formatDate } from "@/lib/utils";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import MessageViewModal from "@/components/admin/MessageViewModal";
import toast from "react-hot-toast";
import { Pagination } from "@/components/global/Pagination";

interface Message {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  message: string;
  created_at: string;
}

const AdminMessagesPage = () => {
const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  
  // Modals for Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal for View
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMessageForView, setSelectedMessageForView] = useState<Message | null>(null);

  const columns = [
    { key: "sn", label: "SN" },
    { key: "full_name", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "message_preview", label: "Message" },
    { key: "date", label: "Date" },
  ];

  const fetchMessages = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/messages?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        const list = result.data?.data || result.data || [];
        
        if (list.length === 0 && page > 1) {
            fetchMessages(page - 1);
            return;
        }

        setMessages(list);
        
        if (result.data?.last_page) {
            setPagination({
                currentPage: result.data.current_page,
                totalPages: result.data.last_page,
                totalItems: result.data.total,
                itemsPerPage: result.data.per_page,
            });
        }
      } else {
        toast.error("Failed to fetch messages.");
      }
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredMessages = messages.filter((msg) =>
    msg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formattedData = filteredMessages.map((msg, index) => ({
    ...msg,
    sn: (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1,

    phone_number: msg.phone_number?.trim() ? msg.phone_number: "-",

    message_preview: (
      <div className="max-w-[200px] truncate" title={msg.message}>
        {msg.message}
      </div>
    ),
    date: formatDate(msg.created_at),
  }));

  const handleViewClick = (row: any) => {
    const original = messages.find((m) => m.id === row.id);
    setSelectedMessageForView(original || null);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (row: any) => {
    const original = messages.find((m) => m.id === row.id);
    setSelectedMessageForDelete(original || null);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedMessageForDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/messages/${selectedMessageForDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        toast.success("Message deleted successfully.");
        fetchMessages(pagination.currentPage);
      } else {
        toast.error("Failed to delete message.");
      }
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setSelectedMessageForDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-center p-4 lg:p-6 bg-white border border-gray-200 rounded-2xl gap-6 shadow-sm">
        <div className="flex flex-col text-center lg:text-left">
          <h1 className="text-xl lg:text-2xl font-bold text-black">Contact Messages</h1>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">Manage user inquiries</span>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-10 py-2.5 text-sm text-black focus:outline-none focus:border-primary transition shadow-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <Table
          columns={columns}
          data={formattedData}
          loading={loading}
          actions={["view", "delete"]}
          onView={handleViewClick}
          onDelete={handleDeleteClick}
          emptyMessage="No messages found"
        />

        <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={(page) => fetchMessages(page)}
        />
      </div>

      <MessageViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedMessageForView(null);
        }}
        message={selectedMessageForView}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Message"
        description={`Are you sure you want to delete the message from "${
          selectedMessageForDelete?.full_name || ""
        }"?`}
      />
    </div>
  );
};

export default AdminMessagesPage;
