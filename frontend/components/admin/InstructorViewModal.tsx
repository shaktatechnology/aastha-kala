"use client";

import React, { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import { to12h } from "@/lib/timeFormat";

interface Instructor {
  id?: number;
  name: string;
  title?: string;
  about?: string;
  email?: string;
  phone?: string;
  facebook_url?: string;
  instagram_url?: string;
  image?: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  instructor: Instructor | null;
}

const InstructorViewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  instructor,
}) => {
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!instructor?.image) {
      setPreviewImage(null);
      return;
    }

    const img = instructor.image;

    if (typeof img === "string") {
      const url = img.startsWith("http") ? img : `${IMAGE_BASE}/${img}`;
      setPreviewImage(url);
    } else if (img?.url) {
      setPreviewImage(img.url);
    }
  }, [instructor]);

  if (!isOpen || !instructor) return null;

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl px-4 py-3 bg-background border border-border shadow-inner">
      <p className="text-[10px] text-text-muted font-black uppercase tracking-wider mb-1">{label}</p>
      <div className="text-text-primary text-sm font-semibold">{children}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-brand-deep/30 backdrop-blur-md flex items-center justify-center z-50 p-4 hide-scrollbar cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-xl p-8 relative space-y-4 cursor-default"
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute right-6 top-6 text-text-muted hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>


        <h2 className="text-xl font-black text-text-primary tracking-tight">
          Instructor Details
        </h2>

        {/* Profile */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full overflow-hidden border border-border bg-slate-50 flex items-center justify-center">
            {previewImage ? (
              <img
                src={previewImage}
                alt={instructor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-text-muted/40" />
            )}
          </div>

          <h3 className="text-lg font-black text-text-primary">
            {instructor.name}
          </h3>

          {instructor.title && (
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">{instructor.title}</p>
          )}
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Email">{instructor.email || "—"}</Field>
          <Field label="Phone">{instructor.phone || "—"}</Field>
          <Field label="Facebook">
            <span className="break-all">{instructor.facebook_url || "—"}</span>
          </Field>
          <Field label="Instagram">
            <span className="break-all">{instructor.instagram_url || "—"}</span>
          </Field>
        </div>

        {/* About */}
        <Field label="About">
          <div className="max-h-40 overflow-y-auto hide-scrollbar pr-2">
            <p className="whitespace-pre-wrap">
              {instructor.about || " "}
            </p>
          </div>
        </Field>

        {/* Availability Schedule */}
        {(instructor as any).availabilities?.length > 0 && (
          <div>
            <p className="text-xs font-black text-text-muted uppercase tracking-wider mb-3">Free Hours / Availability</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(instructor as any).availabilities.map((avail: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3 shadow-inner">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Daily</span>
                  <span className="text-xs font-bold text-text-primary">
                    {to12h(avail.start_time)} – {to12h(avail.end_time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(instructor as any).availabilities?.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-border rounded-xl bg-slate-50">
            <p className="text-xs text-text-muted font-black uppercase tracking-widest">No availability slots defined</p>
          </div>
        )}

        {/* Programs Section */}
        {(instructor as any).programs?.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-black text-text-muted uppercase tracking-wider mb-3">Programs Taught</p>
            <div className="flex flex-wrap gap-2">
              {(instructor as any).programs.map((program: any, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {program.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

export default InstructorViewModal;
