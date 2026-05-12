"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  User,
  Star,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import InputField from "../layout/InputField";
import { Portal } from "../global/Portal";

interface Testimonial {
  id?: number;
  name: string;
  description: string;
  title?: string;
  rating: number;
  order: number;
  image?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Testimonial | null;
  nextOrder?: number;
}

const TestimonialAddEdit: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  nextOrder,
}) => {
  const isEdit = !!initialData;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const [form, setForm] = useState<Testimonial>({
    name: "",
    title: "",
    description: "",
    rating: 5,
    order: 1,
  });

  const [errors, setErrors] = useState<{ [key: string]: string[] }>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);

  const getImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setErrors({});
    setRemoveImage(false);

    if (initialData) {
      setForm({
        name: initialData.name || "",
        title: initialData.title || "",
        description: initialData.description || "",
        rating: initialData.rating || 0,
        order: initialData.order || 0,
      });

      setPreview(getImageUrl(initialData.image));
      setImageFile(null);
    } else {
      setForm({
        name: "",
        title: "",
        description: "",
        rating: 5,
        order: nextOrder || 1,
      });

      setPreview(null);
      setImageFile(null);
    }
  }, [isOpen, initialData, nextOrder]);

  const handleChange = (key: keyof Testimonial, value: any) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "rating" || key === "order" ? Number(value) : value,
    }));

    if (errors[key as string]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key as string];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});

      const url = isEdit
        ? `${API_URL}/admin/testimonials/${initialData?.id}`
        : `${API_URL}/admin/testimonials`;

      const formData = new FormData();

      formData.append("name", form.name || "");
      formData.append("title", form.title || "");
      formData.append("description", form.description || "");
      formData.append("rating", String(form.rating || 0));
      formData.append("order", String(form.order || 0));

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (removeImage) {
        formData.append("remove_image", "1");
      }

      if (isEdit) {
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          const validationErrors = result.errors as Record<string, string[]>;
          setErrors(validationErrors);

          const firstErrorKey = Object.keys(validationErrors)[0];
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

      toast.success(isEdit ? "Updated successfully" : "Created successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
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
          className="w-[95vw] max-w-2xl max-h-[96vh] overflow-hidden rounded-3xl bg-surface border border-white/10 shadow-2xl flex flex-col animate-scale-in cursor-default"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-primary tracking-tight">
                  {isEdit ? "Edit Testimonial" : "Create Testimonial"}
                </h2>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
                  Manage student and parent feedback
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
            <div className="space-y-8">
              {/* Image Section */}
              <div className="flex flex-col items-center gap-4 py-4 bg-background/50 rounded-3xl border border-border/50 border-dashed">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-primary/10 transition-all group-hover:ring-primary/20">
                    {preview ? (
                      <img src={preview} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <User className="w-10 h-10 text-text-muted/30" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20 cursor-pointer hover:bg-primary-hover active:scale-90 transition-all border-4 border-surface">
                    <input type="file" hidden onChange={handleImageChange} disabled={loading} />
                    <ImageIcon className="w-4 h-4" />
                  </label>
                  {preview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setImageFile(null);
                        setRemoveImage(true);
                      }}
                      className="absolute -top-2 -right-2 bg-error text-white p-2 rounded-xl shadow-lg shadow-error/20 hover:bg-red-600 transition-all border-4 border-surface"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-text-primary uppercase tracking-tight">Display Avatar</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Recommended: Square 400x400</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Author Name"
                  icon={User}
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={loading}
                  error={errors.name}
                  placeholder="e.g. John Doe"
                />

                <InputField
                  label="Professional Title"
                  icon={FileText}
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  disabled={loading}
                  error={errors.title}
                  placeholder="e.g. Parent / Music Enthusiast"
                />

                <InputField
                  label="Rating (1-5)"
                  icon={Star}
                  type="number"
                  required
                  value={form.rating}
                  onChange={(e) => handleChange("rating", e.target.value)}
                  disabled={loading}
                  error={errors.rating}
                  min={1}
                  max={5}
                />

                <InputField
                  label="Display Order"
                  icon={Plus}
                  type="number"
                  required
                  value={form.order}
                  onChange={(e) => handleChange("order", e.target.value)}
                  disabled={loading}
                  error={errors.order}
                  min={1}
                />

                <div className="md:col-span-2">
                  <InputField
                    label="Testimonial Content"
                    icon={FileText}
                    required
                    textarea
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    disabled={loading}
                    error={errors.description}
                    placeholder="Share the feedback or review here..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-5 border-t border-border bg-surface/80 backdrop-blur-xl flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-hover transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <span>{isEdit ? "Update feedback" : "Launch Feedback"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default TestimonialAddEdit;
