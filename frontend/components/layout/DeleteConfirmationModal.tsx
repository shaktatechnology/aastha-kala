"use client";

import React from "react";
import { X, Trash2 } from "lucide-react";
import { Portal } from "../global/Portal";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Confirmation",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-deep/20 backdrop-blur-sm cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-surface w-full max-w-md cursor-default shadow-2xl rounded-xl border border-border overflow-hidden animate-scale-in"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/50">
            <h2 className="text-text-primary font-black uppercase tracking-tight text-sm">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-hover transition-all text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-error" />
              </div>
            </div>
            <p className="text-text-secondary text-sm font-bold leading-relaxed">{description}</p>
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-background/30">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-text-muted hover:text-text-primary border border-border hover:bg-surface-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white bg-error hover:bg-red-600 transition-all shadow-lg shadow-error/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete Now"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DeleteConfirmationModal;
