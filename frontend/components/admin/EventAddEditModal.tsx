"use client";

import React, { useEffect, useState } from "react";
import InputField from "@/components/layout/InputField";
import EditorComponent from "@/components/layout/EditorComponent";
import { X, AlignLeft, Captions, MapPin, Calendar, User, Phone, CheckCircle, Info, Image as ImageIcon, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Portal } from "../global/Portal";

interface EventData {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  status: "draft" | "published";
  is_active: boolean;
  banner?: File | string | null;
  contact_person_name?: string;
  contact_person_phone?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: any;
}

const EventAddEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  event,
}) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const [form, setForm] = useState<EventData>({
    title: "",
    description: "",
    event_date: "",
    location: "",
    status: "draft",
    is_active: false,
    banner: null,
    contact_person_name: "",
    contact_person_phone: "",
  });

  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setForm({
        title: event.title || "",
        description: event.description || "",
        event_date: event.event_date
          ? (() => {
              const d = new Date(event.event_date);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const hours = String(d.getHours()).padStart(2, '0');
              const minutes = String(d.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day}T${hours}:${minutes}`;
            })()
          : "",
        location: event.location || "",
        status: event.status || "draft",
        contact_person_name: event.contact_person_name || "",
        contact_person_phone: event.contact_person_phone || "",
        is_active: event.is_active || false,
        banner: null,
      });

      setPreviewBanner(
        event.banner
          ? event.banner.startsWith("http")
            ? event.banner
            : `${IMAGE_BASE}/${event.banner}`
          : null
      );
    } else {
      setForm({
        title: "",
        description: "",
        event_date: "",
        location: "",
        status: "draft",
        contact_person_name: "",
        contact_person_phone: "",
        is_active: false,
        banner: null,
      });

      setPreviewBanner(null);
    }

    setErrors({});
  }, [isOpen, event, IMAGE_BASE]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    if (loading) return;
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleBannerChange = (file: File | null) => {
    if (loading) return;
    handleChange("banner", file);

    if (file) {
      setPreviewBanner(URL.createObjectURL(file));
    }
  };

  const handleRemoveBanner = () => {
    if (loading) return;
    setForm((prev) => ({
      ...prev,
      banner: null,
    }));
    setPreviewBanner(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description || "");
      formData.append("event_date", form.event_date);
      formData.append("location", form.location);
      formData.append("status", form.status);
      formData.append("is_active", form.is_active ? "1" : "0");
      formData.append("contact_person_name", form.contact_person_name || "");
      formData.append("contact_person_phone", form.contact_person_phone || "");

      if (form.banner instanceof File) {
        formData.append("banner", form.banner);
      }

      if (event && !previewBanner && !form.banner) {
        formData.append("remove_banner", "1");
      }

      const url = event
        ? `${BASE_URL}/admin/events/${event.id}`
        : `${BASE_URL}/admin/events`;

      const method = "POST";

      if (event) {
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setErrors(result.errors);
          const firstErrorKey = Object.keys(result.errors)[0];
          const elementId = firstErrorKey.replace(/\./g, "_");
          setTimeout(() => {
            const element = document.getElementById(elementId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
          return;
        }
        throw new Error(result.message || "Something went wrong");
      }

      toast.success(event ? "Updated successfully" : "Created successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-deep/20 backdrop-blur-md cursor-pointer p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[96vh] flex flex-col animate-scale-in cursor-default"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center sticky top-0 z-20">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {event ? 'Edit Event' : 'Add New Event'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the details below to {event ? 'update' : 'add'} an event
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-black/5 transition-colors group"
            >
              <X className="size-5 text-gray-400 group-hover:text-gray-900" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Title"
                  icon={Captions}
                  required
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  disabled={loading}
                  error={errors.title}
                  placeholder="Enter event title"
                />

                <InputField
                  label="Location"
                  icon={MapPin}
                  required
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  disabled={loading}
                  error={errors.location}
                  placeholder="e.g. Studio Hall A"
                />

                <InputField
                  label="Event Date"
                  icon={Calendar}
                  type="datetime-local"
                  required
                  value={form.event_date}
                  onChange={(e) => handleChange("event_date", e.target.value)}
                  disabled={loading}
                  error={errors.event_date}
                />

                <InputField
                  label="Status"
                  icon={Info}
                  type="select"
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Published", value: "published" },
                  ]}
                  disabled={loading}
                  error={errors.status}
                />

                <InputField
                  label="Overlay Ad Active"
                  icon={CheckCircle}
                  type="select"
                  value={form.is_active ? "1" : "0"}
                  onChange={(e) => handleChange("is_active", e.target.value === "1")}
                  options={[
                    { label: "Disabled", value: "0" },
                    { label: "Active (Show as Popup)", value: "1" },
                  ]}
                  disabled={loading}
                  error={errors.is_active}
                />
              </div>

              <EditorComponent
                label="Description"
                icon={AlignLeft}
                value={form.description || ""}
                onChange={(val: string) => handleChange("description", val)}
              />

              {/* Banner Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Image
                </label>
                <div className="flex items-start gap-6">
                  <div className="size-48 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 relative group transition-colors hover:border-primary/50">
                    {previewBanner ? (
                      <img src={previewBanner} alt="Banner preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="size-12 text-gray-300" />
                    )}
                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                      <input type="file" hidden onChange={(e) => handleBannerChange(e.target.files?.[0] || null)} accept="image/*" />
                      <span className="text-xs text-white font-bold bg-primary/80 px-3 py-1.5 rounded-lg">Upload</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-3">
                      Upload a high-quality banner image for the event. This will be shown on the public website. Recommended: 1920x1080px.
                    </p>
                    {previewBanner && (
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="text-xs text-red-500 font-bold uppercase hover:underline flex items-center gap-1"
                      >
                        <X className="size-3" /> Remove Banner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 rounded-lg text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white px-10 h-11 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>{event ? 'Update Event' : 'Create Event'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default EventAddEditModal;
