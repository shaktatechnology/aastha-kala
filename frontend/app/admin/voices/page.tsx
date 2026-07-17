"use client";

import React, { useEffect, useState } from "react";
import Table from "@/components/layout/Table";
import DeleteConfirmationModal from "@/components/layout/DeleteConfirmationModal";
import toast from "react-hot-toast";
import { Plus, X, Image as ImageIcon, Star, Save, User } from "lucide-react";
import { Pagination } from "@/components/global/Pagination";
import InputField from "@/components/layout/InputField";
import { Portal } from "@/components/global/Portal";

interface Voice {
  id: number;
  name?: string;
  post?: string;
  paragraph?: string;
  image?: string | null;
  order: number;
  is_featured: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

// ─── Form Modal ──────────────────────────────────────────────────────────────

function VoiceModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  nextOrder,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Voice | null;
  nextOrder: number;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({ name: "", post: "", paragraph: "", order: 0, is_featured: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

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
      setForm({ name: initialData.name || "", post: initialData.post || "", paragraph: initialData.paragraph || "", order: initialData.order ?? 0, is_featured: initialData.is_featured ?? false });
      setPreview(getImageUrl(initialData.image));
      setImageFile(null);
    } else {
      setForm({ name: "", post: "", paragraph: "", order: nextOrder, is_featured: false });
      setPreview(null);
      setImageFile(null);
    }
  }, [isOpen, initialData, nextOrder]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});
      const url = isEdit ? `${API_URL}/admin/voices/${initialData!.id}` : `${API_URL}/admin/voices`;
      const fd = new FormData();
      if (form.name) fd.append("name", form.name);
      if (form.post) fd.append("post", form.post);
      if (form.paragraph) fd.append("paragraph", form.paragraph);
      fd.append("order", String(form.order));
      fd.append("is_featured", form.is_featured ? "1" : "0");
      if (imageFile) fd.append("image", imageFile);
      if (removeImage) fd.append("remove_image", "1");
      if (isEdit) fd.append("_method", "PUT");

      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: fd });
      const result = await res.json();
      if (!res.ok) { if (result.errors) { setErrors(result.errors); return; } throw new Error(result.message); }
      toast.success(isEdit ? "Updated successfully" : "Created successfully");
      onSuccess();
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-deep/20 backdrop-blur-md cursor-pointer" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-[95vw] max-w-2xl max-h-[96vh] overflow-hidden rounded-3xl bg-surface border border-white/10 shadow-2xl flex flex-col animate-scale-in cursor-default">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface/50 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-primary tracking-tight">{isEdit ? "Edit Voice" : "Add Voice"}</h2>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">Featured person quote</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-surface-hover rounded-xl transition-all text-text-muted hover:text-error cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Image */}
            <div className="flex flex-col items-center gap-4 py-4 bg-background/50 rounded-3xl border border-border/50 border-dashed">
              <div className="relative group">
                <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-primary/10">
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-surface flex items-center justify-center"><User className="w-10 h-10 text-text-muted/30" /></div>
                  }
                </div>
                <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-primary-hover active:scale-90 transition-all border-4 border-surface">
                  <input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); setRemoveImage(false); } }} disabled={loading} />
                  <ImageIcon className="w-4 h-4" />
                </label>
                {preview && (
                  <button type="button" onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }} className="absolute -top-2 -right-2 bg-error text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-surface hover:scale-110 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-text-muted font-medium">Optional — Person Photo</p>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Person Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={loading} error={errors.name} />
              <InputField label="Post / Role" value={form.post} onChange={(e) => setForm({ ...form, post: e.target.value })} disabled={loading} error={errors.post} />
            </div>

            <InputField label="Quote / Paragraph" textarea value={form.paragraph} onChange={(e) => setForm({ ...form, paragraph: e.target.value })} disabled={loading} error={errors.paragraph} />

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Order" type="number" value={String(form.order)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} disabled={loading} />
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-background transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                    disabled={loading}
                  />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Featured on Homepage</p>
                    <p className="text-[10px] text-text-muted">Shows below the hero section</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface/50">
            <button onClick={onClose} disabled={loading} className="px-5 py-2 text-sm font-bold text-text-muted border border-border rounded-xl hover:bg-background transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer">
              <Save className="w-4 h-4" />{loading ? "Saving..." : isEdit ? "Update Voice" : "Add Voice"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

const VoicesPage = () => {
  const [data, setData] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 15 });
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Voice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Voice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/voices?page=${page}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const json = await res.json();
      const items = json.data?.data || json.data || [];
      setData(items);
      if (json.data?.last_page) {
        setPagination({ currentPage: json.data.current_page, totalPages: json.data.last_page, totalItems: json.data.total, itemsPerPage: json.data.per_page });
      }
    } catch { toast.error("Failed to load voices"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/voices/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted successfully");
      fetchData(pagination.currentPage);
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(false); setDeleteOpen(false); setDeleteTarget(null); }
  };

  const columns = [
    { key: "sn", label: "SN" },
    { key: "image_cell", label: "Image" },
    { key: "name_cell", label: "Name" },
    { key: "post", label: "Post" },
    { key: "paragraph_cell", label: "Paragraph" },
    { key: "featured_cell", label: "Featured" },
    { key: "order", label: "Order" },
  ];

  const formattedData = data.map((item, idx) => ({
    ...item,
    sn: (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1,
    image_cell: item.image
      ? <img src={getImageUrl(item.image)} alt={item.name || ""} className="w-10 h-10 rounded-full object-cover" />
      : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>,
    name_cell: item.name || <span className="text-text-muted italic">—</span>,
    paragraph_cell: item.paragraph ? (item.paragraph.length > 80 ? item.paragraph.slice(0, 80) + "…" : item.paragraph) : <span className="text-text-muted italic">—</span>,
    featured_cell: item.is_featured
      ? <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">Yes</span>
      : <span className="px-2 py-0.5 rounded-full text-xs bg-border text-text-muted">No</span>,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 lg:p-6 bg-white border border-gray-200 rounded-2xl gap-6 shadow-sm">
        <span className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Voices</span>
        <button
          onClick={() => { setEditItem(null); setFormOpen(true); }}
          className="w-full sm:w-auto px-6 py-2.5 text-sm bg-gradient-to-r from-primary to-secondary text-white rounded-lg flex gap-2 items-center justify-center cursor-pointer font-bold"
        >
          <Plus className="h-4 w-4" /><span>Add Voice</span>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <Table columns={columns} data={formattedData} loading={loading} actions={["edit", "delete"]}
          onEdit={(row) => { const orig = data.find((d) => d.id === row.id); setEditItem(orig || null); setFormOpen(true); }}
          onDelete={(row) => { const orig = data.find((d) => d.id === row.id); setDeleteTarget(orig || null); setDeleteOpen(true); }}
          emptyMessage="No voices found. Add the first one!" />
        <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} itemsPerPage={pagination.itemsPerPage} onPageChange={fetchData} />
      </div>

      <VoiceModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => fetchData(pagination.currentPage)} initialData={editItem} nextOrder={pagination.totalItems + 1} />

      <DeleteConfirmationModal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDelete} loading={deleting}
        title="Delete Voice" description={`Are you sure you want to delete "${deleteTarget?.name || "this voice"}"?`} />
    </div>
  );
};

export default VoicesPage;
