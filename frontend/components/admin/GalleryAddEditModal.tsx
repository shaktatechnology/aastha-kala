"use client";

import React, { useEffect, useState } from "react";
import InputField from "@/components/layout/InputField";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { getYouTubeEmbedUrl } from "@/utils/url";

interface Category {
  id: number;
  name: string;
}

interface Gallery {
  id?: number;
  title: string;
  type: string;
  position?: string;
  video?: string;
  category_id?: string;
  description?: string;
  images?: (File | string)[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
  categories: Category[];
}

const GalleryAddEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  editData,
  categories,
}) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

  const [form, setForm] = useState<Gallery>({
    title: "",
    type: "images",
    position: "",
    video: "",
    category_id: "",
    description: "",
    images: [],
  });

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("blob:")) return path; // Skip for newly selected files
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const [loading, setLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);

  useEffect(() => {
    if (editData) {
      setForm({
        title: editData.title || "",
        type: editData.type || "images",
        position: editData.position || "",
        video: editData.video || "",
        category_id: editData.category?.id?.toString() || "",
        description: editData.description || "",
        images: [],
      });

      if (editData.images) {
        setPreviewImages(editData.images);
      }

      setRemovedImages([]);
    } else {
      setForm({
        title: "",
        type: "images",
        position: "",
        video: "",
        category_id: "",
        images: [],
      });
      setPreviewImages([]);
      setRemovedImages([]);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    if (loading) return;
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };


  const handleFileChange = (files: File[]) => {
    if (loading) return;
    
    // Update form state by appending new files
    setForm(prev => ({
      ...prev,
      images: [...(Array.isArray(prev.images) ? prev.images : []) as (File | string)[], ...files]
    }));

    // Update previewImages by appending new blob URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
  };


  const handleRemoveImage = (img: string, index: number) => {
    if (loading) return;
    
    // 1. Remove from preview list using index
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));

    // 2. Handle removal logic based on image type
    if (img.startsWith("blob:")) {
      // It's a newly added local file
      // Count how many blobs were before this one in the preview list to find its index in form.images
      const blobIndex = previewImages.slice(0, index).filter(url => url.startsWith("blob:")).length;
      
      setForm(prev => {
        const currentImages = [...(Array.isArray(prev.images) ? prev.images : []) as (File | string)[]];
        currentImages.splice(blobIndex, 1);
        return { ...prev, images: currentImages };
      });
      
      // Revoke the blob URL to free up memory
      URL.revokeObjectURL(img);
    } else {
      // It's an existing server-side image
      let relativePath = img;
      if (img.startsWith("http")) {
        const storageIdx = img.indexOf("/storage/");
        if (storageIdx !== -1) {
          relativePath = img.substring(storageIdx + "/storage/".length);
        } else {
          relativePath = img.replace(`${IMAGE_BASE?.replace(/\/$/, "")}/`, "");
        }
      } else {
        relativePath = img.replace(/^\/+/, "");
      }

      setRemovedImages((prev) => [...prev, relativePath]);
    }
  };


  const handleSubmit = async () => {
    if (!form.title?.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (form.type === "images" && previewImages.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    if (form.type === "video" && !form.video?.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("type", form.type);
      formData.append("position", form.position || "");
      formData.append("category_id", form.category_id || "");
      formData.append("description", form.description || "");

      if (form.type === "video") {
        formData.append("video", form.video || "");
      }

      if (form.type === "images" && form.images && form.images.length > 0) {
        form.images.forEach((file: any) => {
          formData.append("images[]", file);
        });
      }

      //  removed images
      if (editData && removedImages.length > 0) {
        removedImages.forEach((img) => {
          formData.append("removed_images[]", img);
        });
      }

      const url = editData
        ? `${BASE_URL}/admin/galleries/${editData.id}`
        : `${BASE_URL}/admin/galleries`;

      const method = "POST";

      if (editData) {
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          const validationErrors = result.errors as Record<string, string[]>;
          const firstError = Object.values(validationErrors)[0] as string[];
          throw new Error(firstError[0]);
        }
        throw new Error(result.message || "Something went wrong");
      }

      toast.success(editData ? "Updated successfully" : "Created successfully");

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = Array.isArray(categories) 
    ? categories.map((c: any) => ({
        label: c.name,
        value: c.id.toString(),
      }))
    : [];

  return (
    <div
      // onClick={onClose}
      className="fixed inset-0 bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center z-50 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/50 border border-white/20 backdrop-blur-xl shadow-2xl w-full max-w-2xl rounded-2xl p-8 relative overflow-y-auto max-h-[90vh] cursor-default"
      >
        {/* Close */}

        <h2 className="text-xl font-bold mb-6 text-primary uppercase italic tracking-tight border-b border-gray-200 pb-4 flex justify-between items-center">
          {editData ? "Edit Gallery" : "Add Gallery"}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </h2>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              disabled={loading}
            />


            <InputField
              label="Type"
              type="select"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              options={[
                { label: "Image", value: "images" },
                { label: "Video", value: "video" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Category"
              type="select"
              value={form.category_id}
              onChange={(e) => handleChange("category_id", e.target.value)}
              options={categoryOptions}
            />

            <InputField
              label="Position"
              type="select"
              value={form.position}
              onChange={(e) => handleChange("position", e.target.value)}
              options={[
                { label: "slider-home", value: "slider-home" },
                // { label: "about-home", value: "about-home" },
                { label: "about-intro", value: "about-intro" },
                { label: "gallery", value: "gallery" },
              ]}
            />
          </div>

          <InputField
            label="Description"
            type="textarea"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />

          {form.type === "video" && (
            <div className="space-y-3">
              <InputField
                label="Video URL"
                value={form.video}
                onChange={(e) => handleChange("video", e.target.value)}
              />

              {form.video && (
                <div className="mt-2 text-primary">
                  <span className="text-sm font-bold block mb-2 uppercase tracking-widest text-[10px] italic">
                    Video Preview
                  </span>
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/20">
                    <iframe
                      src={getYouTubeEmbedUrl(form.video)}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {form.type === "images" && (
            <div>
              <label className="text-sm text-gray-700 font-bold mb-2 block uppercase tracking-widest text-[10px] italic">
                Upload Images
              </label>

              <input
                type="file"
                multiple
                onChange={(e: any) =>
                  handleFileChange(Array.from(e.target.files))
                }
                className="text-gray-900 text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />

              {previewImages.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {previewImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={getImageUrl(img)}
                        className="w-20 h-20 object-cover rounded"
                      />

                      {/* remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img, index)}
                        className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-full cursor-pointer hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 cursor-pointer bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-black uppercase tracking-widest text-xs italic shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {loading ? "Saving..." : editData ? "Update Gallery Entry" : "Create Gallery Entry"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryAddEditModal;
