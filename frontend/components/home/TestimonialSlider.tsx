"use client";

import React, { useEffect, useState } from "react";
import ClientTestimonialSlider from "@/components/client/ClientTestimonialSlider";
import ScrollReveal from "@/components/client/ScrollReveal";
import { motion } from "framer-motion";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TestimonialSlider = () => {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch(`${API_URL}/testimonials`);
        const json = await res.json();
        const testimonials = json?.data?.data || json?.data || [];
        if (Array.isArray(testimonials)) {
          setData(testimonials.sort((a: Testimonial, b: Testimonial) => a.order - b.order));
        }
      } catch (error) {
        console.error("Failed to fetch testimonials", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  if (loading) return null;
  if (data.length === 0) return null;

  return (
    <section className="bg-white pt-8 pb-16 px-6 font-poppins relative overflow-hidden">
      {/* Pulse background element */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ 
          duration: 9, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute left-10 top-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" 
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h4 className="text-primary font-bold mb-2 uppercase tracking-widest">Student Success Stories</h4>
            <h2 className="text-4xl font-bold text-primary font-poppins">
              What Our Students Say
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <ClientTestimonialSlider data={data} />
        </ScrollReveal>
      </div>
    </section>
  );
};

export default TestimonialSlider;
