"use client";

import React from "react";
import {
  X, User, Phone, Mail, Calendar, Clock, MapPin, Tag,
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, Edit3, Layout,
} from "lucide-react";
import { to12h } from "@/lib/timeFormat";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BookingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onStatusUpdate: (status: string, instructorId?: number, customStartTime?: string, customEndTime?: string) => void;
}

const statusColors: any = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

/** Convert "HH:MM" or "HH:MM:SS" → integer minutes */
const toMins = (t?: string): number => {
  if (!t) return 0;
  const [h, m] = t.substring(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const overlaps = (aS: number, aE: number, bS: number, bE: number) =>
  aS < bE && aE > bS;

const BookingViewModal: React.FC<BookingViewModalProps> = ({
  isOpen,
  onClose,
  booking,
  onStatusUpdate,
}) => {
  const [availableInstructors, setAvailableInstructors] = React.useState<any[]>([]);
  const [loadingInstructors, setLoadingInstructors] = React.useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = React.useState<number | "">("");

  // Editable agreed time (customization bookings only)
  const [agreedStart, setAgreedStart] = React.useState("");
  const [agreedEnd, setAgreedEnd] = React.useState("");
  const [editingTime, setEditingTime] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && booking?.id) {
      fetchAvailableInstructors(booking.id);
      const preAssignedId =
        booking.schedule?.instructor_id ||
        booking.schedules?.find((s: any) => s.instructor_id)?.instructor_id;
      setSelectedInstructorId(
        booking.instructor_id || (booking.type === "regular" ? preAssignedId : "") || ""
      );
      // Initialise agreed time from booking
      setAgreedStart(booking.custom_start_time?.substring(0, 5) || "");
      setAgreedEnd(booking.custom_end_time?.substring(0, 5) || "");
      setEditingTime(false);
    } else {
      setAvailableInstructors([]);
      setSelectedInstructorId("");
      setAgreedStart("");
      setAgreedEnd("");
    }
  }, [isOpen, booking?.id, booking?.instructor_id, booking?.type]);

  React.useEffect(() => {
    if (isOpen && booking?.type === "regular" && !selectedInstructorId && availableInstructors.length > 0) {
      setSelectedInstructorId(availableInstructors[0].id);
    }
  }, [availableInstructors, selectedInstructorId, booking?.type, isOpen]);

  const fetchAvailableInstructors = async (bookingId: number) => {
    try {
      setLoadingInstructors(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/bookings/${bookingId}/available-instructors`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const result = await res.json();
      if (res.ok) setAvailableInstructors(result.data || []);
    } catch {
      console.error("Failed to fetch instructors");
    } finally {
      setLoadingInstructors(false);
    }
  };

  if (!isOpen || !booking) return null;

  const selectedInstructor = availableInstructors.find(
    (ins) => ins.id === Number(selectedInstructorId)
  );

  const freeSlots: { start: string; end: string }[] =
    selectedInstructor?.free_slots || [];

  const isCustomBooking = booking.type === "customization";
  const timeConflict =
    isCustomBooking &&
    agreedStart &&
    agreedEnd &&
    !freeSlots.some(
      (seg) =>
        toMins(seg.start) <= toMins(agreedStart) &&
        toMins(seg.end) >= toMins(agreedEnd)
    );

  const handleApprove = () => {
    const instId = selectedInstructorId ? Number(selectedInstructorId) : undefined;
    if (isCustomBooking) {
      onStatusUpdate("accepted", instId, agreedStart || undefined, agreedEnd || undefined);
    } else {
      onStatusUpdate("accepted", instId);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-blue-600" /> Booking Request
            </h2>
            <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-semibold">
              Ref ID: BK-{booking.id?.toString().padStart(4, "0")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Section 1: Customer Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <User className="size-5 text-blue-600" /> Customer Profile
                </h3>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-5">
                  {[
                    { label: "Full Name", value: booking.name, icon: <User className="w-4 h-4 text-gray-400" /> },
                    { label: "Contact Email", value: booking.email, icon: <Mail className="w-4 h-4 text-gray-400" /> },
                    { label: "Phone Number", value: booking.phone, icon: <Phone className="w-4 h-4 text-gray-400" /> },
                    { label: "Current Address", value: booking.address || "Not provided", icon: <MapPin className="w-4 h-4 text-gray-400" /> },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                      <span className="text-sm text-gray-900 font-medium flex items-center gap-2">
                        {icon} {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Message</h3>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{booking.message || "No additional message provided."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Class Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Tag className="size-5 text-blue-600" /> Class Details
                </h3>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">Program Name</span>
                    <span className="text-base text-gray-900 font-semibold">{booking.program?.title}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">Format & Type</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-medium uppercase">{booking.class_mode}</span>
                      <span className={`text-xs px-2 py-1 rounded font-medium uppercase ${booking.type === 'regular' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{booking.type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">Requested Date</span>
                    <span className="text-sm text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" /> {booking.booking_date ? formatDate(booking.booking_date) : "N/A"}
                    </span>
                  </div>

                  {booking.duration_value && booking.duration_unit && (
                    <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                      <span className="text-xs font-medium text-gray-500 uppercase">Duration</span>
                      <span className="text-sm text-gray-900 font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" /> {booking.duration_value} {booking.duration_unit}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 border-t border-gray-200 pt-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {isCustomBooking ? "Student's Preferred Time" : "Requested Time Slot(s)"}
                    </span>
                    {booking.type === "regular" ? (
                      <div className="space-y-2 mt-1">
                        {(booking.schedules && booking.schedules.length > 0
                          ? booking.schedules
                          : [booking.schedule]
                        ).filter(Boolean).map((s: any, i: number) => (
                          <span key={i} className="text-sm text-gray-900 font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 w-fit">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {to12h(s.start_time)} - {to12h(s.end_time)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900 font-medium flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {to12h(booking.custom_start_time)} – {to12h(booking.custom_end_time)}
                      </span>
                    )}
                    {booking.instructor && (
                      <span className="text-xs font-medium text-gray-500 uppercase mt-3 block">
                        Assigned Facilitator: <span className="text-gray-900 font-semibold">{booking.instructor.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Status</h3>
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[booking.status]}`}>
                  {booking.status}
                </div>
              </div>
            </div>
          </div>

          {/* ── Instructor Assignment Section ───────────────────────────── */}
          {booking.status === "pending" && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <User className="size-5 text-blue-600" /> Assign Instructor
              </h3>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">

                {booking.type === "regular" ? (
                  /* Regular bookings: Show specific fixed instructors for each assigned slot */
                  <div className="space-y-6">
                    {(booking.schedules && booking.schedules.length > 0
                      ? booking.schedules
                      : [booking.schedule]
                    ).filter(Boolean).map((s: any, idx: number) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-2 border-l-2 border-blue-500 pl-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">
                            Class Slot: {to12h(s.start_time)} – {to12h(s.end_time)}
                          </span>
                        </div>

                        {s.instructor ? (
                          <div
                            onClick={() => setSelectedInstructorId(s.instructor.id)}
                            className={`border rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-3 cursor-pointer transition-all ${selectedInstructorId === s.instructor.id
                                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                              }`}
                          >
                            <User className="w-5 h-5" />
                            <div className="flex-1">
                              <p className="line-clamp-1">{s.instructor.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-medium text-gray-500">
                                  Fixed Instructor for this Slot
                                </span>
                              </div>
                            </div>
                            {selectedInstructorId === s.instructor.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <span className="text-sm text-amber-700 font-medium">
                              No fixed lead instructor assigned to this program slot.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Fallback */}
                    {(() => {
                      const hasSomeNoFixed = (booking.schedules && booking.schedules.length > 0
                        ? booking.schedules
                        : [booking.schedule]
                      ).filter(Boolean).some((s: any) => !s.instructor);

                      if (hasSomeNoFixed && availableInstructors.length > 0) {
                        return (
                          <div className="pt-4 border-t border-gray-200">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-3">
                              Available Program Facilitators
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {availableInstructors.map((ins) => (
                                <div
                                  key={ins.id}
                                  onClick={() => setSelectedInstructorId(ins.id)}
                                  className={`border rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-3 cursor-pointer transition-all ${selectedInstructorId === ins.id
                                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                      : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                                    }`}
                                >
                                  <User className="w-4 h-4" />
                                  <span className="line-clamp-1">{ins.name}</span>
                                  {selectedInstructorId === ins.id && <CheckCircle2 className="ml-auto w-4 h-4 text-blue-600" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {loadingInstructors && (
                      <span className="text-sm text-gray-500 animate-pulse font-medium block mt-4 text-center">
                        Refreshing instructor list...
                      </span>
                    )}
                  </div>
                ) : (
                  /* Customization bookings */
                  <div className="space-y-5">
                    {/* Available instructors */}
                    {availableInstructors.filter(ins => ins.is_available).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-700 font-bold uppercase tracking-wider">Perfectly Available</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableInstructors.filter(ins => ins.is_available).map((ins) => (
                            <div
                              key={ins.id}
                              onClick={() => setSelectedInstructorId(ins.id)}
                              className={`border rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-3 cursor-pointer transition-all ${selectedInstructorId === ins.id
                                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                                }`}
                            >
                              <User className="w-4 h-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="line-clamp-1">{ins.name}</p>
                                <p className="text-xs font-medium text-gray-500">
                                  Free for requested time
                                </p>
                              </div>
                              {selectedInstructorId === ins.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Busy but has free slots */}
                    {availableInstructors.filter(ins => !ins.is_available && ins.free_slots?.length > 0).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Busy but has free time</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableInstructors.filter(ins => !ins.is_available && ins.free_slots?.length > 0).map((ins) => (
                            <div
                              key={ins.id}
                              onClick={() => setSelectedInstructorId(ins.id)}
                              className={`border rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-3 cursor-pointer transition-all ${selectedInstructorId === ins.id
                                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                                }`}
                            >
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="line-clamp-1">{ins.name}</p>
                                <div className="flex flex-wrap gap-1 mt-0.5 text-gray-500">
                                  <span className="text-[10px] font-medium uppercase">Free:</span>
                                  {ins.free_slots.slice(0, 2).map((s: any, i: number) => (
                                    <span key={i} className="text-[10px] bg-gray-100 px-1 rounded">{to12h(s.start)}</span>
                                  ))}
                                  {ins.free_slots.length > 2 && <span className="text-[10px]">…</span>}
                                </div>
                              </div>
                              {selectedInstructorId === ins.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {loadingInstructors && (
                      <span className="text-sm text-gray-500 animate-pulse font-medium block text-center">Checking availability...</span>
                    )}
                    {!loadingInstructors && availableInstructors.length === 0 && (
                      <span className="text-sm text-red-500 font-semibold block text-center">
                        No instructors assigned to this program.
                      </span>
                    )}
                  </div>
                )}

                {/* ── Selected instructor's busy time warning (customization only) ── */}
                {isCustomBooking && selectedInstructorId && (selectedInstructor?.booked_slots?.length > 0 || freeSlots.length > 0) && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {/* Booked / busy slots */}
                    {selectedInstructor?.booked_slots?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {selectedInstructor?.name}'s Booked / Busy Windows
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedInstructor.booked_slots.map((seg: any, i: number) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-200 text-gray-700 font-semibold px-2.5 py-1 rounded-md"
                            >
                              {to12h(seg.start)} – {to12h(seg.end)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Free slots */}
                    {freeSlots.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {selectedInstructor?.name}'s Remaining Free Windows
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {freeSlots.map((seg: any, i: number) => (
                            <span
                              key={i}
                              className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-md"
                            >
                              {to12h(seg.start)} – {to12h(seg.end)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overlap warning */}
                    {timeConflict && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                        <div className="space-y-1">
                          <strong className="font-semibold block mb-1">⚠️ Scheduling Conflict Detected</strong>
                          <p className="text-sm">
                            The agreed time <strong>{to12h(agreedStart)} – {to12h(agreedEnd)}</strong> overlaps with another booking or is outside the instructor's free segments.
                          </p>
                          <p className="text-xs font-medium mt-1">
                            Override Allowed: You can still approve this booking despite the conflict.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Editable agreed time (customization only) ── */}
                {isCustomBooking && (
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Agreed Class Time
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingTime((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {editingTime ? "Done editing" : "Edit time"}
                      </button>
                    </div>

                    {editingTime ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">From</p>
                          <input
                            type="time"
                            value={agreedStart}
                            onChange={(e) => setAgreedStart(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">To</p>
                          <input
                            type="time"
                            value={agreedEnd}
                            onChange={(e) => setAgreedEnd(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-semibold text-sm ${timeConflict
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-white border-gray-200 text-gray-900"
                        }`}>
                        <Clock className="w-4 h-4 text-gray-500" />
                        {agreedStart && agreedEnd
                          ? `${to12h(agreedStart)} – ${to12h(agreedEnd)}`
                          : <span className="text-gray-400 font-normal text-sm">No agreed time set — will use student's preferred time</span>
                        }
                      </div>
                    )}

                    {agreedStart && agreedEnd && agreedEnd <= agreedStart && (
                      <p className="text-xs text-red-600 font-medium mt-1">End time must be after start time.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-6 h-11 text-black bg-white border border-gray-300 hover:bg-gray-100"
          >
            Close
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onStatusUpdate("pending")}
            disabled={booking.status === "pending"}
            className={cn(
              "px-6 h-11",
              booking.status === "pending" && "opacity-50 cursor-not-allowed"
            )}
          >
            <Clock className="w-4 h-4 mr-2" />
            Set Pending
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => onStatusUpdate("rejected")}
            disabled={booking.status === "rejected"}
            className={cn(
              "px-6 h-11",
              booking.status === "rejected" && "opacity-50 cursor-not-allowed"
            )}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>

          <Button
            type="button"
            onClick={handleApprove}
            disabled={Boolean(
              (booking.status === "pending" && !selectedInstructorId) ||
              (isCustomBooking && agreedStart && agreedEnd && agreedEnd <= agreedStart)
            )}
            className={cn(
              "px-8 h-11 text-base font-medium shadow-sm bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {booking.status === "accepted" ? "Update Booking" : "Approve Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingViewModal;