"use client";

import React, { useEffect, useState } from "react";
import InputField from "@/components/layout/InputField";
import { X, User, Phone, MapPin, Mail, Calendar, Clock, BookOpen, Star, Search, ArrowRight, AlertCircle, AlertTriangle, Hash } from "lucide-react";
import toast from "react-hot-toast";
import { to12h } from "@/lib/timeFormat";
import { NepaliDateInput } from "@/components/ui/NepaliDateInput";
import { getBsDateParts, bsMonthYearToAdPeriod } from "@/lib/utils";

interface StudentData {
  id?: number;
  name: string;
  roll_no?: string;
  phone: string;
  email?: string;
  dob?: string;
  address?: string;
  time?: string;
  offer_enroll_reference?: string;
  gender?: string;
  classes?: string;
  enrollment_date?: string;
  billing_start_date?: string;
  duration_value?: string | number;
  duration_unit?: string;
  status: "active" | "inactive" | "graduated";
  image?: File | string | null;
  enrollments?: any[];
  admission_fee_not_required?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student?: any;
}

function toYmdDate(dateVal?: string | null): string {
  if (!dateVal) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return dateVal.split("T")[0] || "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const StudentAddEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  student,
}) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const [form, setForm] = useState<StudentData>({
    name: "",
    roll_no: "",
    phone: "",
    email: "",
    dob: "",
    address: "",
    time: "",
    offer_enroll_reference: "",
    gender: "",
    classes: "",
    enrollment_date: new Date().toISOString().split('T')[0],
    billing_start_date: new Date().toISOString().split('T')[0],
    duration_value: "",
    duration_unit: "",
    status: "active",
    image: null,
    enrollments: [],
    admission_fee_not_required: false,
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);

  // Booking Import State
  const [showBookingList, setShowBookingList] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [fetchingBookings, setFetchingBookings] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");

  // Programs State
  const [programs, setPrograms] = useState<any[]>([]);

  // Instructor Availabilities map (instructor_id -> { free_segments, booked_segments })
  const [instructorAvailabilities, setInstructorAvailabilities] = useState<{ [key: number]: any }>({});
  const [loadingAvail, setLoadingAvail] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      setFetchingBookings(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/admin/bookings?status=accepted`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      const data = await res.json();
      setBookings(data.data?.data || data.data || []);
      setShowBookingList(true);
    } catch (error) {
      toast.error("Failed to fetch bookings");
    } finally {
      setFetchingBookings(false);
    }
  };

  const selectBooking = (b: any) => {
    setForm({
      ...form,
      name: b.name || "",
      phone: b.phone || "",
      email: b.email || "",
      address: b.address || "",
      classes: b.program?.title || "",
      duration_value: b.duration_value !== null && b.duration_value !== undefined ? String(b.duration_value) : "",
      duration_unit: b.duration_unit || "",
      offer_enroll_reference: `Booking ID: ${b.id}`,
      enrollments: [
        {
          booking_id: b.id,
          program_id: b.program_id,
          type: b.type || "regular",
          instructor_id: b.instructor_id,
          schedule_id: b.schedule_id,
          schedule_ids: b.schedules?.map((s: any) => s.id) || (b.schedule_id ? [b.schedule_id] : []),
          custom_start_time: b.custom_start_time,
          custom_end_time: b.custom_end_time,
          custom_fee: "",
          commission_percentage: "",
          billing_mode: "duration",
          monthly_discount: "",
          monthly_discount_type: "cash",
          duration_value: b.duration_value !== null && b.duration_value !== undefined ? String(b.duration_value) : "",
          duration_unit: b.duration_unit || "months",
        }
      ]
    });
    setShowBookingList(false);
    toast.success(`Imported data for ${b.name}`);
  };

  const filteredBookings = bookings.filter(b =>
    b.name.toLowerCase().includes(bookingSearch.toLowerCase()) ||
    b.phone.includes(bookingSearch)
  );
  const fetchPrograms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs`);
      const data = await res.json();
      setPrograms(data.data?.data || data.data || []);
    } catch (error) {
      console.error("Failed to fetch programs:", error);
    }
  };

  const toMins = (t?: string): number => {
    if (!t) return 0;
    const [h, m] = t.substring(0, 5).split(":").map(Number);
    return h * 60 + m;
  };

  const checkConflict = (e: any) => {
    if (e.type !== 'customization' || !e.instructor_id || !e.custom_start_time || !e.custom_end_time) return false;
    const avail = instructorAvailabilities[Number(e.instructor_id)];
    if (!avail || !avail.free) return false;

    const start = toMins(e.custom_start_time);
    const end = toMins(e.custom_end_time);

    // Conflict if it doesn't fit IN any free segment. 
    // If avail.free is empty, every time is a conflict.
    return !avail.free.some((seg: any) => toMins(seg.start) <= start && toMins(seg.end) >= end);
  };

  const fetchInstructorAvailability = async (instructorId: number) => {
    if (instructorAvailabilities[instructorId]) return;
    try {
      setLoadingAvail(instructorId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/admin/instructor-availabilities/instructor/${instructorId}/free-slots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInstructorAvailabilities(prev => ({
          ...prev,
          [instructorId]: {
            free: data.free_segments || [],
            booked: data.booked_segments || []
          }
        }));

        // Re-fetch to get booked segments specifically if available, 
        // but the current API already blocks busy time from free_segments.
        // Let's refine the API response in our head or just show 'Busy' windows.
        // Actually, I'll update the logic below to handle what's available.
      }
    } catch (e) {
      console.error("Failed to fetch availability", e);
    } finally {
      setLoadingAvail(null);
    }
  };

  useEffect(() => {
    fetchPrograms();
    if (student) {
      setForm({
        name: student.name || "",
        roll_no: student.roll_no || "",
        phone: student.phone || "",
        email: student.email || "",
        dob: toYmdDate(student.dob),
        address: student.address || "",
        time: student.time || "",
        offer_enroll_reference: student.offer_enroll_reference || "",
        gender: student.gender || "",
        classes: student.classes || "",
        enrollment_date: toYmdDate(student.enrollment_date),
        billing_start_date: toYmdDate(student.billing_start_date) || toYmdDate(student.enrollments?.[0]?.enrolled_at) || toYmdDate(student.enrollment_date),
        duration_value: student.duration_value || "",
        duration_unit: student.duration_unit || "",
        status: student.status || "active",
        image: null,
        enrollments: student.enrollments?.map((e: any) => ({
          booking_id: e.booking_id,
          program_id: e.program_id,
          type: e.booking?.type || "regular",
          status: e.status || "active",
          instructor_id: e.booking?.instructor_id,
          schedule_id: e.booking?.schedule_id,
          schedule_ids: e.booking?.schedules?.map((s: any) => s.id) || (e.booking?.schedule_id ? [e.booking?.schedule_id] : []),
          custom_start_time: e.booking?.custom_start_time,
          custom_end_time: e.booking?.custom_end_time,
          custom_fee: e.custom_fee !== null && e.custom_fee !== undefined ? String(e.custom_fee) : "",
          commission_percentage: e.commission_percentage !== null && e.commission_percentage !== undefined ? String(e.commission_percentage) : "",
          billing_mode: e.billing_mode || "duration",
          monthly_discount: e.monthly_discount !== null && e.monthly_discount !== undefined ? String(e.monthly_discount) : "",
          monthly_discount_type: e.monthly_discount_type || "cash",
          duration_value: e.duration_value !== null && e.duration_value !== undefined ? String(e.duration_value) : "",
          duration_unit: e.duration_unit || "months",
        })) || [],
        admission_fee_not_required: student.admission_fee_not_required !== undefined ? !!student.admission_fee_not_required : false,
      });

      setPreviewImage(student.image_url || null);

      // Fetch availability for all enrolled instructors to ensure conflict checking works on load
      student.enrollments?.forEach((e: any) => {
        if (e.booking?.instructor_id) {
          fetchInstructorAvailability(e.booking.instructor_id);
        }
      });
    } else {
      setForm({
        name: "",
        roll_no: "",
        phone: "",
        email: "",
        dob: "",
        address: "",
        time: "",
        offer_enroll_reference: "",
        gender: "",
        classes: "",
        enrollment_date: new Date().toISOString().split('T')[0],
        billing_start_date: new Date().toISOString().split('T')[0],
        duration_value: "",
        duration_unit: "",
        status: "active",
        image: null,
        enrollments: [],
        admission_fee_not_required: false,
      });
      setPreviewImage(null);
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const toggleClass = (program: any) => {
    const currentEnrollments = form.enrollments || [];
    const exists = currentEnrollments.some((e: any) => e.program_id === program.id);

    if (exists) {
      setForm(prev => ({
        ...prev,
        enrollments: currentEnrollments.filter((e: any) => e.program_id !== program.id)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        enrollments: [
          ...currentEnrollments,
          {
            program_id: program.id,
            type: 'regular',
            status: 'active',
            booking_id: null,
            instructor_id: null,
            schedule_id: null,
            schedule_ids: [], 
            custom_start_time: null,
            custom_end_time: null,
            custom_fee: program.program_fee ?? "",
            commission_percentage: "",
            billing_mode: "duration",
            monthly_discount: "",
            monthly_discount_type: "cash",
          }
        ]
      }));
    }
  };

  const isClassSelected = (id: number) => {
    return form.enrollments?.some((e: any) => e.program_id === id);
  };

  const updateEnrollment = (programId: number, data: any) => {
    setForm(prev => ({
      ...prev,
      enrollments: prev.enrollments?.map((e: any) =>
        e.program_id === programId ? { ...e, ...data } : e
      )
    }));
  };

  const handleImageChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, image: file }));
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const hasDurationMode = form.enrollments?.some(
    (e: any) => (e.billing_mode || "duration") === "duration"
  );  

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});
      const token = localStorage.getItem("token");

      const formData = new FormData();
      console.log("Submitting form:", form);
      Object.keys(form).forEach(key => {
        if (key === 'image') {
          if (form.image instanceof File) {
            formData.append("image", form.image);
          }
        } else if (key === 'enrollments') {
          form.enrollments?.forEach((e, index) => {
            formData.append(`enrollments[${index}][program_id]`, String(e.program_id));
            formData.append(`enrollments[${index}][type]`, e.type);
            formData.append(`enrollments[${index}][status]`, e.status || "active");
            if (e.booking_id) formData.append(`enrollments[${index}][booking_id]`, String(e.booking_id));
            if (e.instructor_id) formData.append(`enrollments[${index}][instructor_id]`, String(e.instructor_id));
            if (e.schedule_id) formData.append(`enrollments[${index}][schedule_id]`, String(e.schedule_id));
            if (e.schedule_ids?.length > 0) {
              e.schedule_ids.forEach((sid: any, sIdx: number) => {
                formData.append(`enrollments[${index}][schedule_ids][${sIdx}]`, String(sid));
              });
            }
            if (e.custom_start_time) {
              formData.append(`enrollments[${index}][custom_start_time]`, e.custom_start_time.substring(0, 5));
            }
            if (e.custom_end_time) {
              formData.append(`enrollments[${index}][custom_end_time]`, e.custom_end_time.substring(0, 5));
            }
            if (e.custom_fee !== undefined && e.custom_fee !== null && e.custom_fee !== "") {
              formData.append(`enrollments[${index}][custom_fee]`, String(e.custom_fee));
            } else {
              // Always send the fee — fall back to the displayed default
              // Backend model accessor treats null as "use program default"
              // but sending the explicit value is more robust
            }
            if (e.commission_percentage !== undefined && e.commission_percentage !== null && e.commission_percentage !== "") {
              formData.append(`enrollments[${index}][commission_percentage]`, String(e.commission_percentage));
            }
            formData.append(`enrollments[${index}][billing_mode]`, e.billing_mode || "duration");
            if ((e.billing_mode || "duration") === "duration") {
              if (e.duration_value !== undefined && e.duration_value !== null && e.duration_value !== "") {
                formData.append(`enrollments[${index}][duration_value]`, String(e.duration_value));
              }
              if (e.duration_unit) {
                formData.append(`enrollments[${index}][duration_unit]`, e.duration_unit);
              }
            }
            if (e.monthly_discount !== undefined && e.monthly_discount !== null && e.monthly_discount !== "") {
              formData.append(`enrollments[${index}][monthly_discount]`, String(e.monthly_discount));
            }
            if (e.monthly_discount_type) {
              formData.append(`enrollments[${index}][monthly_discount_type]`, e.monthly_discount_type);
            }
            formData.append(`enrollments[${index}][status]`, e.status || "active");
            formData.append(`enrollments[${index}][enrolled_at]`, form.billing_start_date || form.enrollment_date || new Date().toISOString().split('T')[0]);
          });
        } else if (key === 'duration_value' || key === 'duration_unit') {
          formData.append(key, "");
        } else if (key === 'admission_fee_not_required') {
          formData.append(key, form.admission_fee_not_required ? "1" : "0");
        } else {
          formData.append(key, (form as any)[key] !== undefined && (form as any)[key] !== null ? String((form as any)[key]) : "");
        }
      });

      // Calculate fee_month_year & admission_month_year (billing start month) from billing_start_date
      const billingStartDate = form.billing_start_date || form.enrollment_date || new Date();
      const billingBs = getBsDateParts(billingStartDate);
      const feeMonthYear = billingBs
        ? bsMonthYearToAdPeriod(billingBs.year, billingBs.month)
        : new Date().toISOString().substring(0, 7);
      formData.append("admission_month_year", feeMonthYear);
      formData.append("fee_month_year", feeMonthYear);
      formData.append("billing_start_date", typeof billingStartDate === 'string' ? billingStartDate : new Date(billingStartDate).toISOString().split('T')[0]);

      if (student) {
        formData.append("_method", "PUT");
      }

      const url = student
        ? `${BASE_URL}/admin/students/${student.id}`
        : `${BASE_URL}/admin/students`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setErrors(result.errors);

          // Scroll to the first error field
          const firstErrorKey = Object.keys(result.errors)[0];
          const elementId = firstErrorKey.replace(/\./g, "_");

          setTimeout(() => {
            const element = document.getElementById(elementId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
        } else {
          toast.error(result.message || "Something went wrong");
        }
        return;
      }

      toast.success(student ? "Student updated" : "Student created");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] relative overflow-visible max-h-[90vh] flex flex-col cursor-default shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-[2rem] p-8 lg:p-10" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute right-4 lg:right-6 md:top-5 top-14 lg:top-6 text-gray-400 hover:text-black transition-colors p-2 bg-gray-50 rounded-full">
            <X className="w-5 h-5" />
          </button>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 leading-tight">
              {student ? "Update Student" : "New Enrollment"}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <p className="text-gray-500 font-medium">Please fill in the student details below.</p>
              {!student && (
                <button
                  onClick={fetchBookings}
                  disabled={fetchingBookings}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {fetchingBookings ? "Searching..." : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Pull from Booking
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Booking Selection Overlay */}
          {showBookingList && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Select a Booking</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Import data quickly</p>
                </div>
                <button onClick={() => setShowBookingList(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredBookings.length > 0 ? filteredBookings.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => selectBooking(b)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all group text-left"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mr-4 group-hover:bg-blue-600 transition-colors">
                        <User className="w-5 h-5 text-blue-600 group-hover:text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{b.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> {b.phone}
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">
                            {b.program?.title}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </button>
                )) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <BookOpen className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No bookings found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Photo Section */}
            <div id="image" className="flex flex-col items-center sm:flex-row gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="relative group">
                <div className={`w-24 h-24 rounded-2xl bg-white shadow-inner flex items-center justify-center overflow-hidden border-2 border-dashed ${errors.image ? 'border-red-500' : 'border-slate-200'} group-hover:border-blue-500 transition-colors`}>
                  {previewImage ? (
                    <img src={previewImage} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                  accept="image/*"
                />
              </div>
              <div className="text-center sm:text-left">
                <p className={`font-bold ${errors.image ? 'text-red-500' : 'text-gray-900'}`}>Student Photo</p>
                <p className="text-xs text-gray-500 max-w-[200px]">Upload a clear photo. Recommended size: 500x500px.</p>
                {errors.image && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.image[0]}</p>}
                {previewImage && (
                  <button onClick={() => { setPreviewImage(null); setForm({ ...form, image: null }); }} className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-tighter hover:underline">Remove Photo</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                id="name"
                required
                icon={User}
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={loading}
                error={errors.name}
              />
              <InputField
                label="Roll Number"
                id="roll_no"
                icon={Hash}
                value={form.roll_no}
                onChange={(e) => handleChange("roll_no", e.target.value)}
                disabled={loading}
                error={errors.roll_no}
              />
              <InputField
                label="Phone Number"
                id="phone"
                required
                icon={Phone}
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={loading}
                error={errors.phone}
              />
              <InputField
                label="Email Address"
                id="email"
                icon={Mail}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={loading}
                error={errors.email}
              />
              <InputField
                label="Address"
                icon={MapPin}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={loading}
                error={errors.address}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div id="dob" className="w-full flex flex-col gap-1.5 animate-fade-in relative z-[45]">
                <label className="flex items-center text-[11px] font-black uppercase tracking-[0.15em] text-text-muted gap-2 ml-1">
                  Date of Birth
                </label>
                <NepaliDateInput
                  value={form.dob || ""}
                  onChange={(val) => handleChange("dob", val)}
                />
                {errors.dob && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.dob[0]}</p>}
              </div>

              <InputField
                label="Gender"
                type="select"
                icon={User}
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Other", value: "other" },
                ]}
                disabled={loading}
              />

              <div className="w-full flex flex-col gap-1.5 animate-fade-in justify-end pb-3 pl-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.admission_fee_not_required || false}
                      onChange={(e) => handleChange("admission_fee_not_required", e.target.checked)}
                      disabled={loading}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${form.admission_fee_not_required ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${form.admission_fee_not_required ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted">No Admission Fee</span>
                    <span className="text-[9px] text-gray-400 font-medium">Exempt from admission fee</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div id="enrollment_date" className="w-full flex flex-col gap-1.5 animate-fade-in relative z-[40]">
                <label className="flex items-center text-[11px] font-black uppercase tracking-[0.15em] text-text-muted gap-2 ml-1">
                  Admission Date
                </label>
                <NepaliDateInput
                  value={form.enrollment_date || ""}
                  onChange={(val) => {
                    setForm(prev => ({
                      ...prev,
                      enrollment_date: val,
                      billing_start_date: (!prev.billing_start_date || prev.billing_start_date === prev.enrollment_date) ? val : prev.billing_start_date
                    }));
                  }}
                />
                {errors.enrollment_date && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.enrollment_date[0]}</p>}
              </div>

              <div id="billing_start_date" className="w-full flex flex-col gap-1.5 animate-fade-in relative z-[40]">
                <label className="flex items-center text-[11px] font-black uppercase tracking-[0.15em] text-text-muted gap-2 ml-1">
                  Class / Billing Start Date
                </label>
                {/* <p className="text-[9px] font-semibold text-blue-600 mt-0.5 ml-1">Program fees start from this month</p> */}
                <NepaliDateInput
                  value={form.billing_start_date || form.enrollment_date || ""}
                  onChange={(val) => handleChange("billing_start_date", val)}
                />
              </div>

              <InputField
                label="Reference/Notes"
                id="offer_enroll_reference"
                icon={Star}
                placeholder="How did they find us?"
                value={form.offer_enroll_reference}
                onChange={(e) => handleChange("offer_enroll_reference", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Classes/Courses</p>
                </div>
                <p className="text-[10px] font-medium text-gray-400 italic">Select one or more</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {programs.map(p => {
                  const hasSub = p.sub_programs && p.sub_programs.length > 0;
                  if (hasSub) {
                    return p.sub_programs.map((sp: any) => (
                      <label
                        key={sp.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer bg-white ${isClassSelected(sp.id)
                          ? 'border-blue-500 ring-1 ring-blue-500/10 shadow-sm'
                          : 'border-slate-200 hover:border-blue-200'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isClassSelected(sp.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-slate-50 border-slate-200'
                          }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isClassSelected(sp.id)}
                            onChange={() => toggleClass(sp)}
                          />
                          {isClassSelected(sp.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-black text-gray-900">
                          {sp.title}
                        </span>
                      </label>
                    ));
                  }

                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer bg-white ${isClassSelected(p.id)
                        ? 'border-blue-500 ring-1 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 hover:border-blue-200'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isClassSelected(p.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isClassSelected(p.id)}
                          onChange={() => toggleClass(p)}
                        />
                        {isClassSelected(p.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-black text-gray-900">
                        {p.title}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Config for selected programs */}
              <div className="space-y-4 mt-6">
                {form.enrollments?.map((e: any) => {
                  const allProgramsFlat = programs.reduce((acc: any[], p) => {
                    acc.push(p);
                    if (p.sub_programs) acc.push(...p.sub_programs);
                    return acc;
                  }, []);

                  const prog = allProgramsFlat.find(p => p.id === e.program_id);
                  if (!prog) return null;
                  return (
                    <div key={e.program_id} className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-gray-900">{prog.title}</span>
                        <div className="flex items-center gap-3">
                          <select
                            value={e.status || "active"}
                            onChange={(ev) => updateEnrollment(e.program_id, { status: ev.target.value })}
                            className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-xl border-none outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all ${
                              e.status === "graduated"
                                ? "bg-purple-100 text-purple-700 font-black"
                                : e.status === "inactive"
                                ? "bg-amber-100 text-amber-700 font-black"
                                : "bg-emerald-100 text-emerald-700 font-black"
                            }`}
                          >
                            <option value="active" className="bg-white text-emerald-700 font-bold">Active</option>
                            <option value="graduated" className="bg-white text-purple-700 font-bold">Completed</option>
                            <option value="inactive" className="bg-white text-amber-700 font-bold">Inactive</option>
                          </select>

                          <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                              onClick={() => updateEnrollment(e.program_id, { type: 'regular' })}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${e.type === 'regular' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >REGULAR</button>
                            <button
                              onClick={() => updateEnrollment(e.program_id, { type: 'customization' })}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${e.type === 'customization' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >CUSTOM</button>
                          </div>
                        </div>
                      </div>

                      {e.type === 'regular' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          <div className="space-y-1 col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Available Slots</p>
                            <div className="flex flex-wrap gap-2">
                              {prog.schedules?.map((s: any) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    const current = e.schedule_ids || [];
                                    const next = current.includes(s.id) ? current.filter((id: any) => id !== s.id) : [...current, s.id];
                                    updateEnrollment(e.program_id, { schedule_ids: next, schedule_id: next[0] || null });
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${e.schedule_ids?.includes(s.id)
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                                    }`}
                                >
                                  {s.day} {to12h(s.start_time)} - {to12h(s.end_time)}
                                  {s.instructor && (
                                    <span className="ml-1 text-[8px] opacity-70">({s.instructor.name})</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Instructor</p>
                              <select
                                value={e.instructor_id || ""}
                                onChange={(ev) => {
                                  const instId = Number(ev.target.value);
                                  updateEnrollment(e.program_id, { instructor_id: instId });
                                  if (instId) fetchInstructorAvailability(instId);
                                }}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="">Select Instructor</option>
                                {prog.instructors?.map((inst: any) => (
                                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Start Time</p>
                              <input
                                type="time"
                                value={e.custom_start_time || ""}
                                onChange={(ev) => updateEnrollment(e.program_id, { custom_start_time: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">End Time</p>
                              <input
                                type="time"
                                value={e.custom_end_time || ""}
                                onChange={(ev) => updateEnrollment(e.program_id, { custom_end_time: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>

                          {/* Availability Grid for Custom Mode */}
                          {e.instructor_id && (
                            <div className="pt-2 space-y-3">
                              {loadingAvail === Number(e.instructor_id) ? (
                                <p className="text-[10px] text-gray-400 animate-pulse font-bold italic">Checking instructor's busy schedule...</p>
                              ) : instructorAvailabilities[Number(e.instructor_id)] ? (
                                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Free Intervals</p>
                                    {checkConflict(e) && (
                                      <div className="flex items-center gap-1 text-[9px] text-orange-500 font-bold animate-bounce">
                                        <AlertTriangle className="w-3 h-3" /> Time Conflict!
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {instructorAvailabilities[Number(e.instructor_id)].free?.map((seg: any, i: number) => (
                                      <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black border border-green-200">
                                        {to12h(seg.start)} - {to12h(seg.end)}
                                      </span>
                                    ))}
                                    {instructorAvailabilities[Number(e.instructor_id)].free?.length === 0 && (
                                      <p className="text-[9px] text-red-500 font-bold italic">No free slots found for this instructor.</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Occupied Intervals</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {instructorAvailabilities[Number(e.instructor_id)].booked?.map((seg: any, i: number) => (
                                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black border border-slate-200">
                                        {to12h(seg.start)} - {to12h(seg.end)}
                                      </span>
                                    ))}
                                    {instructorAvailabilities[Number(e.instructor_id)].booked?.length === 0 && (
                                      <p className="text-[9px] text-gray-400 font-bold italic">No occupied slots found.</p>
                                    )}
                                  </div>
                                  {checkConflict(e) && (
                                    <div className="mt-2 p-3 bg-red-500/10 border-2 border-red-500/20 rounded-xl flex items-start gap-3 animate-pulse">
                                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                      <div className="space-y-1">
                                        <strong className="text-[10px] font-black uppercase tracking-tighter text-red-700 block">⚠️ Scheduling Conflict</strong>
                                        <p className="text-[10px] text-red-700 font-medium leading-tight">
                                          The selected time <strong>({to12h(e.custom_start_time)} - {to12h(e.custom_end_time)})</strong> overlaps with another booking.
                                        </p>
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-1.5 py-0.5 rounded italic">Override Active: You can still save.</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Billing Mode + Fee + Discount + Commission */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">

                        {/* Row 1: Billing Mode */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Billing Mode</p>
                          <div className="flex gap-2">
                            {(["duration", "monthly", "fixed"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateEnrollment(e.program_id, { billing_mode: mode })}
                                className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                                  (e.billing_mode || "duration") === mode
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {mode === "duration" ? "Duration" : mode === "monthly" ? "Monthly" : "Fixed"}
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">
                            {(e.billing_mode || "duration") === "duration" && "Fee × duration months (current default)"}
                            {e.billing_mode === "monthly" && "Per-month rate — no multiplier. Supports carry-forward dues."}
                            {e.billing_mode === "fixed" && "Lump sum fee — can be paid in installments."}
                          </p>
                        </div>

                        {/* Row 2: Custom Fee + Commission */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {(e.billing_mode || "duration") === "monthly" ? "Monthly Rate" : (e.billing_mode === "fixed" ? "Fixed Total" : "Program Fee")}
                              </p>
                              {String(e.custom_fee) === String(prog.program_fee) && (
                                <span className="text-[9px] text-blue-400 font-bold">Default</span>
                              )}
                            </div>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-xs font-bold text-gray-400">Rs.</span>
                              <input
                                type="number"
                                min={0}
                                value={e.custom_fee !== undefined && e.custom_fee !== "" ? e.custom_fee : (prog?.program_fee ?? "")}
                                onChange={(ev) => updateEnrollment(e.program_id, { custom_fee: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Teacher Commission % (Override)</p>
                              <span className="text-[9px] text-gray-400 font-medium">Default: Global rate</span>
                            </div>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="e.g. 100, 0, or 50"
                                value={e.commission_percentage || ""}
                                onChange={(ev) => updateEnrollment(e.program_id, { commission_percentage: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-500/20"
                              />
                              <span className="absolute right-3 text-xs font-bold text-gray-400">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Monthly Discount Settings (only for Monthly mode) */}
                        {/* {e.billing_mode === "monthly" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                Default Monthly Discount (Recurring)
                              </p>
                              <span className="text-[9px] text-gray-400 font-medium">Applied automatically each month</span>
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={e.monthly_discount || ""}
                                  onChange={(ev) => updateEnrollment(e.program_id, { monthly_discount: ev.target.value })}
                                  className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl pl-3 pr-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                              <select
                                value={e.monthly_discount_type || "cash"}
                                onChange={(ev) => updateEnrollment(e.program_id, { monthly_discount_type: ev.target.value })}
                                className="text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              >
                                <option value="cash">Rs.</option>
                                <option value="percentage">%</option>
                              </select>
                            </div>
                          </div>
                        )} */}

                        {/* Row 4: Duration Settings (only for Duration mode) */}
                        {(e.billing_mode === "duration" || !e.billing_mode) && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Duration Value</p>
                              <input
                                type="number"
                                min="1"
                                placeholder="e.g. 3"
                                value={e.duration_value !== undefined && e.duration_value !== null ? e.duration_value : ""}
                                onChange={(ev) => updateEnrollment(e.program_id, { duration_value: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Duration Unit</p>
                              <select
                                value={e.duration_unit || "months"}
                                onChange={(ev) => updateEnrollment(e.program_id, { duration_unit: ev.target.value })}
                                className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              >
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <InputField
              label="Enrollment Status"
              id="status"
              type="select"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Graduated", value: "graduated" },
              ]}
              disabled={loading}
              error={errors.status}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Processing..." : student ? "Update Records" : "Confirm Enrollment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAddEditModal;
