"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Captions, FileTypeCorner, Wallet, Activity, Hash, Check } from "lucide-react";
import toast from "react-hot-toast";
import InputField from "../layout/InputField";
import { Portal } from "../global/Portal";

interface Instructor {
  id: number;
  name: string;
}

interface Schedule {
  id?: number;
  instructor_id: string | number;
  start_time: string;
  end_time: string;
}

interface SubProgram {
  id?: number;
  title: string;
  program_fee: string;
  schedules: Schedule[];
}

interface ProgramAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any;
  onSuccess: () => void;
}


const ProgramAddEditModal: React.FC<ProgramAddEditModalProps> = ({
  isOpen,
  onClose,
  program,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [speciality, setSpeciality] = useState<string[]>([""]);
  const [isActive, setIsActive] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([]);
  const [programFee, setProgramFee] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen) {
      fetchInstructors();
      if (program) {
        setTitle(program.title || "");
        setDescription(program.description || "");
        setImagePreview(program.image || null);
        setSpeciality(program.speciality || [""]);
        setIsActive(program.is_active ?? true);
        setProgramFee(program.program_fee?.toString() ?? "");
        setSchedules(program.schedules?.map((s: any) => ({
          ...s,
          instructor_id: s.instructor_id ?? "",
          start_time: s.start_time?.substring(0, 5) || "",
          end_time: s.end_time?.substring(0, 5) || "",
        })) || []);
        
        setSubPrograms(program.sub_programs?.map((sp: any) => ({
          ...sp,
          program_fee: sp.program_fee?.toString() ?? "",
          schedules: sp.schedules?.map((s: any) => ({
            ...s,
            instructor_id: s.instructor_id ?? "",
            start_time: s.start_time?.substring(0, 5) || "",
            end_time: s.end_time?.substring(0, 5) || "",
          })) || [],
        })) || []);
      } else {
        resetForm();
      }
      setErrors({});
    }
  }, [isOpen, program]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImage(null);
    setImagePreview(null);
    setSpeciality([""]);
    setIsActive(true);
    setSchedules([]);
    setSubPrograms([]);
    setProgramFee("");
    setErrors({});
  };

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

  const addSpeciality = () => setSpeciality([...speciality, ""]);
  const removeSpeciality = (index: number) => {
    const newSpec = speciality.filter((_, i) => i !== index);
    setSpeciality(newSpec.length ? newSpec : [""]);
  };

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      { start_time: "07:00", end_time: "08:00", instructor_id: "" },
    ]);
  };

  const removeSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);

    // Re-evaluate conflicts for the new set of schedules to fix indexing issues
    setConflicts({});
    newSchedules.forEach((s, newIndex) => {
      if (s.instructor_id && s.start_time && s.end_time) {
        checkConflict(newIndex, s.instructor_id, s.start_time, s.end_time, "main");
      }
    });
  };

  const addSubProgram = () => {
    setSubPrograms([
      ...subPrograms,
      { title: "", program_fee: "", schedules: [] },
    ]);
  };

  const removeSubProgram = (index: number) => {
    setSubPrograms(subPrograms.filter((_, i) => i !== index));
  };

  const addSubSchedule = (subIndex: number) => {
    const newSub = [...subPrograms];
    newSub[subIndex].schedules.push({ start_time: "07:00", end_time: "08:00", instructor_id: "" });
    setSubPrograms(newSub);
  };

  const removeSubSchedule = (subIndex: number, scheduleIndex: number) => {
    const newSub = [...subPrograms];
    newSub[subIndex].schedules = newSub[subIndex].schedules.filter((_, i) => i !== scheduleIndex);
    setSubPrograms(newSub);
  };

  const [conflicts, setConflicts] = useState<{ [key: string]: string }>({});

  const checkConflict = async (index: number | string, instructorId: string | number, start: string, end: string, type: "main" | "sub" = "main") => {
    if (loading) return;
    const conflictKey = `${type}_${index}`;
    if (!instructorId || !start || !end) {
      setConflicts(prev => {
        const newConflicts = { ...prev };
        delete newConflicts[conflictKey];
        return newConflicts;
      });
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/instructors/${instructorId}/check-conflict?start_time=${start}&end_time=${end}${program?.id ? `&exclude_program_id=${program.id}` : ""}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.conflict) {
        setConflicts(prev => ({ ...prev, [conflictKey]: data.message }));
      } else {
        setConflicts(prev => {
          const newConflicts = { ...prev };
          delete newConflicts[conflictKey];
          return newConflicts;
        });
      }
    } catch (error) {
      console.error("Conflict check failed", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(conflicts).length > 0) {
      toast.error("Please resolve any instructor scheduling conflicts before saving.");
      return;
    }

    // Check for duplicate/overlapping schedules within the form
    for (let i = 0; i < schedules.length; i++) {
      const s1 = schedules[i];
      if (!s1.instructor_id || !s1.start_time || !s1.end_time) continue;

      for (let j = i + 1; j < schedules.length; j++) {
        const s2 = schedules[j];
        if (!s2.instructor_id || !s2.start_time || !s2.end_time) continue;

        if (s1.instructor_id === s2.instructor_id) {
          if (s1.start_time < s2.end_time && s2.start_time < s1.end_time) {
            toast.error("Multiple slots with overlapping times for the same instructor are not allowed.");
            return;
          }
        }
      }
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("is_active", isActive ? "1" : "0");
    if (image) formData.append("image", image);
    if (programFee) formData.append("program_fee", programFee);

    speciality.forEach((s, i) => {
      if (s) formData.append(`speciality[${i}]`, s);
    });

    schedules.forEach((s, i) => {
      if (s.id) formData.append(`schedules[${i}][id]`, s.id.toString());
      formData.append(`schedules[${i}][start_time]`, s.start_time);
      formData.append(`schedules[${i}][end_time]`, s.end_time);
      if (s.instructor_id) formData.append(`schedules[${i}][instructor_id]`, s.instructor_id.toString());
    });

    subPrograms.forEach((sp, i) => {
      if (sp.id) formData.append(`sub_programs[${i}][id]`, sp.id.toString());
      formData.append(`sub_programs[${i}][title]`, sp.title);
      formData.append(`sub_programs[${i}][program_fee]`, sp.program_fee);
      
      sp.schedules.forEach((s, j) => {
        if (s.id) formData.append(`sub_programs[${i}][schedules][${j}][id]`, s.id.toString());
        formData.append(`sub_programs[${i}][schedules][${j}][start_time]`, s.start_time);
        formData.append(`sub_programs[${i}][schedules][${j}][end_time]`, s.end_time);
        if (s.instructor_id) formData.append(`sub_programs[${i}][schedules][${j}][instructor_id]`, s.instructor_id.toString());
      });
    });

    try {
      const url = program
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/programs/${program.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/programs`;

      const method = program ? "POST" : "POST";
      if (program) formData.append("_method", "PUT");

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      const data = await res.json();
      setErrors({});

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);

          // Scroll to the first error field
          const firstErrorKey = Object.keys(data.errors)[0];
          const elementId = firstErrorKey.replace(/\./g, "_");

          setTimeout(() => {
            const element = document.getElementById(elementId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);

          return;
        }
        throw new Error(data.message || "Failed to save program");
      }

      toast.success(program ? "Program updated" : "Program created");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-deep/20 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[95vw] max-w-5xl max-h-[96vh] overflow-hidden rounded-3xl bg-surface border border-white/10 shadow-2xl flex flex-col animate-scale-in cursor-default"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-primary tracking-tight">
                  {program ? "Edit Program Details" : "Create New Program"}
                </h2>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
                  Manage academic offerings and schedules
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-surface-hover rounded-xl transition-all text-text-muted hover:text-error cursor-pointer border border-transparent hover:border-error/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Main Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Title & Description */}
                <div className="space-y-6">
                  <InputField
                    label="Program Title"
                    id="title"
                    icon={Captions}
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors(prev => ({ ...prev, title: [] }));
                    }}
                    disabled={loading}
                    error={errors.title}
                    placeholder="e.g. Vocal Training (Advanced)"
                  />

                  <InputField
                    label="Program Description"
                    id="description"
                    icon={FileTypeCorner}
                    textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors(prev => ({ ...prev, description: [] }));
                    }}
                    disabled={loading}
                    error={errors.description}
                    placeholder="Provide a detailed overview of the program objectives..."
                  />

                  <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-3">Cover Media</label>
                    <div className="flex flex-col gap-4">
                      {imagePreview && (
                        <div className="relative w-full h-48 group overflow-hidden rounded-2xl border border-border bg-background/50 shadow-inner">
                          <img src={imagePreview} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-brand-deep/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <span className="text-xs font-black uppercase tracking-widest text-white">Change Image</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImage(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="text-[10px] text-text-muted file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Details & Fee */}
                <div className="space-y-6">
                  <div className="bg-background/50 border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Key Specialities</label>
                      <button 
                        type="button" 
                        onClick={loading ? undefined : addSpeciality} 
                        disabled={loading}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                      >
                        + Add Detail
                      </button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {speciality.map((s, index) => (
                        <div key={index} id={`speciality_${index}`} className="flex gap-2 animate-fade-in">
                          <div className="flex-1">
                            <InputField
                              label=""
                              icon={Hash}
                              value={s}
                              onChange={(e) => {
                                const newSpec = [...speciality];
                                newSpec[index] = e.target.value;
                                setSpeciality(newSpec);
                                if (errors[`speciality.${index}`]) {
                                  setErrors(prev => ({ ...prev, [`speciality.${index}`]: [] }));
                                }
                              }}
                              disabled={loading}
                              error={errors[`speciality.${index}`]}
                              placeholder="Feature or requirement..."
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={loading ? undefined : () => removeSpeciality(index)} 
                            disabled={loading}
                            className="p-2 text-text-muted hover:text-error transition-all mt-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <InputField
                    label="Standard Monthly Fee"
                    icon={Wallet}
                    type="number"
                    value={programFee}
                    onChange={(e) => {
                      setProgramFee(e.target.value);
                      if (errors.program_fee) setErrors(prev => ({ ...prev, program_fee: [] }));
                    }}
                    disabled={loading}
                    error={errors.program_fee}
                    placeholder="e.g. 5000"
                  />

                  <div 
                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-background/50 border-border opacity-60'}`}
                    onClick={loading ? undefined : () => setIsActive(!isActive)}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-primary text-white' : 'bg-surface border-2 border-border'}`}>
                      {isActive && <Check className="w-4 h-4" strokeWidth={4} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-primary uppercase tracking-tight">Active Program</p>
                      <p className="text-[10px] text-text-muted font-bold">Publicly visible and enrollable</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedules Section */}
              <div className="pt-8 border-t border-border">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Master Schedule</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">General time slots for this program</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={loading ? undefined : addSchedule} 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {schedules.map((s, index) => (
                    <div key={index} id={`schedules_${index}`} className="grid grid-cols-1 sm:grid-cols-7 gap-6 p-6 bg-background/50 border border-border rounded-2xl group hover:border-primary/30 transition-all">
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-[9px] font-black uppercase text-text-muted tracking-widest">Start Time</label>
                        <input
                          type="time"
                          value={s.start_time}
                          onChange={(e) => {
                            const newS = [...schedules];
                            newS[index].start_time = e.target.value;
                            setSchedules(newS);
                            checkConflict(index, newS[index].instructor_id, e.target.value, s.end_time, "main");
                          }}
                          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-black text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-[9px] font-black uppercase text-text-muted tracking-widest">End Time</label>
                        <input
                          type="time"
                          value={s.end_time}
                          onChange={(e) => {
                            const newS = [...schedules];
                            newS[index].end_time = e.target.value;
                            setSchedules(newS);
                            checkConflict(index, newS[index].instructor_id, s.start_time, e.target.value, "main");
                          }}
                          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-black text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-[9px] font-black uppercase text-text-muted tracking-widest">Instructor</label>
                          <select
                            value={s.instructor_id}
                            onChange={(e) => {
                              const newS = [...schedules];
                              newS[index].instructor_id = e.target.value;
                              setSchedules(newS);
                              checkConflict(index, e.target.value, s.start_time, s.end_time, "main");
                            }}
                            className={`w-full bg-surface border rounded-xl px-4 py-3 text-sm font-black text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all appearance-none ${conflicts[`main_${index}`] ? 'border-error' : 'border-border'}`}
                          >
                            <option value="">Assign Teacher</option>
                            {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                          </select>
                          {conflicts[`main_${index}`] && <p className="text-[9px] text-error font-bold mt-1 uppercase tracking-tighter">{conflicts[`main_${index}`]}</p>}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeSchedule(index)}
                          className="p-3 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Programs Section */}
              <div className="pt-8 border-t border-border">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Variations / Sub-Programs</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Define specific courses under this program</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={loading ? undefined : addSubProgram} 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-secondary/20 hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" /> New Sub-Program
                  </button>
                </div>

                <div className="space-y-6">
                  {subPrograms.map((sp, subIndex) => (
                    <div key={subIndex} className="p-6 bg-background/50 border border-border rounded-3xl space-y-6 shadow-sm">
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputField
                            label="Sub-Program Name"
                            value={sp.title}
                            onChange={(e) => {
                              const newSub = [...subPrograms];
                              newSub[subIndex].title = e.target.value;
                              setSubPrograms(newSub);
                            }}
                            placeholder="e.g. Morning Batch - Beginner"
                          />
                          <InputField
                            label="Custom Fee (Optional)"
                            type="number"
                            value={sp.program_fee}
                            onChange={(e) => {
                              const newSub = [...subPrograms];
                              newSub[subIndex].program_fee = e.target.value;
                              setSubPrograms(newSub);
                            }}
                            placeholder="Inherits main fee if empty"
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeSubProgram(subIndex)}
                          className="p-3 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="pl-6 border-l-2 border-primary/20 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Individual Sessions</h4>
                          <button 
                            type="button" 
                            onClick={() => addSubSchedule(subIndex)}
                            className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-all"
                          >
                            + New Session
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {sp.schedules.map((s, sIndex) => (
                            <div key={sIndex} className="grid grid-cols-1 sm:grid-cols-7 gap-4 p-4 bg-surface border border-border/50 rounded-2xl shadow-sm">
                              <div className="sm:col-span-2">
                                <input
                                  type="time"
                                  value={s.start_time}
                                  onChange={(e) => {
                                    const newSub = [...subPrograms];
                                    newSub[subIndex].schedules[sIndex].start_time = e.target.value;
                                    setSubPrograms(newSub);
                                    checkConflict(`${subIndex}_${sIndex}`, s.instructor_id, e.target.value, s.end_time, "sub");
                                  }}
                                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-black text-text-primary outline-none focus:border-primary transition-all"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="time"
                                  value={s.end_time}
                                  onChange={(e) => {
                                    const newSub = [...subPrograms];
                                    newSub[subIndex].schedules[sIndex].end_time = e.target.value;
                                    setSubPrograms(newSub);
                                    checkConflict(`${subIndex}_${sIndex}`, s.instructor_id, s.start_time, e.target.value, "sub");
                                  }}
                                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-black text-text-primary outline-none focus:border-primary transition-all"
                                />
                              </div>
                              <div className="sm:col-span-3 flex items-center gap-3">
                                <select
                                  value={s.instructor_id}
                                  onChange={(e) => {
                                    const newSub = [...subPrograms];
                                    newSub[subIndex].schedules[sIndex].instructor_id = e.target.value;
                                    setSubPrograms(newSub);
                                    checkConflict(`${subIndex}_${sIndex}`, e.target.value, s.start_time, s.end_time, "sub");
                                  }}
                                  className={`flex-1 bg-background border rounded-lg px-3 py-2 text-xs font-black text-text-primary outline-none focus:border-primary transition-all appearance-none ${conflicts[`sub_${subIndex}_${sIndex}`] ? 'border-error' : 'border-border/50'}`}
                                >
                                  <option value="">Teacher</option>
                                  {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                                </select>
                                <button type="button" onClick={() => removeSubSchedule(subIndex, sIndex)} className="p-2 text-text-muted hover:text-error transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              {conflicts[`sub_${subIndex}_${sIndex}`] && (
                                <div className="sm:col-span-7">
                                  <p className="text-[9px] text-error font-bold uppercase tracking-tighter">{conflicts[`sub_${subIndex}_${sIndex}`]}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-5 border-t border-border bg-surface/80 backdrop-blur-xl flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-hover transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? "Synchronizing..." : (program ? "Update Program" : "Launch Program")}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ProgramAddEditModal;
