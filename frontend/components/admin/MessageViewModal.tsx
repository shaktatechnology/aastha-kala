"use client";

import React from "react";
import { X, User, Mail, Phone, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Message {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  message: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

const MessageViewModal: React.FC<Props> = ({ isOpen, onClose, message }) => {
  if (!isOpen || !message) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white/90 border border-white/20 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 uppercase italic tracking-tight">
            <Mail className="w-5 h-5 text-primary" />
            Message Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/50 border border-transparent hover:border-white/20 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Sender Name
              </label>
              <div className="flex items-center gap-2 text-primary font-bold">
                <User className="w-4 h-4 text-primary/70" />
                {message.full_name}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Received Date
              </label>
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDateTime(message.created_at)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-primary">
                <Mail className="w-4 h-4 text-primary" />
                {message.email}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex items-center gap-2 text-primary">
                <Phone className="w-4 h-4 text-primary" />
                {message.phone_number || "N/A"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">
              Message Content
            </label>
            <div className="p-5 bg-white/40 rounded-xl text-primary font-medium whitespace-pre-wrap leading-relaxed border border-white/20 shadow-inner italic">
              "{message.message}"
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/20 p-6 flex justify-end border-t border-white/10">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageViewModal;
