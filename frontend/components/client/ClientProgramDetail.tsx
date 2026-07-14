"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  Users,
  Monitor,
  MapPin,
  Calendar,
  Lock,
  CheckCircle2,
  X,
  UserCircle2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";
import { NepaliDateInput } from "@/components/ui/NepaliDateInput";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

/* ─── Types ─────────────────────────────────────────────────── */
interface Schedule {
  id: number;
  start_time: string;
  end_time: string;
  instructor?: { name: string };
}

interface SubProgram {
  id: number;
  title: string;
  description?: string;
  program_fee?: number | string;
  schedules?: Schedule[];
  speciality?: string[];
  is_active?: boolean;
  image?: string | null;
}

interface Program {
  id: number;
  title: string;
  description?: string;
  image?: string | null;
  program_fee?: number | string;
  sub_programs?: SubProgram[];
  schedules?: Schedule[];
  speciality?: string[];
  is_active?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

const getImageUrl = (path?: string | null) => {
  if (!path) return "/images/program-fallback.png";
  if (path.startsWith("http")) return path;
  return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
};

const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

/* ─── Booking Modal (ProgramForm-style) ───────────────────────── */
interface BookingModalProps {
  program: Program | SubProgram;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ program, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingType, setBookingType] = useState<"regular" | "customization">("regular");

