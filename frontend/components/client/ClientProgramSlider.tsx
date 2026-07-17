"use client";

import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import BookingModal from "../layout/BookingModal";

import HomeFlipCard from "./HomeFlipCard";
import { motion, AnimatePresence } from "framer-motion";

interface Schedule {
  id: number;
  start_time: string;
  end_time: string;
  instructor?: { name: string };
}

interface Program {
  id: number;
  title: string;
  description?: string;
  image?: string;
  speciality?: string[];
  is_active: boolean;
  schedules?: Schedule[];
  program_fee?: number | string;
  sub_programs?: any[];
}

interface ClientProgramSliderProps {
  programs: Program[];
  viewType?: "slider" | "grid";
}

const ClientProgramSlider: React.FC<ClientProgramSliderProps> = ({ programs, viewType = "slider" }) => {
  const [bookingProgram, setBookingProgram] = useState<Program | null>(null);

  const itemVariants = {
    initial: { 
      opacity: 0, 
      y: 40, 
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as any
      }
    }
  };

  const renderCard = (program: Program, index: number) => {
    return (
      <motion.div 
        key={program.id}
        layout 
        variants={itemVariants}
        initial="initial"
        animate="animate"
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ 
          y: -10,
          transition: { type: "spring", stiffness: 400, damping: 25 }
        }}
        className="relative group"
      >
        <HomeFlipCard 
          program={program as any}
          onBook={() => setBookingProgram(program)}
        />
        {/* High-density navy shadow on hover */}
        <motion.div 
          className="absolute inset-0 rounded-2xl pointer-events-none transition-shadow duration-300 group-hover:shadow-[0px_20px_40px_rgba(0,30,90,0.08)]"
        />
      </motion.div>
    );
  };

  return (
    <div className="program-slider-container relative">
      {viewType === "slider" ? (
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          spaceBetween={20}
          slidesPerView={4}
          loop={programs.length > 4}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          pagination={{ 
            clickable: true,
            el: ".program-pagination",
          }}
          navigation={{
            nextEl: ".program-next",
            prevEl: ".program-prev",
          }}
          breakpoints={{
            0: { slidesPerView: 1 },
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className="pb-16"
        >
          {programs.map((program, index) => (
            <SwiperSlide key={program.id}>
              {renderCard(program, index)}
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <motion.div 
          layout
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-6 pb-10"
        >
          <AnimatePresence mode="popLayout">
            {programs.map((program, index) => renderCard(program, index))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Custom Navigation Buttons (Only for slider) */}
      {viewType === "slider" && (
        <>
          <button className="program-prev absolute top-1/2 -left-4 md:-left-12 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-95 disabled:opacity-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button className="program-next absolute top-1/2 -right-4 md:-right-12 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-95 disabled:opacity-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <div className="program-pagination hidden" />
        </>
      )}

      {bookingProgram && (
        <BookingModal 
          program={bookingProgram as any}
          onClose={() => setBookingProgram(null)}
        />
      )}
    </div>
  );
};

export default ClientProgramSlider;
