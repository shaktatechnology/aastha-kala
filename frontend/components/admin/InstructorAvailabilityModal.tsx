"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { to12h } from "@/lib/timeFormat";

interface InstructorAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructor: any;
}

/** Convert "HH:MM" or "HH:MM:SS" → integer minutes since midnight */
const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Convert integer minutes → "HH:MM" */
const fromMinutes = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const InstructorAvailabilityModal: React.FC<InstructorAvailabilityModalProps> = ({
  isOpen,
  onClose,
  instructor,
}) => {
  const [loading, setLoading] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [freeSegments, setFreeSegments] = useState<any[]>([]);
  const [loadingFree, setLoadingFree] = useState(false);

  const fetchAvailabilities = async () => {
    if (!instructor) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities/instructor/${instructor.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const data = await res.json();
      setAvailabilities(data.data || []);
    } catch {
      toast.error("Failed to load availabilities");
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeSegments = async () => {
    if (!instructor) return;
    try {
      setLoadingFree(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities/instructor/${instructor.id}/free-slots`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const data = await res.json();
      setFreeSegments(data.free_segments || []);
    } catch {
      /* silent */
    } finally {
      setLoadingFree(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailabilities();
      fetchFreeSegments();
    }
  }, [isOpen, instructor]);

  const addSlot = async () => {
    const newSlot = {
      instructor_id: instructor.id,
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "12:00",
    };
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(newSlot),
        }
      );
      const result = await res.json();
      if (res.ok) {
        fetchAvailabilities();
        fetchFreeSegments();
        toast.success("Availability range added");
      } else {
        if (result.errors) {
          Object.values(result.errors)
            .flat()
            .forEach((msg: any) => toast.error(msg));
        } else {
          toast.error(result.message || "Failed to add slot");
        }
      }
    } catch {
      toast.error("Failed to add slot");
    }
  };

  const deleteSlot = async (id: number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (res.ok) {
        fetchAvailabilities();
        fetchFreeSegments();
        toast.success("Availability range removed");
      }
    } catch {
      toast.error("Failed to delete slot");
    }
  };

  const updateSlot = async (id: number, field: string, value: any) => {
    // Validation: prevent same or invalid ranges
    const current = availabilities.find((a) => a.id === id);
    if (current) {
      const start = field === "start_time" ? value : current.start_time;
      const end = field === "end_time" ? value : current.end_time;

      if (toMinutes(start) >= toMinutes(end)) {
        toast.error("End time must be strictly after start time");
        fetchAvailabilities(); // Reset local state to what's on server
        return;
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ [field]: value }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        if (result.errors) {
          Object.values(result.errors)
            .flat()
            .forEach((msg: any) => toast.error(msg));
        } else {
          toast.error(result.message || "Sync failed");
        }
      }
      fetchAvailabilities();
      fetchFreeSegments();
    } catch {
      toast.error("Sync failed");
    }
  };

  if (!isOpen || !instructor) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/30 backdrop-blur-md p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-xl p-8 relative cursor-default flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-border pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-text-primary flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" /> {instructor.name}'s Availability Ranges
            </h2>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">
              Define continuous time blocks — students can book any interval within these
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-error/10 rounded-full text-text-muted hover:text-error transition group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition duration-300" />
          </button>
        </div>


        <div className="space-y-6">
          {/* ── Defined Ranges ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4">
            {availabilities.map((s, index) => {
              // Find free segments that sit within this availability range
              const availStart = toMinutes(s.start_time.substring(0, 5));
              const availEnd   = toMinutes(s.end_time.substring(0, 5));
              const localFree  = freeSegments.filter(
                (seg: any) =>
                  toMinutes(seg.start) >= availStart && toMinutes(seg.end) <= availEnd
              );
              const totalMins = availEnd - availStart;
              const freeMins  = localFree.reduce(
                (acc: number, seg: any) =>
                  acc + toMinutes(seg.end) - toMinutes(seg.start),
                0
              );
              const bookedMins = totalMins - freeMins;

              return (
                <div
                  key={index}
                  className="bg-slate-50 p-5 rounded-xl border border-border shadow-sm group hover:border-primary/40 transition"
                >
                  {/* Time range inputs */}
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-text-muted font-black uppercase ml-1 tracking-wider">
                            Available From
                          </span>
                          <input
                            type="time"
                            value={s.start_time?.substring(0, 5)}
                            onChange={(e) => updateSlot(s.id, "start_time", e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary font-bold focus:outline-none focus:border-primary transition shadow-inner"
                          />
                          <p className="text-[10px] text-text-muted font-bold ml-1">
                            {to12h(s.start_time)}
                          </p>
                        </div>
                        <div className="space-y-1">

                          <span className="text-[10px] text-text-muted font-black uppercase ml-1 tracking-wider">
                            Available Until
                          </span>
                          <input
                            type="time"
                            value={s.end_time?.substring(0, 5)}
                            onChange={(e) => updateSlot(s.id, "end_time", e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary font-bold focus:outline-none focus:border-primary transition shadow-inner"
                          />
                          <p className="text-[10px] text-text-muted font-bold ml-1">
                            {to12h(s.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Booking capacity bar */}
                      {totalMins > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                            <span className="text-green-600">
                              Free: {freeMins} min
                            </span>
                            <span className="text-amber-600">
                              Booked: {bookedMins} min
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
                            {bookedMins > 0 && (
                              <div
                                className="h-full bg-amber-400 rounded-l-full"
                                style={{ width: `${(bookedMins / totalMins) * 100}%` }}
                              />
                            )}
                            {freeMins > 0 && (
                              <div
                                className="h-full bg-green-400 rounded-r-full"
                                style={{ width: `${(freeMins / totalMins) * 100}%` }}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Free sub-segments */}
                      {!loadingFree && localFree.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Remaining Free Slots
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {localFree.map((seg: any, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] bg-green-50 border border-green-200 text-green-700 font-bold px-3 py-1 rounded-lg"
                              >
                                {to12h(seg.start + ":00")} – {to12h(seg.end + ":00")}
                                <span className="ml-1 text-green-400 font-normal">
                                  ({seg.duration_mins ?? (toMinutes(seg.end) - toMinutes(seg.start))} min)
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!loadingFree && localFree.length === 0 && bookedMins > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" /> Fully booked within this range
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteSlot(s.id)}
                      className="p-3 text-red-500 hover:bg-error/10 rounded-xl transition shadow-lg mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {!availabilities.length && !loading && (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-xl bg-slate-50">
                <p className="text-xs text-text-muted font-black uppercase tracking-widest px-6">
                  No availability ranges defined yet. Add a time range to allow bookings.
                </p>
              </div>
            )}
            {loading && (
              <div className="text-center py-10 animate-pulse text-xs text-text-muted uppercase font-black tracking-widest">
                Syncing with server...
              </div>
            )}
          </div>

          {/* ── Add Slot Button ────────────────────────────────────────── */}
          <button
            type="button"
            disabled={loading}
            onClick={addSlot}
            className="w-full py-4 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" /> Add Availability Range
          </button>

          {/* ── Legend ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-6 px-2 text-[9px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-green-600">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Free / Available
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Already Booked
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-8 mt-10 border-t border-border">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-slate-100 text-text-secondary rounded-xl hover:bg-slate-200 transition duration-300 font-bold uppercase tracking-widest text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorAvailabilityModal;
