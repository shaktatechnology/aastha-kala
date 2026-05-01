"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Eye, Trash2, CalendarRange, Pen } from "lucide-react";
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
import BookingViewModal from "@/components/admin/BookingViewModal";
import { AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";
import { to12h } from "@/lib/timeFormat";

const statusColors: any = {
  pending: "bg-yellow-50 text-yellow-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const BookingManagementPage = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
    });

    const [globalStats, setGlobalStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
    });

    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const columns = [
        { key: "sn", label: "S.N." },
        { key: "customer", label: "Customer Info" },
        { key: "programInfo", label: "Class Requested" },
        { key: "date_time", label: "When" },
        { key: "status_badge", label: "Status" },
        { key: "actions", label: "Actions" },
    ];

    const fetchBookings = useCallback(async (page: number = 1) => {
        try {
            setLoading(true);
            const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/admin/bookings`);
            url.searchParams.append('page', page.toString());
            
            const res = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                cache: "no-store"
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to fetch bookings");
            
            const data = result.data?.data || result.data || [];
            if (data.length === 0 && page > 1) {
                fetchBookings(page - 1);
                return;
            }

            setBookings(data);
            
            if (result.data?.last_page) {
                setPagination({
                    currentPage: result.data.current_page,
                    totalPages: result.data.last_page,
                    totalItems: result.data.total,
                    itemsPerPage: result.data.per_page,
                });
            }

            const pendingCount = data.filter((b: any) => b.status === 'pending').length;
            const acceptedCount = data.filter((b: any) => b.status === 'accepted').length;

            setGlobalStats({
                total: result.data?.total || data.length,
                pending: result.pendingCount || pendingCount,
                accepted: result.acceptedCount || acceptedCount,
            });

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const updateBookingStatus = async (id: number, status: string, instructorId?: number, customStartTime?: string, customEndTime?: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bookings/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ status, instructor_id: instructorId, custom_start_time: customStartTime, custom_end_time: customEndTime }),
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success(`Booking ${status}`);
            fetchBookings(pagination.currentPage);
            setViewModalOpen(false);
        } catch (error: any) { toast.error(error.message); }
    };

    const confirmDelete = async () => {
        if (!selectedBooking) return;
        setDeleting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bookings/${selectedBooking.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Booking record removed");
            fetchBookings(pagination.currentPage);
        } catch (error: any) { toast.error(error.message); }
        finally { setDeleting(false); setDeleteModalOpen(false); }
    };

    const filteredBookings = bookings.filter((b: any) => 
        (b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         b.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         b.program?.title?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "all" || b.status === statusFilter)
    );

    if (loading && bookings.length === 0) {
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
                        <h1 className="text-3xl font-bold text-gray-900">Booking Requests</h1>
                        <p className="text-sm text-gray-500 mt-1">Approve or reject student registration requests</p>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Total Requests</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{globalStats.total}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">
                            {globalStats.pending}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Accepted</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">
                            {globalStats.accepted}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email or program..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <CustomSelect
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val as any)}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'accepted', label: 'Accepted' },
                            { value: 'rejected', label: 'Rejected' }
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
                                {filteredBookings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <CalendarRange className="w-12 h-12 text-gray-300" />
                                                <p className="text-gray-500">No booking requests found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBookings.map((b: any, index: number) => {
                                        const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                                        return (
                                            <TableRow key={b.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell className="font-medium">{sn}</TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-gray-900">{b.name}</div>
                                                    <div className="text-xs text-gray-500 font-medium">{b.email}</div>
                                                    {b.phone && (
                                                        <div className="text-[10px] text-gray-400 mt-0.5">{b.phone}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-gray-900 text-sm">{b.program?.title}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium uppercase">{b.class_mode}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${b.type === 'regular' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                            {b.type}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-gray-900">{b.booking_date}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {b.type === 'regular' ? (
                                                            b.schedule ? `${to12h(b.schedule.start_time)} - ${to12h(b.schedule.end_time)}` : 
                                                            (b.schedules && b.schedules.length > 0 ? 
                                                              `${to12h(b.schedules[0].start_time)} - ${to12h(b.schedules[0].end_time)}${b.schedules.length > 1 ? ' (+)' : ''}` : 
                                                              "No slot")
                                                          ) : (
                                                            `${to12h(b.custom_start_time)} - ${to12h(b.custom_end_time)}`
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider ${statusColors[b.status]}`}>
                                                        {b.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedBooking(b); setViewModalOpen(true); }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                            title="View"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedBooking(b); setViewModalOpen(true); }}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit"
                                                        >
                                                            <Pen className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedBooking(b); setDeleteModalOpen(true); }}
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
                                onPageChange={(page) => fetchBookings(page)}
                            />
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {viewModalOpen && (
                        <BookingViewModal
                            isOpen={viewModalOpen}
                            onClose={() => setViewModalOpen(false)}
                            booking={selectedBooking}
                            onStatusUpdate={(status, instructorId, customStartTime, customEndTime) => {
                                if (selectedBooking) updateBookingStatus(selectedBooking.id, status, instructorId, customStartTime, customEndTime);
                            }}
                        />
                    )}
                </AnimatePresence>

                <DeleteConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    loading={deleting}
                    title="Discard Booking Record?"
                    description="This will permanently delete this student's booking data. Only do this if you have archived their contact info."
                />
            </div>
        </div>
    );
};

export default BookingManagementPage;
