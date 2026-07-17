"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface VoiceData {
  id: number;
  tagline?: string;
  name?: string;
  post?: string;
  paragraph?: string;
  image?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VoiceSectionProps {
  type?: "featured" | "about";
}

const VoiceSection = ({ type = "featured" }: VoiceSectionProps) => {
  const [voices, setVoices] = useState<VoiceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const endpoint = type === "about" ? "about" : "featured";
        const res = await fetch(`${API_URL}/voices/${endpoint}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (Array.isArray(json.data)) {
            setVoices(json.data);
          } else {
            setVoices([json.data]);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchVoices();
  }, [type]);

  // Don't render anything if loading or no voice configured
  if (loading || voices.length === 0) return null;

  return (
    <section className="relative w-full bg-[#f8fafc] overflow-hidden py-16 px-6 lg:px-8 border-y border-gray-100">
      {/* Subtle background blobs */}
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-20 lg:space-y-28">
        {voices.map((voice, idx) => {
          // If every field is empty, skip rendering this particular voice
          const hasContent = voice.name || voice.post || voice.paragraph || voice.image;
          if (!hasContent) return null;

          const textColSpan = voice.image ? "lg:col-span-7" : "lg:col-span-12";
          const isOddIndex = idx % 2 === 1;

          return (
            <div
              key={voice.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
            >
              {/* Image Column */}
              {voice.image && (
                <motion.div
                  initial={{ opacity: 0, x: isOddIndex ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className={`lg:col-span-5 w-full flex justify-center animate-fade-in ${
                    isOddIndex ? "lg:order-2" : "lg:order-1"
                  }`}
                >
                  <div className="relative w-full max-w-md aspect-[4/5] overflow-hidden shadow-2xl border-4 border-white bg-white">
                    <img
                      src={voice.image}
                      alt={voice.name || "Voice"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              )}

              {/* Content Column */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                viewport={{ once: true }}
                className={`flex flex-col justify-center ${textColSpan} ${
                  isOddIndex ? "lg:order-1" : "lg:order-2"
                }`}
              >
                {/* Tagline */}
                {voice.tagline && voice.tagline.trim() && (
                  <p className="text-sm md:text-base font-bold text-orange-600 uppercase tracking-wider mb-2">
                    {voice.tagline}
                  </p>
                )}

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl text-gray-700 tracking-tight mb-6">
                  {voice.post ? `${voice.post}, ` : ""}{voice.name}
                </h2>

                {/* Paragraphs */}
                <div className="space-y-4">
                  {voice.paragraph &&
                    voice.paragraph.split("\n").map((para, i) => {
                      const trimmed = para.trim();
                      if (!trimmed) return null;
                      return (
                        <p
                          key={i}
                          className="text-gray-600 text-base md:text-lg leading-relaxed text-justify animate-fade-in"
                        >
                          {trimmed}
                        </p>
                      );
                    })}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default VoiceSection;
