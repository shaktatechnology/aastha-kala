"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, ChevronRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface Program {
  id: number;
  title: string;
  description?: string;
  image?: string | null;
  program_fee?: number | string;
  sub_programs?: any[];
}

interface HomeFlipCardProps {
  program: Program;
  onBook: () => void;
}

/** Convert a title + id into a URL-friendly slug */
const toSlug = (title: string, id: string | number) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") +
  "-" +
  id;

const HomeFlipCard: React.FC<HomeFlipCardProps> = ({ program, onBook }) => {
  const [showAllTracks, setShowAllTracks] = useState(false);
  const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;
  const hasSubPrograms = program.sub_programs && program.sub_programs.length > 0;

  const getImageUrl = (path?: string | null) => {
    if (!path) return "/images/program-fallback.png";
    if (path.startsWith("http")) return path;
    if (!IMAGE_BASE) return "/images/program-fallback.png";
    return `${IMAGE_BASE?.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const handleJoinNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSubPrograms) {
      window.location.href = `/programs/${toSlug(program.title, program.id)}`;
    } else {
      onBook();
    }
  };

  return (
    <motion.div 
      className="relative h-[450px] md:h-[550px] w-full [perspective:1500px] group"
      initial="initial"
      whileHover="flipped"
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        variants={{
          initial: { rotateY: 0, scale: 1 },
          flipped: { rotateY: 180, scale: 1.02 }
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 [backface-visibility:hidden] w-full h-full">
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-100">
            <img 
              src={getImageUrl(program?.image)} 
              alt={program?.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).src = "/images/program-fallback.png" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="absolute bottom-12 left-8 right-8 flex flex-col items-center gap-6 text-center">
              <h3 className="text-white text-2xl md:text-3xl font-black uppercase leading-tight drop-shadow-2xl max-w-[280px]">
                {program?.title}
              </h3>
              
              <button
                onClick={handleJoinNow}
                className="shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-cyan-400 hover:bg-cyan-300 active:scale-90 transition-all duration-300 flex items-center justify-center hover:rotate-12 group/btn"
              >
                <span className="text-white text-[9px] md:text-[12px] font-black uppercase tracking-wider text-center leading-none">
                  JOIN<br/>NOW
                </span>
              </button>
            </div>

            {hasSubPrograms && (
              <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-[#001f54] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                <Layers className="w-3 h-3 text-cyan-500" /> {program.sub_programs!.length} Programs
              </div>
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] w-full h-full">
          <div className="bg-white rounded-2xl p-8 flex flex-col h-full text-[#001f54] border border-gray-100 relative overflow-hidden text-center">
            
            <h3 className="text-xl font-black mb-4 leading-tight border-b border-gray-50 pb-4 italic">{program?.title}</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-left">
              <p className="text-gray-500 text-xs leading-relaxed mb-6 font-medium italic">
                {program?.description || "Experience top-tier training with our specialized curriculum designed for all skill levels."}
              </p>

              {hasSubPrograms ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Included Programs</span>
                    {program.sub_programs!.length > 3 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllTracks(!showAllTracks);
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {showAllTracks ? "Less" : "More"}
                        {showAllTracks ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {(showAllTracks ? program.sub_programs! : program.sub_programs!.slice(0, 3)).map((sub, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100 group/item hover:bg-blue-50 hover:border-blue-100 transition-colors">
                        <span className="text-[10px] font-bold text-[#001f54] uppercase tracking-wider">{sub.title}</span>
                        <ChevronRight className="w-3 h-3 text-blue-300 group-hover/item:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Features</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold text-[#001f54] uppercase tracking-wider">Expert Guidance</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-center">
              <button
                onClick={handleJoinNow}
                className="group/btn relative flex items-center justify-center gap-2 bg-primary text-white w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
              >
                Join Now
                <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomeFlipCard;
