"use client";

import React, { useState } from 'react';
import { ArrowUpRight, Sparkles, Layers, ChevronRight, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import BookingModal from "../layout/BookingModal";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const toSlug = (title: string, id: string | number) =>
  (title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "program") +
  "-" +
  id;

interface SubProgram {
  id: number;
  title: string;
  program_fee?: number | string;
}

interface Program {
  id: number;
  image?: string | null;
  title: string;
  description?: string;
  program_fee: number | string;
  sub_programs?: SubProgram[];
  schedules?: any[];
  speciality?: string[];
  is_active?: boolean;
}

const ProgramCard = ({ program, onBook }: { program: Program; onBook: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;
  const hasSubPrograms = program.sub_programs && program.sub_programs.length > 0;

  const getImageUrl = (path?: string | null) => {
    if (!path) return "/placeholder-dance.png";
    if (path.startsWith("http")) return path;
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const getPriceDisplay = () => {
    const mainFee = Number(program.program_fee);
    if (hasSubPrograms) {
      const fees = program.sub_programs!
        .map(sp => Number(sp.program_fee))
        .filter(fee => !isNaN(fee) && fee > 0);
      if (fees.length > 0) {
        const minFee = Math.min(...fees);
        const maxFee = Math.max(...fees);
        return minFee === maxFee ? minFee : `${minFee} - ${maxFee}`;
      }
    }
    return isNaN(mainFee) ? 0 : mainFee;
  };

  return (
    <div className="group bg-white rounded-[2rem] border border-gray-100 hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(0,31,84,0.08)] transition-all duration-500 overflow-hidden flex flex-col h-full">
      {/* Image Area */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={getImageUrl(program?.image)}
          alt={program?.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-dance.png" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001f54]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {hasSubPrograms && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-[#001f54] text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
            <Layers className="w-3 h-3" />
            {program.sub_programs!.length} Tracks
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-8 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-2xl font-black text-[#001f54] leading-tight">
              {program?.title || "Untitled Program"}
            </h3>
            {(program?.description?.length || 0) > 80 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 transition-all cursor-pointer shrink-0 mt-0.5"
                title={isExpanded ? "Show Less" : "Read More"}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <p className={cn(
            "text-gray-500 text-sm leading-relaxed font-medium transition-all duration-300",
            !isExpanded && "line-clamp-2"
          )}>
            {program?.description || "Master the art of performance with our structured curriculum and professional instructors."}
          </p>
        </div>

        {/* Tracks/Sub-programs */}
        <div className="flex flex-wrap gap-2 mb-8 mt-auto">
          {program?.sub_programs && program.sub_programs.length > 0 ? (
            program.sub_programs.slice(0, 3).map((sub, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wide">
                {sub.title}
              </span>
            ))
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wide">
              Foundation Level
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-50">
          {hasSubPrograms ? (
            <Link
              href={`/programs/${toSlug(program.title, program.id)}`}
              className="flex items-center justify-center gap-2 bg-primary text-white w-full py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-primary/90 transition-all active:scale-95"
            >
              View Available Tracks <ArrowUpRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={onBook}
              className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold tracking-wide cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
            >
              Join Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ClientPrograms({ programs }: { programs: Program[] | { data: Program[] } }) {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  // Robust data handling
  const data = Array.isArray(programs) ? programs : (programs as { data: Program[] })?.data || [];

  if (data.length === 0) {
    return (
      <div className="text-center py-32 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Sparkles className="w-10 h-10 text-blue-300" />
        </div>
        <h3 className="text-[#001f54] font-black uppercase tracking-widest text-xl mb-2">Schedules Updating</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto font-medium leading-relaxed">
          We are currently refining our program schedules. Please check back shortly for new sessions!
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {data.map((p: Program) => (
          <ProgramCard
            key={p.id}
            program={p}
            onBook={() => setSelectedProgram(p)}
          />
        ))}
      </div>

      {selectedProgram && (
        <BookingModal
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      )}
    </section>
  );
}
