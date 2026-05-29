"use client";

import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { formatDateShort } from "@/lib/utils";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Star } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  title: string | null;
  description: string;
  rating: number;
  order: number;
  image: string | null;
  created_at: string;
}

interface ClientTestimonialSliderProps {
  data: Testimonial[];
}

const ClientTestimonialSlider: React.FC<ClientTestimonialSliderProps> = ({ data }) => {
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const truncateText = (text: string, limit: number) => {
    if (text.length <= limit) return text;
    return text.slice(0, limit) + "...";
  };

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      spaceBetween={24}
      slidesPerView={3}
      loop={data.length > 1}
      autoplay={{
        delay: 3000,
        disableOnInteraction: false,
      }}
      pagination={{ clickable: true }}
      breakpoints={{
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      }}
      className="pb-12 testimonial-swiper"
    >
      {data.map((item) => (
        <SwiperSlide key={item.id}>
          <div className="bg-white min-h-60 rounded-2xl p-6 shadow-md border-b-4 border-secondary h-full flex flex-col justify-between hover:shadow-xl transition">
            {/* User */}
            <div className="flex gap-4 mb-4">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                  {item.name.charAt(0)}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-secondary text-lg">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {item.title || "Vocal Student"}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < item.rating
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed">
              {expanded.includes(item.id)
                ? item.description
                : truncateText(item.description, 70)}
            </p>

            {item.description.length > 70 && (
              <div className="mt-1 text-left">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-secondary text-sm font-medium hover:underline"
                >
                  {expanded.includes(item.id) ? "See less" : "See more"}
                </button>
              </div>
            )}

            {/* Date */}
            <p className="text-xs text-gray-400 mt-4">
              {formatDateShort(item.created_at)}
            </p>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default ClientTestimonialSlider;
