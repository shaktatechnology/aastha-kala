"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface EventData {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  status: "draft" | "published";
  banner?: string | null;
  contact_person_name?: string;
  contact_person_phone?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event?: EventData | null;
}

const EventViewModal: React.FC<Props> = ({ isOpen, onClose, event }) => {
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);

  useEffect(() => {
    if (event?.banner) {
      if (event.banner.startsWith("http")) {
        // Defensive check: If production returns localhost URL due to misconfigured APP_URL, fix it
        if (typeof window !== "undefined" && !window.location.host.includes("localhost") && event.banner.includes("localhost")) {
          const path = event.banner.split("/storage/")[1] || "";
          setPreviewBanner(`${IMAGE_BASE}/${path}`);
        } else {
          setPreviewBanner(event.banner);
        }
      } else {
        setPreviewBanner(`${IMAGE_BASE}/${event.banner}`);
      }
    } else {
      setPreviewBanner(null);
    }
  }, [event, IMAGE_BASE]);

  if (!isOpen || !event) return null;

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="p-px rounded-xl bg-linear-to-r from-primary/20 to-secondary/20">
      <div className="rounded-xl px-4 py-3 bg-primary/10 backdrop-blur-md border border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <p className="text-sm text-primary font-semibold mb-1">{label}</p>
        <div className="text-black/90 font-medium">{children}</div>
      </div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-white/5 backdrop-blur-lg flex items-center justify-center z-50 hide-scrollbar cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/40 border border-primary/20 backdrop-blur-md w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-xl p-6 relative space-y-4 cursor-default"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-primary hover:text-black transition-colors">
          <X />
        </button>

        <h2 className="text-xl font-bold mb-2 text-primary">Event Details</h2>

        <Field label="Title">{event.title}</Field>

        <Field label="Location">{event.location}</Field>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Contact Person Name">
            {event.contact_person_name || "—"}
          </Field>

          <Field label="Contact Person Phone">
            {event.contact_person_phone || "—"}
          </Field>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Event Date">
            {formatDateTime(event.event_date)}
          </Field>

          <Field label="Status">
            <span className="capitalize">{event.status}</span>
          </Field>
        </div>

        <Field label="Description">
          <div 
            className="max-h-40 overflow-y-auto hide-scrollbar pr-2 text-black/90
              [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: event.description || "—" }}
          />
        </Field>

        <Field label="Banner">
          {previewBanner ? (
            <img
              src={previewBanner}
              alt="Event Banner"
              className="w-full max-h-64 object-cover rounded-lg"
            />
          ) : (
            <p className="text-primary/40 font-medium">No banner available</p>
          )}
        </Field>
      </div>
    </div>
  );
};

export default EventViewModal;