  React.useEffect(() => {
    const orig = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    class_mode: "physical" as "physical" | "online",
    schedule_ids: [] as string[],
    booking_date: "",
    custom_start_time: "",
    custom_end_time: "",
    duration_value: "",
    duration_unit: "",
    message: "",
    current_address: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      bookingType === "customization" &&
      form.custom_start_time &&
      form.custom_end_time &&
      form.custom_end_time <= form.custom_start_time
    ) {
      toast.error("End time must be after start time.");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        program_id: program.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        class_mode: form.class_mode,
        booking_date: form.booking_date,
        duration_value: parseInt(form.duration_value) || 1,
        duration_unit: form.duration_unit || undefined,
        type: bookingType,
        address: form.current_address,
        message: form.message,
      };
      if (bookingType === "regular") {
        payload.schedule_ids = form.schedule_ids;
      } else {
        payload.custom_start_time = form.custom_start_time;
        payload.custom_end_time = form.custom_end_time;
      }
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = "Booking failed";
        if (data.errors) {
          const firstError = Object.values(data.errors).flat()[0] as string;
          errorMessage = firstError || data.message || errorMessage;
        } else {
          errorMessage = data.message || errorMessage;
        }
        throw new Error(errorMessage);
      }
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white sticky top-0 rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Book Your Class</h2>
              <p className="text-sm text-gray-500 mt-0.5">{program.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Booking Received!</h3>
              <p className="text-gray-500 max-w-sm text-sm leading-relaxed mt-2">
                Thank you, <strong>{form.name}</strong>! Your request for{" "}
                <strong>{program.title}</strong> has been submitted. We'll confirm your slot shortly.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="mt-2 px-8 h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="p-8 space-y-8">

              {/* Class Type */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Class Type
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "regular", label: "Fixed Schedule", icon: <Calendar className="w-4 h-4" /> },
                    { value: "customization", label: "Private Class", icon: <Lock className="w-4 h-4" /> },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBookingType(value as any)}
                      className={cn(
                        "flex items-center gap-2.5 justify-center p-3 rounded-lg border-2 font-medium text-sm transition",
                        bookingType === value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      )}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Full Name" required />
                    <Input required className="h-11 text-base" placeholder="Your full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel label="Phone Number" required />
                    <Input required type="tel" className="h-11 text-base" placeholder="98XXXXXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel label="Email Address" />
                    <Input type="email" className="h-11 text-base" placeholder="you@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Class Mode */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  Class Mode
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "physical", label: "Physical", icon: <Users className="w-4 h-4" /> },
                    { value: "online", label: "Online", icon: <Monitor className="w-4 h-4" /> },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("class_mode", value)}
                      className={cn(
                        "flex items-center gap-2.5 justify-center p-3 rounded-lg border-2 font-medium text-sm transition",
                        form.class_mode === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      )}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Schedule
                </h3>

                <div>
                  <FieldLabel label="Preferred Start Date" required />
                  <NepaliDateInput
                    value={form.booking_date}
                    onChange={(value) => set("booking_date", value)}
                    min={new Date().toISOString().slice(0, 10)}
                    placeholder="Select your preferred start date"
                    className="w-full"
                  />
                </div>

                {bookingType === "regular" ? (
                  program.schedules && program.schedules.length > 0 ? (
                    <div className="space-y-2">
                      <FieldLabel label="Select Time Slot(s)" />
                      {program.schedules.map((s) => (
                        <label
                          key={s.id}
                          className={cn(
                            "flex items-center gap-4 p-3.5 rounded-lg border-2 cursor-pointer transition",
                            form.schedule_ids.includes(String(s.id))
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={form.schedule_ids.includes(String(s.id))}
                            onChange={(e) => {
                              const val = String(s.id);
                              const current = [...form.schedule_ids];
                              setForm({
                                ...form,
                                schedule_ids: e.target.checked
                                  ? [...current, val]
                                  : current.filter((id) => id !== val),
                              });
                            }}
                            className="accent-blue-600 w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-500" />
                              {formatTime12h(s.start_time)} – {formatTime12h(s.end_time)}
                            </p>
                            {s.instructor && (
                              <p className="text-xs text-gray-400 mt-0.5 pl-6">
                                Instructor: {s.instructor.name}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                      No fixed schedules available for this program yet.
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="From" required />
                        <Input required type="time" className="h-11 text-base" value={form.custom_start_time} onChange={(e) => set("custom_start_time", e.target.value)} />
                      </div>
                      <div>
                        <FieldLabel label="To" required />
                        <Input required type="time" className="h-11 text-base" value={form.custom_end_time} onChange={(e) => set("custom_end_time", e.target.value)} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Our team will contact you to finalize the schedule.</p>

                    <div>
                      <FieldLabel label="Program Duration" required />
                      <div className="grid grid-cols-2 gap-4">
                        <CustomSelect
                          value={form.duration_unit}
                          onChange={(v) => set("duration_unit", v)}
                          placeholder="Select Unit"
                          options={[
                            { value: "months", label: "Months" },
                            { value: "years", label: "Years" },
                          ]}
                        />
                        <Input
                          required
                          type="number"
                          min="1"
                          className={cn("h-11 text-base", !form.duration_unit && "opacity-50")}
                          disabled={!form.duration_unit}
                          placeholder={!form.duration_unit ? "Choose unit first" : "e.g. 3"}
                          value={form.duration_value}
                          onChange={(e) => set("duration_value", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Address {form.class_mode !== "physical" && <span className="text-gray-400 font-normal text-sm">(Optional)</span>}
                </h3>
                <Input
                  type="text"
                  required={form.class_mode === "physical"}
                  className="h-11 text-base"
                  placeholder="City / Street / Tole"
                  value={form.current_address}
                  onChange={(e) => set("current_address", e.target.value)}
                />
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Additional Message
                </h3>
                <textarea
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white resize-none placeholder:text-gray-400"
                  placeholder="Any special requests or questions..."
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={onClose} className="px-6 h-11 bg-white border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="px-8 h-11 bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer">
                {loading ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> Submitting...</span>
                ) : "Confirm Booking"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ─── Sub-Program Card ───────────────────────────────────────── */
const SubProgramCard = ({ sub, parentImage }: { sub: SubProgram; parentImage?: string | null }) => {
  const [showModal, setShowModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="group bg-white rounded-[2rem] border border-gray-100 hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(0,31,84,0.08)] transition-all duration-500 overflow-hidden flex flex-col h-full">
        {/* Image */}
        <div className="relative h-64 overflow-hidden">
          <img
            src={getImageUrl(sub.image || parentImage)}
            alt={sub.title || "Sub Program"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/program-fallback.png"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001f54]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col flex-1">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-2xl font-black text-[#001f54] leading-tight">
                {sub.title || "Untitled Track"}
              </h3>
              {(sub.description?.length || 0) > 80 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 transition-all cursor-pointer shrink-0 mt-0.5"
                  title={isExpanded ? "Show Less" : "Read More"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <p className={cn(
              "text-gray-500 text-sm leading-relaxed font-medium transition-all duration-300",
              !isExpanded && "line-clamp-2"
            )}>
              {sub.description || "Professional training track with structured curriculum and expert guidance."}
            </p>
          </div>

          {/* Schedule tags */}
          <div className="flex flex-wrap gap-2 mb-8 mt-auto">
            {sub.schedules && sub.schedules.length > 0 ? (
              sub.schedules.slice(0, 3).map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wide">
                  <Clock className="w-3 h-3" />
                  {formatTime12h(s.start_time)} – {formatTime12h(s.end_time)}
                </span>
              ))
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wide">
                Flexible Schedule
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-50">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold tracking-wide cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
            >
              Join Now
            </button>
          </div>
        </div>
      </div>

      {showModal && <BookingModal program={sub} onClose={() => setShowModal(false)} />}
    </>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export default function ClientProgramDetail({ program }: { program: Program }) {
  const hasSubPrograms = program.sub_programs && program.sub_programs.length > 0;
  const [showMainModal, setShowMainModal] = useState(false);

  return (
    <section className="min-h-screen">
      {/* Professional Header — Breadcrumb (Left) & Centered Heading (Same Line) */}
      <div className="w-full pt-12 pb-14 px-6 md:px-12 border-b border-gray-100 bg-white relative">
        <div className="max-w-[1600px] mx-auto relative flex items-center">
          {/* Breadcrumb on the Left */}
          <nav className="absolute left-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 italic">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href="/programs" className="hover:text-primary transition-colors">Programs</Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
          </nav>

          {/* Centered Heading */}
          <div className="flex-1 text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#001f54] leading-tight tracking-tight">
              {program.title}
            </h1>
          </div>
        </div>

        {program.description && (
          <div className="max-w-3xl mx-auto text-center mt-6">
            <p className="text-gray-500 text-base md:text-xl font-medium leading-relaxed">
              {program.description}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {hasSubPrograms ? (
          <>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#001f54]">Available Tracks</h2>
                <p className="text-gray-400 text-sm">Choose a track below and click Enroll Now to book</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {program.sub_programs!.map((sub) => (
                <SubProgramCard key={sub.id} sub={sub} parentImage={program.image} />
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#001f54] mb-2">Ready to Enroll?</h2>
                <p className="text-gray-400 text-sm">Click below to fill in your booking details for this program.</p>
              </div>
              <Button
                onClick={() => setShowMainModal(true)}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 font-bold uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary/20"
              >
                Join Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {showMainModal && <BookingModal program={program} onClose={() => setShowMainModal(false)} />}
    </section>
  );
}
