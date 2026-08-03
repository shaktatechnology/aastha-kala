"use client";

import React, { useEffect, useState } from "react";
import { X, Captions, FileTypeCorner, Wallet, Hash, Clock, User, Activity, CheckCircle2, XCircle } from "lucide-react";

interface Instructor {
  id: number;
  name: string;
}

interface Schedule {
  id?: number;
  instructor_id: string | number;
  start_time: string;
  end_time: string;
  instructor?: Instructor;
}

interface ProgramViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any;
}

const ProgramViewModal: React.FC<ProgramViewModalProps> = ({
  isOpen,
  onClose,
  program,
}) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchInstructors();
    }
  }, [isOpen]);

  const fetchInstructors = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/instructors?all=1`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setInstructors(data.data?.data || data.data || []);
    } catch (error) {
      console.error("Failed to fetch instructors", error);
    }
  };

  const getInstructorName = (instructorId: string | number) => {
    // First check if the schedule already has instructor object (from API)
    const schedule = program?.schedules?.find(
      (s: any) => String(s.instructor_id) === String(instructorId)
    );
    if (schedule?.instructor?.name) return schedule.instructor.name;

    // Fallback to fetched list
    const instructor = instructors.find(
      (inst) => String(inst.id) === String(instructorId)
    );
    return instructor?.name || "Unknown Instructor";
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen || !program) return null;

  const schedules: Schedule[] = program.schedules?.map((s: any) => ({
    ...s,
    start_time: s.start_time?.substring(0, 5) || "",
    end_time: s.end_time?.substring(0, 5) || "",
  })) || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-lg cursor-pointer"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-2xl p-8 bg-white/50 relative cursor-default"
        style={{
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-primary/50">
          <h2 className="text-xl font-bold text-primary italic">
            Program Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-primary/60 hover:text-primary transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Top Grid: Image + Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Title */}
              <div className="bg-white/60 border border-primary/20 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Captions className="w-3.5 h-3.5 text-primary/40" />
                  <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                    Program Title
                  </span>
                </div>
                <p className="text-sm font-bold text-primary italic leading-relaxed">
                  {program.title || "—"}
                </p>
              </div>

              {/* Description */}
              <div className="bg-white/60 border border-primary/20 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileTypeCorner className="w-3.5 h-3.5 text-primary/40" />
                  <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                    Description
                  </span>
                </div>
                <p className="text-xs text-primary/70 leading-relaxed whitespace-pre-line">
                  {program.description || "No description provided."}
                </p>
              </div>

              {/* Cover Image */}
              <div className="bg-white/60 border border-primary/20 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                  Cover Image
                </span>
                {program.image ? (
                  <div className="relative w-full h-48 overflow-hidden rounded-xl border border-primary/10 bg-white/40">
                    <img
                      src={program.image}
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center border-2 border-dashed border-primary/10 rounded-xl bg-white/20">
                    <span className="text-[10px] font-bold text-primary/20 uppercase tracking-widest italic">
                      No image uploaded
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Specialities */}
              <div className="bg-white/60 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-primary/40" />
                  <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                    Key Specialities
                  </span>
                </div>
                {program.speciality && program.speciality.length > 0 && program.speciality.some((s: string) => s) ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                    {program.speciality
                      .filter((s: string) => s)
                      .map((spec: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 bg-white/60 border border-primary/10 rounded-lg px-3 py-2.5 group"
                        >
                          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-primary/80 italic">
                            {spec}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-primary/30 italic">None specified</p>
                )}
              </div>

              {/* Fee & Status */}
              <div className="bg-white/60 border border-primary/20 rounded-xl p-4 space-y-4">
                {/* Fee */}
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-primary/40" />
                  <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                    Program Fee
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  {program.program_fee ? (
                    <>
                      <span className="text-2xl font-black text-primary tracking-tight">
                        Rs.{Number(program.program_fee).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-primary/30 italic">Not set</span>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-primary/10" />

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary/40" />
                    <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic">
                      Status
                    </span>
                  </div>
                  {program.is_active ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-500 px-3 py-1 rounded-full">
                      <XCircle className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedules Section */}
          <div className="border-t border-primary/20 pt-8 mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-primary/40" />
              <h3 className="text-lg font-bold text-primary tracking-tight italic">
                Fixed Schedules
              </h3>
              {schedules.length > 0 && (
                <span className="ml-2 bg-primary/10 text-primary text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  {schedules.length} {schedules.length === 1 ? "Slot" : "Slots"}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {schedules.map((s, index) => (
                <div
                  key={s.id || index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 bg-white/40 rounded-2xl border border-primary/20 hover:border-primary/30 transition shadow-sm"
                >
                  {/* Time Block */}
                  <div className="sm:col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary/10">
                      <Clock className="w-4 h-4 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary tracking-tight">
                        {formatTime(s.start_time)}
                        <span className="text-primary/30 mx-1">—</span>
                        {formatTime(s.end_time)}
                      </p>
                      <p className="text-[9px] text-primary/30 uppercase font-bold tracking-widest mt-0.5">
                        Time Slot {index + 1}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-center">
                    <div className="w-full border-t border-dashed border-primary/10" />
                  </div>

                  {/* Instructor Block */}
                  <div className="sm:col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-secondary/10">
                      <User className="w-4 h-4 text-secondary/60" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary/80 italic">
                        {s.instructor_id
                          ? getInstructorName(s.instructor_id)
                          : "Unassigned"}
                      </p>
                      <p className="text-[9px] text-primary/30 uppercase font-bold tracking-widest mt-0.5">
                        Lead Instructor
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {schedules.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-primary/20 rounded-3xl bg-white/20">
                  <Clock className="w-6 h-6 text-primary/10 mx-auto mb-2" />
                  <span className="text-xs font-bold text-primary/20 uppercase tracking-widest italic block">
                    No fixed slots configured
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sub Programs Section */}
          <div className="border-t border-primary/20 pt-8 mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-primary/40" />
              <h3 className="text-lg font-bold text-primary tracking-tight italic">
                Sub Programs
              </h3>
              {program.sub_programs?.length > 0 && (
                <span className="ml-2 bg-primary/10 text-primary text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  {program.sub_programs.length} {program.sub_programs.length === 1 ? "Program" : "Programs"}
                </span>
              )}
            </div>

            <div className="space-y-6">
              {program.sub_programs?.map((sp: any, spIndex: number) => (
                <div key={sp.id || spIndex} className="p-6 bg-primary/5 rounded-3xl border border-primary/20 space-y-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-primary italic uppercase tracking-tight">{sp.title}</h4>
                      <p className="text-[10px] text-primary/40 uppercase font-black tracking-widest">Sub Program {spIndex + 1}</p>
                    </div>
                    <div className="flex flex-col md:items-end">
                      <span className="text-lg font-black text-primary tracking-tight">Rs.{Number(sp.program_fee).toLocaleString()}</span>
                      <span className="text-[9px] text-primary/40 uppercase font-bold tracking-widest">Program Fee</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-primary/40 tracking-widest italic mb-3">Schedules</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {sp.schedules?.map((s: any, sIndex: number) => (
                        <div key={s.id || sIndex} className="flex flex-wrap items-center gap-4 p-3 bg-white/40 rounded-xl border border-primary/5 hover:border-primary/10 transition">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Clock className="w-3 h-3 text-primary/40" />
                            <span className="text-[11px] font-bold text-primary/80 italic">
                              {formatTime(s.start_time?.substring(0, 5))} — {formatTime(s.end_time?.substring(0, 5))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-secondary/40" />
                            <span className="text-[11px] font-medium text-primary/60 italic">
                              {s.instructor?.name || getInstructorName(s.instructor_id)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!sp.schedules || sp.schedules.length === 0) && (
                        <p className="text-[10px] text-primary/30 italic">No schedules defined for this sub-program.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!program.sub_programs || program.sub_programs.length === 0) && (
                <div className="text-center py-6 border-2 border-dashed border-primary/10 rounded-3xl bg-primary/5">
                  <Activity className="w-6 h-6 text-primary/10 mx-auto mb-2" />
                  <span className="text-[10px] font-bold text-primary/20 uppercase tracking-widest italic block">
                    No sub-programs available
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-8 border-t border-primary/20 mt-6">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl text-primary/60 hover:text-primary hover:bg-white/40 border border-primary/10 transition font-bold uppercase tracking-widest text-[10px] italic cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramViewModal;