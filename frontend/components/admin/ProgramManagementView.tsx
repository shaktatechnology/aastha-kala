"use client";

import React, { useEffect, useState } from "react";
import { User, Clock, Loader2, ChevronDown, BookOpen, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { Pagination } from "@/components/global/Pagination";

interface Enrollment {
  id: number;
  status: string;
  program: {
    title: string;
  } | null;
  student: {
    id: number;
    name: string;
    phone: string;
    image_url: string | null;
  } | null;
  booking: {
    id: number;
    type: string;
    custom_start_time: string | null;
    custom_end_time: string | null;
    instructor: {
      id: number;
      name: string;
    } | null;
    schedules: {
      id: number;
      day: string;
      start_time: string;
    }[];
  } | null;
}

interface Props {
  searchTerm: string;
  statusFilter: string;
  onRefresh?: () => void;
}

const ProgramManagementView: React.FC<Props> = ({ searchTerm, statusFilter, onRefresh }) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
  });

  const fetchEnrollments = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/student-management/enrollments?page=${page}&search=${searchTerm}&status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (res.ok) {
        setEnrollments(result.data.data);
        setPagination({
            currentPage: result.data.current_page,
            totalPages: result.data.last_page,
            totalItems: result.data.total,
            itemsPerPage: result.data.per_page,
        });
      }
    } catch {
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments(1);
  }, [searchTerm, statusFilter]);

  const handleStatusChange = async (
    enrollmentId: number,
    newStatus: string
  ) => {
    try {
      setUpdatingId(enrollmentId);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/student-management/enrollments/${enrollmentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      if (result.booking_conflict) {
        toast.error(result.message || "Enrollment reactivated but instructor conflict detected. Please reassign an instructor.");
      } else {
        toast.success(result.message || "Status updated");
      }

      if (onRefresh) onRefresh();

      setEnrollments((prev) =>
        prev.map((en) =>
          en.id === enrollmentId ? { ...en, status: newStatus } : en
        )
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "graduated":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "inactive":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graduated":
        return "bg-emerald-100 text-emerald-700";
      case "inactive":
        return "bg-red-100 text-red-600";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  if (loading && enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading Data...
        </p>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
        <BookOpen className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-400">
          No matching enrollments found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Table Header Bar */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Enrollment Management
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              {pagination.totalItems} total enrollment{pagination.totalItems !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[800px] lg:min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80">
                SN
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80">
                Student
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80">
                Program
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80">
                Instructor
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80">
                Schedule
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80 text-center">
                Status
              </th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {enrollments.map((en, index) => {
              const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
              const instructorName = en.booking?.instructor?.name || "Unassigned";
              const isUpdating = updatingId === en.id;
              const studentName = en.student?.name || "Unknown";
              const studentPhone = en.student?.phone || "—";

              return (
                <tr
                  key={en.id}
                  className="group hover:bg-blue-50/30 transition-colors duration-150"
                >
                   {/* SN */}
                   <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-400">{sn}</span>
                  </td>

                  {/* Student */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shrink-0 border border-gray-100">
                        {en.student?.image_url ? (
                          <img src={en.student.image_url} alt={studentName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {studentName}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {studentPhone}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Program */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                      {en.program?.title}
                    </p>
                  </td>

                  {/* Instructor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                        <User className="w-2.5 h-2.5 text-blue-600" />
                      </div>
                      <span className="text-[12px] font-medium text-gray-600 truncate max-w-[150px]">
                        {instructorName}
                      </span>
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                      {en.booking?.type === "customization" ? (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {en.booking.custom_start_time?.substring(0, 5)} –{" "}
                          {en.booking.custom_end_time?.substring(0, 5)}
                        </span>
                      ) : en.booking?.schedules && en.booking.schedules.length > 0 ? (
                        en.booking.schedules.map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md whitespace-nowrap"
                          >
                            {s.day} {s.start_time.substring(0, 5)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getStatusBadge(
                        en.status
                      )}`}
                    >
                      {en.status}
                    </span>
                  </td>

                  {/* Action Dropdown */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className="relative w-[130px]">
                        <select
                          value={en.status}
                          onChange={(e) =>
                            handleStatusChange(en.id, e.target.value)
                          }
                          disabled={isUpdating}
                          className={`w-full text-[11px] font-semibold px-3 py-1.5 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-60 ${getStatusStyles(
                            en.status
                          )}`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="graduated">Graduated</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin text-current" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-current" />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
          <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={(page) => fetchEnrollments(page)}
            />
      </div>
    </div>
  );
};

export default ProgramManagementView;