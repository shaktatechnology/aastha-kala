"use client";

import React, { useEffect, useState } from "react";
import InstructorsCard from "@/components/layout/InstructorsCard";
import ScrollReveal from "@/components/client/ScrollReveal";
import { motion } from "framer-motion";

interface Instructor {
  id: number;
  name: string;
  title?: string;
  about?: string;
  facebook_url?: string;
  instagram_url?: string;
  email?: string;
  phone?: string;
  image?: string;
}

const InstructorSection = ({ 
  instructors = [] 
}: { 
  instructors?: Instructor[] 
}) => {
  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    initial: { 
      opacity: 0, 
      y: -100, 
      scale: 0.9,
      filter: "blur(4px)"
    },
    animate: (yOffset: number) => ({ 
      opacity: 1, 
      y: yOffset, 
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1] as any
      }
    })
  };

  return (
    <section className="bg-white px-4 md:px-10 py-32 relative overflow-hidden">
      {/* Dynamic Rope SVG - Restored Woven Design */}
      <div className="absolute top-[260px] left-0 w-full pointer-events-none z-20 hidden lg:block">
        <svg 
          width="100%" 
          height="150" 
          viewBox="0 0 1440 150" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-70"
        >
          {/* Main Woven Rope */}
          <path 
            d="M-50 50C200 80 400 20 720 50C1040 80 1240 20 1490 50" 
            stroke="#27A0CF" 
            strokeWidth="6" 
            strokeLinecap="round"
            strokeDasharray="1 12"
          />
          {/* Subtle Glow Path */}
          <path 
            d="M-50 50C200 80 400 20 720 50C1040 80 1240 20 1490 50" 
            stroke="#27A0CF" 
            strokeWidth="2" 
            strokeLinecap="round"
            opacity="0.2"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal once={true} direction="up">
          <div className="text-center space-y-3 mb-24 relative z-0">
            {/* Animated Decorative background element */}
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3] 
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute left-1/2 -top-6 -translate-x-1/2 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" 
            />
            
            <h2 className="text-4xl md:text-5xl font-black text-gradient tracking-tight relative z-10 font-poppins">
              Meet Our Instructors
            </h2>
            <p className="text-text-muted text-base max-w-2xl mx-auto font-medium relative z-10 font-poppins">
              Learn from industry professionals who are dedicated to your artistic success and creative growth.
            </p>
          </div>
        </ScrollReveal>

        {/* INSTRUCTOR GRID - Staggered "Hanging" Layout */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 items-start"
          variants={containerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.05 }}
        >
          {Array.isArray(instructors) && instructors.length > 0 ? (
            instructors.slice(0, 4).map((inst, idx) => {
              // Custom vertical offsets - Final adjustment for the first card to touch the rope
              const offsets = [100, 85, 95, 70];
              const yOffset = offsets[idx % offsets.length];

              return (
                <motion.div 
                  key={inst.id} 
                  variants={itemVariants}
                  // We use custom to pass the target Y to the variant
                  custom={yOffset}
                  style={{ transformOrigin: "top right" }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="relative group"
                >
                  {/* Hanging Rope/Hook Decor - MOVED TO TOP RIGHT */}
                  <div className="absolute -top-24 right-12 flex flex-col items-center pointer-events-none hidden lg:flex">
                    <div className="w-[3px] h-24 bg-primary/40" />
                    <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-[0_0_15px_rgba(39,160,207,0.6)] relative">
                      <div className="absolute inset-0 rounded-full animate-ping bg-primary/20 scale-150" />
                    </div>
                  </div>

                  <InstructorsCard instructor={inst} />
                  
                  {/* High-density navy shadow on hover */}
                  <div className="absolute inset-0 rounded-xl pointer-events-none transition-shadow duration-300 group-hover:shadow-[0px_20px_40px_rgba(0,30,90,0.1)]" />
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
              No instructors available at the moment.
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default InstructorSection;
