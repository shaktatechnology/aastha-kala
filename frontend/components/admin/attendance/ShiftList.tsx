"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Clock, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import ShiftFormModal from "./ShiftFormModal";

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
}

const ShiftList = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/shifts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data = await res.json();
      setShifts(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (shift: Shift) => {
    setSelectedShift(shift);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedShift) return;
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/shifts/${selectedShift.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete shift");
      toast.success("Shift deleted successfully");
      fetchShifts();
      setDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setSelectedShift(null);
    }
  };

  // Utility to format time from HH:mm:ss to HH:mm AM/PM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading && shifts.length === 0) {
    return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Configured Shifts</h2>
          <p className="text-sm text-gray-500">Create blocks of time for attendance processing.</p>
        </div>
        <button
          onClick={() => {
            setEditingShift(null);
            setFormModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-[11px] font-semibold uppercase tracking-wider shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> 
          <span>Add Shift</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Shift Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Grace Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No shifts configured yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-semibold text-gray-900">{shift.name}</TableCell>
                    <TableCell>
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold font-mono">
                        {formatTime(shift.start_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold font-mono">
                        {formatTime(shift.end_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 font-medium">
                        {shift.grace_period_minutes} mins
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(shift)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {formModalOpen && (
        <ShiftFormModal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          onSuccess={() => {
            setFormModalOpen(false);
            fetchShifts();
          }}
          initialData={editingShift}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Shift"
        description="Are you sure you want to delete this shift? This will also unassign it from any employees currently using it."
      />
    </div>
  );
};

export default ShiftList;
