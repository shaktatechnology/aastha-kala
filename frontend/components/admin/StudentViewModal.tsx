"use client";

import React from "react";
import { X, User, Phone, MapPin, Mail, Calendar, Clock, BookOpen, Star, CreditCard, Percent, Hash } from "lucide-react";
import { formatDate } from "@/lib/utils";

import Link from "next/link";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

const StudentViewModal: React.FC<Props> = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-[2rem] p-8 relative overflow-y-auto max-h-[90vh] cursor-default shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-black transition-colors p-2 bg-gray-50 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-3xl bg-slate-100 overflow-hidden mb-4 border-4 border-white shadow-xl">
                {student.image_url ? (
                    <img src={student.image_url} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <User className="w-16 h-16 text-slate-300" />
                    </div>
                )}
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-1">{student.name}</h2>
            <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                student.status === 'active' ? 'bg-green-100 text-green-700' : 
                student.status === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
                {student.status}
            </div>
        </div>

        <div className="mt-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Course Enrollments</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.enrollments && student.enrollments.length > 0 ? student.enrollments.map((en: any) => (
                    <div key={en.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-gray-900">{en.program?.title}</p>
                             <div className="flex gap-1.5">
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                                     en.status === 'graduated' ? 'bg-green-500 text-white' : 
                                     en.status === 'inactive' ? 'bg-gray-400 text-white' : 
                                     'bg-blue-600 text-white'
                                 }`}>
                                     {en.status || 'ACTIVE'}
                                 </span>
                                 <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 text-gray-600 rounded font-bold uppercase">{en.booking?.type || 'REGULAR'}</span>
                             </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                <User className="w-3 h-3 text-secondary" />
                            </div>
                            <div>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Instructor</p>
                                <p className="text-[11px] font-bold text-gray-700">{en.booking?.instructor?.name || "No instructor assigned"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                <CreditCard className="w-3 h-3 text-secondary" />
                            </div>
                            <div>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Monthly Fee</p>
                                <p className="text-[11px] font-bold text-gray-700">
                                    Rs. {en.custom_fee !== null && en.custom_fee !== undefined ? `${Number(en.custom_fee).toLocaleString()} (Custom)` : `${Number(en.program?.program_fee || 0).toLocaleString()} (Default)`}
                                </p>
                            </div>
                        </div>

                        {en.commission_percentage !== null && en.commission_percentage !== undefined && (
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                    <Percent className="w-3 h-3 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Commission Override</p>
                                    <p className="text-[11px] font-bold text-gray-700">
                                        {en.commission_percentage}% (Custom)
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                <Clock className="w-3 h-3 text-secondary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Schedule/Timing</p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {en.booking?.type === 'customization' ? (
                                        <span className="text-[10px] font-bold text-gray-700">
                                            {en.booking.custom_start_time?.substring(0,5)} - {en.booking.custom_end_time?.substring(0,5)}
                                        </span>
                                    ) : (
                                        en.booking?.schedules?.length > 0 ? en.booking.schedules.map((s: any) => (
                                            <span key={s.id} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-gray-100 text-gray-600 font-medium">
                                                {s.day} {s.start_time.substring(0,5)}
                                            </span>
                                        )) : <span className="text-[10px] text-gray-400 italic">No slot selected</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-gray-400 italic col-span-2">No active enrollments found.</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Personal Details</p>
                <DetailItem icon={Phone} label="Phone" value={student.phone} />
                <DetailItem icon={Mail} label="Email" value={student.email || "N/A"} />
                <DetailItem icon={MapPin} label="Address" value={student.address || "N/A"} />
                <DetailItem icon={Calendar} label="D.O.B" value={student.dob ? formatDate(student.dob) : "N/A"} />
                <DetailItem icon={Calendar} label="Enrollment Date" value={student.enrollment_date ? formatDate(student.enrollment_date) : "N/A"} />
            </div>
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Other Info</p>
                <DetailItem icon={Hash} label="Roll Number" value={student.roll_no || "N/A"} />
                <DetailItem icon={Clock} label="Duration" value={student.duration_value ? `${student.duration_value} ${student.duration_unit}` : "N/A"} />
                <DetailItem icon={Star} label="Reference" value={student.offer_enroll_reference || "N/A"} />
                <DetailItem icon={User} label="Gender" value={student.gender || "N/A"} />
            </div>
        </div>

        {student.fees && student.fees.length > 0 && (
            <div className="mt-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment History</p>
                    <Link 
                        href={`/admin/fees?student_id=${student.id}`}
                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                        View Full Invoice Ledger &rarr;
                    </Link>
                </div>
                <div className="space-y-2">

                    {student.fees.map((fee: any) => (
                        <div key={fee.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center">
                                <div className="p-2 bg-white rounded-xl mr-4">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 capitalize">{fee.fee_type} {fee.month_year && `(${fee.month_year})`}</p>
                                    <p className="text-[10px] text-gray-500">{formatDate(fee.created_at)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900">Rs. {fee.paid_amount}</p>
                                <span className={`text-[10px] font-bold uppercase ${fee.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                    {fee.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-start">
        <div className="p-2 bg-blue-50 rounded-xl mr-3">
            <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            <p className="text-sm font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

export default StudentViewModal;
