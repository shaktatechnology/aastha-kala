'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Upload, X, Clock, User, Wallet, 
  Activity, AlertCircle, Hash, BookOpen, Captions, 
  Layout, Layers, ImageIcon, ChevronDown, Save, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';

const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return "";
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

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
  description?: string;
  program_fee: string;
  schedules: Schedule[];
  image?: File | string | null;
  remove_image?: boolean;
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="size-3" />
      {message}
    </p>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

// --- Main Program Form ---

export function ProgramForm({ 
  initialData, 
  onSuccess,
  onCancel,
  isViewMode = false
}: { 
  initialData?: any,
  onSuccess: () => void,
  onCancel: () => void,
  isViewMode?: boolean
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [instructors, setInstructors] = React.useState<Instructor[]>([]);
  
  // Form state
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [programFee, setProgramFee] = React.useState(initialData?.program_fee || "");
  const [isActive, setIsActive] = React.useState(initialData?.is_active ?? true);
  const [speciality, setSpeciality] = React.useState<string[]>(initialData?.speciality || []);
  const [image, setImage] = React.useState<File | null>(null);
  const [newSpeciality, setNewSpeciality] = React.useState("");
  const [schedules, setSchedules] = React.useState<Schedule[]>(initialData?.schedules?.map((s: any) => ({
    ...s,
    start_time: s.start_time?.substring(0, 5) || "",
    end_time: s.end_time?.substring(0, 5) || ""
  })) || []);
  const [subPrograms, setSubPrograms] = React.useState<SubProgram[]>(initialData?.sub_programs?.map((sp: any) => ({
    ...sp,
    schedules: sp.schedules?.map((s: any) => ({
      ...s,
      start_time: s.start_time?.substring(0, 5) || "",
      end_time: s.end_time?.substring(0, 5) || ""
    })) || []
  })) || []);

  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/instructors?all=1`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      const list = data.data?.data || data.data || [];
      setInstructors(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to fetch instructors", error);
    }
  };

  const addSpeciality = () => {
    if (newSpeciality.trim() && !speciality.includes(newSpeciality.trim())) {
      setSpeciality([...speciality, newSpeciality.trim()]);
      setNewSpeciality("");
    }
  };

  const removeSpeciality = (index: number) => {
    setSpeciality(speciality.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      const formData = new FormData();
      if (initialData) formData.append('_method', 'PUT');
      
      formData.append('title', title);
      formData.append('description', description);
      formData.append('program_fee', programFee);
      formData.append('is_active', isActive ? '1' : '0');
      
      speciality.forEach((s, i) => formData.append(`speciality[${i}]`, s));
      if (image) formData.append('image', image);
      
      schedules.forEach((s, i) => {
        if (s.id) formData.append(`schedules[${i}][id]`, s.id.toString());
        formData.append(`schedules[${i}][start_time]`, s.start_time);
        formData.append(`schedules[${i}][end_time]`, s.end_time);
        if (s.instructor_id) formData.append(`schedules[${i}][instructor_id]`, s.instructor_id.toString());
      });

      subPrograms.forEach((sp, i) => {
        if (sp.id) formData.append(`sub_programs[${i}][id]`, sp.id.toString());
        formData.append(`sub_programs[${i}][title]`, sp.title);
        if (sp.description) formData.append(`sub_programs[${i}][description]`, sp.description);
        formData.append(`sub_programs[${i}][program_fee]`, sp.program_fee);
        
        if (sp.remove_image) formData.append(`sub_programs[${i}][remove_image]`, '1');
        if (sp.image instanceof File) formData.append(`sub_programs[${i}][image]`, sp.image);

        sp.schedules.forEach((s, j) => {
          if (s.id) formData.append(`sub_programs[${i}][schedules][${j}][id]`, s.id.toString());
          formData.append(`sub_programs[${i}][schedules][${j}][start_time]`, s.start_time);
          formData.append(`sub_programs[${i}][schedules][${j}][end_time]`, s.end_time);
          if (s.instructor_id) formData.append(`sub_programs[${i}][schedules][${j}][instructor_id]`, s.instructor_id.toString());
        });
      });

      const response = await fetch(`${API_URL}/admin/programs${initialData ? `/${initialData.id}` : ''}`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem("token")}` 
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) setErrors(errorData.errors);
        throw new Error(errorData.message || 'Operation failed');
      }

      toast.success(`Program ${initialData ? 'updated' : 'created'} successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addSchedule = () => {
    setSchedules([...schedules, { start_time: "09:00", end_time: "10:00", instructor_id: "" }]);
  };

  const removeSchedule = (i: number) => {
    setSchedules(schedules.filter((_, idx) => idx !== i));
  };

  const addSubProgram = () => {
    setSubPrograms([...subPrograms, { title: "", description: "", program_fee: "", schedules: [] }]);
  };
  
  const removeSubProgram = (i: number) => {
    setSubPrograms(subPrograms.filter((_, idx) => idx !== i));
  };
  
  const addSubSchedule = (subIdx: number) => {
    const newSubs = [...subPrograms];
    newSubs[subIdx].schedules.push({ start_time: "09:00", end_time: "10:00", instructor_id: "" });
    setSubPrograms(newSubs);
  };

  const removeSubSchedule = (subIdx: number, slotIdx: number) => {
    const newSubs = [...subPrograms];
    newSubs[subIdx].schedules = newSubs[subIdx].schedules.filter((_, i) => i !== slotIdx);
    setSubPrograms(newSubs);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-7xl mx-auto flex flex-col">
      {/* Header */}
      <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isViewMode ? 'View Program' : (initialData ? 'Edit Program' : 'Create New Program')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isViewMode ? 'Detailed overview of the program' : `Fill in the details below to ${initialData ? 'update' : 'create'} your program`}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors sm:hidden"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className={cn("p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto custom-scrollbar", isViewMode && "pointer-events-none")}>
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="size-5 text-blue-600" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <FieldLabel label="Program Title" required />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Classical Vocal Training"
                  className="w-full h-11 text-base"
                />
                <ErrorMessage message={errors.title?.[0]} />
              </div>
              
              <div>
                <FieldLabel label="Description" />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the program, its objectives, and what students will learn..."
                  rows={4}
                  className="text-base"
                />
                <ErrorMessage message={errors.description?.[0]} />
              </div>
            </div>

            <div>
              <FieldLabel label="Program Image" />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                {image || initialData?.image ? (
                  <div className="relative">
                    <img
                      src={image ? URL.createObjectURL(image) : (initialData?.image ? (initialData.image.startsWith('http') ? initialData.image : `${IMAGE_BASE?.replace(/\/$/, "")}/${initialData.image.replace(/^\/+/, "")}`) : '')}
                      alt="Program"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-8">
                    <Upload className="size-10 text-gray-400 mx-auto mb-3" />
                    <span className="text-sm text-gray-500">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {subPrograms.length > 0 ? (
              <>
                <Activity className="size-5 text-blue-600" />
                Status
              </>
            ) : (
              <>
                <Wallet className="size-5 text-blue-600" />
                Pricing & Status
              </>
            )}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {subPrograms.length === 0 && (
              <div>
                <FieldLabel label="Monthly Fee" required />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                  <Input
                    type="number"
                    value={programFee}
                    onChange={(e) => setProgramFee(e.target.value)}
                    className="pl-8 h-11 text-base"
                    placeholder="0"
                  />
                </div>
                <ErrorMessage message={errors.program_fee?.[0]} />
              </div>
            )}

            <div>
              <FieldLabel label="Status" />
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  "w-full px-4 py-2 text-left rounded-lg border transition-all h-11",
                  isActive 
                    ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" 
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{isActive ? 'Active' : 'Inactive'}</span>
                  <div className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    isActive ? "bg-green-500" : "bg-gray-400"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      isActive ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Specialities */}
        {/* <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Hash className="size-5 text-blue-600" />
            Specialities
          </h3>
          
          <div className="flex gap-3">
            <Input
              value={newSpeciality}
              onChange={(e) => setNewSpeciality(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSpeciality()}
              placeholder="Add a speciality (e.g., Beginner, Advanced)"
              className="flex-1 h-11 text-base"
            />
            <Button 
              type="button" 
              onClick={addSpeciality} 
              className="bg-primary hover:bg-primary/90 text-white px-6 h-11"
            >
              <Plus className="size-4 mr-2" />
              Add
            </Button>
          </div>
          
          {speciality.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {speciality.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  {s}
                  <button 
                    onClick={() => removeSpeciality(i)} 
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div> */}

        {/* Schedules */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              Schedule
            </h3>
            {subPrograms.length === 0 && (
              <Button 
                type="button" 
                onClick={addSchedule} 
                className="bg-primary hover:bg-primary/90 text-white px-6 h-11"
              >
                <Plus className="size-4 mr-2" />
                Add Time Slot
              </Button>
            )}
          </div>
          
          {subPrograms.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <AlertCircle className="size-4 inline mr-2" />
              Schedules are managed through sub-programs below. Main program slots will be automatically calculated.
            </div>
          )}
          
          <div className="space-y-3">
            {schedules.map((schedule, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-start bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-gray-100 sm:border-0">
                <div className="w-full sm:flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => {
                        const newSchedules = [...schedules];
                        newSchedules[index].start_time = e.target.value;
                        setSchedules(newSchedules);
                      }}
                      disabled={subPrograms.length > 0}
                      className="h-11 text-base w-full"
                    />
                    {schedule.start_time && (
                      <p className="text-[10px] text-gray-500 mt-1 pl-1 font-medium">{formatTime12h(schedule.start_time)}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => {
                        const newSchedules = [...schedules];
                        newSchedules[index].end_time = e.target.value;
                        setSchedules(newSchedules);
                      }}
                      disabled={subPrograms.length > 0}
                      className="h-11 text-base w-full"
                    />
                    {schedule.end_time && (
                      <p className="text-[10px] text-gray-500 mt-1 pl-1 font-medium">{formatTime12h(schedule.end_time)}</p>
                    )}
                  </div>
                </div>
                <div className="w-full sm:flex-1">
                  <CustomSelect
                    value={schedule.instructor_id}
                    onChange={(val) => {
                      const newSchedules = [...schedules];
                      newSchedules[index].instructor_id = val;
                      setSchedules(newSchedules);
                    }}
                    disabled={subPrograms.length > 0}
                    options={[
                      { value: "", label: "Select Instructor" },
                      ...instructors.map(inst => ({
                        value: inst.id.toString(),
                        label: inst.name
                      }))
                    ]}
                    placeholder="Select Instructor"
                  />
                </div>
                <ErrorMessage message={errors[`schedules.${index}.instructor_id`]?.[0]} />
                {subPrograms.length === 0 && schedules.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSchedule(index)}
                    className="text-gray-400 hover:text-red-500 h-11 w-11"
                  >
                    <Trash2 className="size-5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sub Programs */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="size-5 text-blue-600" />
              Sub Programs
            </h3>
            <Button 
              type="button" 
              onClick={addSubProgram} 
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="size-4 mr-2" />
              Add Sub Program
            </Button>
          </div>
          
          <div className="space-y-4">
            {subPrograms.map((subProgram, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/30">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <FieldLabel label="Sub Program Title" required />
                    <Input
                      value={subProgram.title}
                      onChange={(e) => {
                        const newSubs = [...subPrograms];
                        newSubs[index].title = e.target.value;
                        setSubPrograms(newSubs);
                      }}
                      placeholder="e.g., Beginner Level, Advanced Course"
                      className="h-11 text-base"
                    />
                    <ErrorMessage message={errors[`sub_programs.${index}.title`]?.[0]} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubProgram(index)}
                    className="text-red-500 ml-3 mt-6"
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Program Fee" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                      <Input
                        type="number"
                        value={subProgram.program_fee}
                        onChange={(e) => {
                          const newSubs = [...subPrograms];
                          newSubs[index].program_fee = e.target.value;
                          setSubPrograms(newSubs);
                        }}
                        className="pl-8 h-11 text-base"
                        placeholder="0"
                      />
                    </div>
                    <ErrorMessage message={errors[`sub_programs.${index}.program_fee`]?.[0]} />
                  </div>
                  <div>
                    <FieldLabel label="Description" />
                    <Textarea
                      value={subProgram.description}
                      onChange={(e) => {
                        const newSubs = [...subPrograms];
                        newSubs[index].description = e.target.value;
                        setSubPrograms(newSubs);
                      }}
                      rows={2}
                      className="text-base"
                      placeholder="Brief description of this sub-program"
                    />
                    <ErrorMessage message={errors[`sub_programs.${index}.description`]?.[0]} />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Sub-Program Image" />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                    {subProgram.image ? (
                      <div className="relative inline-block">
                        <img
                          src={typeof subProgram.image === 'string' ? (subProgram.image.startsWith('http') ? subProgram.image : `${IMAGE_BASE?.endsWith('/') ? IMAGE_BASE.slice(0, -1) : IMAGE_BASE}/${subProgram.image.startsWith('/') ? subProgram.image.slice(1) : subProgram.image}`) : URL.createObjectURL(subProgram.image as File)}
                          alt="Sub-Program"
                          className="w-32 h-32 object-cover rounded-lg mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newSubs = [...subPrograms];
                            newSubs[index].image = null;
                            newSubs[index].remove_image = true;
                            setSubPrograms(newSubs);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <Upload className="size-6 text-gray-400 mx-auto mb-2" />
                        <span className="text-xs text-gray-500">Upload Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const newSubs = [...subPrograms];
                              newSubs[index].image = file;
                              newSubs[index].remove_image = false;
                              setSubPrograms(newSubs);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Time Slots</label>
                    <Button
                      type="button"
                      onClick={() => addSubSchedule(index)}
                      variant="outline"
                      size="sm"
                      className="border-primary bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="size-3 mr-1" />
                      Add Slot
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {subProgram.schedules.map((schedule, slotIndex) => (
                      <div key={slotIndex} className="flex flex-col sm:flex-row gap-3 items-start bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border border-gray-100 sm:border-0">
                        <div className="w-full sm:flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              type="time"
                              value={schedule.start_time}
                              onChange={(e) => {
                                const newSubs = [...subPrograms];
                                newSubs[index].schedules[slotIndex].start_time = e.target.value;
                                setSubPrograms(newSubs);
                              }}
                              className="h-10 w-full"
                            />
                            {schedule.start_time && (
                              <p className="text-[10px] text-gray-500 mt-1 pl-1 font-medium">{formatTime12h(schedule.start_time)}</p>
                            )}
                          </div>
                          <div>
                            <Input
                              type="time"
                              value={schedule.end_time}
                              onChange={(e) => {
                                const newSubs = [...subPrograms];
                                newSubs[index].schedules[slotIndex].end_time = e.target.value;
                                setSubPrograms(newSubs);
                              }}
                              className="h-10 w-full"
                            />
                            {schedule.end_time && (
                              <p className="text-[10px] text-gray-500 mt-1 pl-1 font-medium">{formatTime12h(schedule.end_time)}</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full sm:flex-1">
                          <CustomSelect
                            value={schedule.instructor_id}
                            onChange={(val) => {
                              const newSubs = [...subPrograms];
                              newSubs[index].schedules[slotIndex].instructor_id = val;
                              setSubPrograms(newSubs);
                            }}
                            options={[
                              { value: "", label: "Select Instructor" },
                              ...instructors.map(inst => ({
                                value: inst.id.toString(),
                                label: inst.name
                              }))
                            ]}
                            placeholder="Select Instructor"
                          />
                        </div>
                        <ErrorMessage message={errors[`sub_programs.${index}.schedules.${slotIndex}.instructor_id`]?.[0]} />
                        {subProgram.schedules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSubSchedule(index, slotIndex)}
                            className="text-red-500 h-10 w-10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
        {isViewMode ? (
          <Button 
            type="button" 
            onClick={onCancel}
            className="w-full sm:w-auto bg-gray-800 text-white px-8 h-11 text-base font-medium"
          >
            Close
          </Button>
        ) : (
          <>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="w-full sm:w-auto px-6 h-11 text-black bg-white border border-gray-300 hover:bg-gray-100 hover:cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={isLoading}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 h-11 text-base font-medium shadow-sm hover:cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  {initialData ? 'Update Program' : 'Create Program'}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}