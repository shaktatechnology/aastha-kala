"use client";

import React, { useEffect, useState } from "react";
import { X, Calendar, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { to12h } from "@/lib/timeFormat";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  instructor?: any | null;
}

/** Convert "HH:MM" or "HH:MM:SS" → integer minutes since midnight */
const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const InstructorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  instructor,
}) => {
  const [loading, setLoading] = useState(false);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);
  
  // Availability states (from InstructorAvailabilityModal)
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [freeSegments, setFreeSegments] = useState<any[]>([]);
  const [loadingFree, setLoadingFree] = useState(false);
  const [syncingAvailability, setSyncingAvailability] = useState(false);

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

  const fetchAllPrograms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs`, {
        headers: { Accept: "application/json" },
      });
      const result = await res.json();
      if (res.ok) {
        setAllPrograms(result.data?.data || result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch programs", error);
    }
  };

  const fetchAvailabilities = async () => {
    if (!instructor) return;
    try {
      setSyncingAvailability(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructor-availabilities/instructor/${instructor.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const data = await res.json();
      setAvailabilities(data.data || []);
    } catch {
      toast.error("Failed to load availabilities");
    } finally {
      setSyncingAvailability(false);
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
      // silent
    } finally {
      setLoadingFree(false);
    }
  };

  useEffect(() => {
    fetchAllPrograms();
  }, []);

  useEffect(() => {
    if (isOpen && instructor) {
      // Set assigned programs
      if (instructor.programs) {
        setSelectedPrograms(instructor.programs.map((p: any) => p.id));
      } else {
        setSelectedPrograms([]);
      }

      // Fetch availabilities & free segments
      fetchAvailabilities();
      fetchFreeSegments();
    }
  }, [instructor, isOpen]);

  if (!isOpen || !instructor) return null;

  // Availability Management functions
  const addSlot = async () => {
    const newSlot = {
      instructor_id: instructor.id,
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "12:00",
    };
    try {
      setSyncingAvailability(true);
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
    } finally {
      setSyncingAvailability(false);
    }
  };

  const deleteSlot = async (id: number) => {
    try {
      setSyncingAvailability(true);
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
    } finally {
      setSyncingAvailability(false);
    }
  };

  const updateSlot = async (id: number, field: string, value: any) => {
    const current = availabilities.find((a) => a.id === id);
    if (current) {
      const start = field === "start_time" ? value : current.start_time;
      const end = field === "end_time" ? value : current.end_time;

      if (toMinutes(start) >= toMinutes(end)) {
        toast.error("End time must be strictly after start time");
        fetchAvailabilities();
        return;
      }
    }

    try {
      setSyncingAvailability(true);
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
    } finally {
      setSyncingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      // Keep required demographic fields to bypass backend validator
      formData.append("name", instructor.name || "");
      formData.append("title", instructor.title || "");
      formData.append("email", instructor.email || "");
      formData.append("phone", instructor.phone || "");
      formData.append("about", instructor.about || "");
      formData.append("facebook_url", instructor.facebook_url || "");
      formData.append("instagram_url", instructor.instagram_url || "");
      
      const deviceId = instructor.employee?.device_user_id || instructor.device_user_id || "";
      if (deviceId) {
        formData.append("device_user_id", deviceId);
      }

      selectedPrograms.forEach((id, i) => {
        formData.append(`program_ids[${i}]`, id.toString());
      });

      formData.append("_method", "PUT");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/instructors/${instructor.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to update assignments");
      }

      toast.success("Programs assignments updated successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/30 backdrop-blur-md p-4 ${loading ? "cursor-wait" : "cursor-pointer"}`}
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-xl p-8 cursor-default flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <div className="flex flex-col">
            <h2 className="flex items-center gap-2 font-black text-xl text-primary tracking-tight">
              <Calendar className="w-5 h-5" />
              Assign Programs & Availability
            </h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">
              Configure which courses they teach and schedule their weekly working hours
            </p>
          </div>

          <button disabled={loading} onClick={onClose} className={`p-2 rounded-full transition group ${loading ? "opacity-50 cursor-not-allowed text-primary/30" : "hover:bg-white/10 text-primary/60 hover:text-primary"}`}>
            <X className="w-5 h-5 group-hover:rotate-90 transition duration-300" />
          </button>
        </div>

        {/* Instructor Summary (Static Card) */}
        <div className="flex items-center gap-5 p-5 bg-background border border-border rounded-2xl mb-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-primary/20 bg-primary/5 flex items-center justify-center">
            {instructor.image ? (
              <img src={getImageUrl(instructor.image)} alt={instructor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-lg font-black uppercase">{getInitials(instructor.name)}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-text-primary tracking-tight leading-tight">{instructor.name}</h3>
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mt-1">{instructor.title || "Instructor"}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted mt-1.5 font-medium">
              <span>{instructor.email}</span>
              <span className="text-border">•</span>
              <span>{instructor.phone}</span>
            </div>
          </div>
        </div>

        {/* Programs Section */}
        <div className="mb-10 pb-8 border-b border-border">
          <div className="flex flex-col mb-6">
            <h3 className="text-base font-black text-primary uppercase tracking-wider">
              Programs Taught
            </h3>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">Which programs does this instructor teach?</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allPrograms.map((program) => (
              <div 
                key={program.id}
                onClick={() => {
                  if (loading) return;
                  setSelectedPrograms(prev => 
                    prev.includes(program.id) 
                      ? prev.filter(id => id !== program.id)
                      : [...prev, program.id]
                  );
                }}
                className={`p-3 rounded-xl border transition flex items-center gap-3 ${
                  selectedPrograms.includes(program.id)
                    ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5"
                    : "bg-background border-border text-text-secondary hover:bg-surface-hover hover:border-border-hover"
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedPrograms.includes(program.id) ? "bg-primary animate-pulse" : "bg-text-muted/30"}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">{program.title}</span>
              </div>
            ))}
          </div>
          {allPrograms.length === 0 && (
            <div className="py-8 text-center border border-dashed border-border rounded-xl bg-background">
              <span className="text-xs text-text-muted font-bold uppercase tracking-widest italic">No programs found</span>
            </div>
          )}
        </div>

        {/* Working Hours / Availability Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h3 className="text-base font-black text-primary uppercase tracking-wider">
                Working Hours & Availability
              </h3>
              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">When is this instructor available to teach?</p>
            </div>
            <button 
              type="button" 
              onClick={addSlot}
              disabled={loading || syncingAvailability}
              className={`px-4 py-2 text-[10px] font-black uppercase border border-primary/20 rounded-lg shadow-md tracking-wider ${loading || syncingAvailability ? 'opacity-50 cursor-not-allowed bg-primary/5 text-primary/40' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white transition cursor-pointer active:scale-95'}`}
            >
              + Add Available Slot
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availabilities.map((avail, index) => {
              const availStart = toMinutes(avail.start_time.substring(0, 5));
              const availEnd   = toMinutes(avail.end_time.substring(0, 5));
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
                <div key={avail.id || index} className="bg-background border border-border rounded-2xl p-4 flex flex-col gap-3 group hover:border-primary/40 transition shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-1 text-[9px] font-black text-primary/70 uppercase tracking-widest italic">
                      Time Slot #{index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSlot(avail.id)}
                      disabled={loading || syncingAvailability}
                      className={`p-1.5 rounded-lg transition ${loading || syncingAvailability ? 'text-red-500/20 cursor-not-allowed' : 'text-red-500/40 hover:text-red-500 hover:bg-red-500/10 md:opacity-0 group-hover:opacity-100'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-[9px] text-text-muted font-black uppercase mb-1 block italic tracking-wider">From</span>
                      <input
                        type="time"
                        value={avail.start_time?.substring(0, 5)}
                        disabled={loading || syncingAvailability}
                        onChange={(e) => updateSlot(avail.id, "start_time", e.target.value)}
                        className={`w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-bold focus:outline-none focus:border-primary transition ${loading || syncingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted font-black uppercase mb-1 block italic tracking-wider">To</span>
                      <input
                        type="time"
                        value={avail.end_time?.substring(0, 5)}
                        disabled={loading || syncingAvailability}
                        onChange={(e) => updateSlot(avail.id, "end_time", e.target.value)}
                        className={`w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-bold focus:outline-none focus:border-primary transition ${loading || syncingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center border-t border-border pt-2 text-[10px] font-black text-primary/80 tracking-wide">
                    <span>{to12h(avail.start_time)}</span>
                    <span className="text-text-muted font-normal">—</span>
                    <span>{to12h(avail.end_time)}</span>
                  </div>

                  {/* Booking Capacity Details */}
                  {totalMins > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-wider mb-1">
                        <span className="text-green-600">Free: {freeMins}m</span>
                        <span className="text-amber-600">Booked: {bookedMins}m</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden flex">
                        {bookedMins > 0 && (
                          <div className="h-full bg-amber-400" style={{ width: `${(bookedMins / totalMins) * 100}%` }} />
                        )}
                        {freeMins > 0 && (
                          <div className="h-full bg-green-400" style={{ width: `${(freeMins / totalMins) * 100}%` }} />
                        )}
                      </div>
                      
                      {/* Free segments sub-list */}
                      {!loadingFree && localFree.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Free Segments
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {localFree.map((seg: any, i: number) => (
                              <span key={i} className="text-[9px] bg-green-50/50 border border-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-md">
                                {to12h(seg.start + ":00")} – {to12h(seg.end + ":00")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!loadingFree && localFree.length === 0 && bookedMins > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase tracking-widest">
                          <AlertCircle className="w-2.5 h-2.5" /> Fully Booked Range
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {availabilities.length === 0 && !syncingAvailability && (
              <div className="col-span-full py-10 border border-dashed border-border rounded-2xl flex items-center justify-center bg-background">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest italic text-center px-4">No availability slots defined yet</span>
              </div>
            )}
            {syncingAvailability && availabilities.length === 0 && (
              <div className="col-span-full py-10 text-center animate-pulse text-xs text-text-muted uppercase font-black tracking-widest">
                Syncing hours...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl text-text-secondary text-sm font-bold border border-border bg-background hover:bg-surface-hover transition-all ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold bg-primary hover:bg-primary-hover shadow-lg shadow-primary/10 transition-all ${loading ? "opacity-70 cursor-wait" : "cursor-pointer active:scale-95"}`}
          >
            {loading ? "Saving..." : "Save Assignments"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorModal;
