"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

interface VoiceData {
  id: number;
  name?: string;
  post?: string;
  paragraph?: string;
  image?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const VoiceSection = () => {
  const [voice, setVoice] = useState<VoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API_URL}/voices/featured`);
        const json = await res.json();
        if (json.success && json.data) {
          setVoice(json.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // Don't render anything if loading or no voice configured
  if (loading || !voice) return null;

  // If every field is empty, skip rendering
  const hasContent = voice.name || voice.post || voice.paragraph || voice.image;
  if (!hasContent) return null;

  return (
    <section className="relative w-full bg-white overflow-hidden py-14 px-4">
      {/* Subtle background blobs */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true }}
          className="relative flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-primary/5 via-white to-secondary/5 border border-primary/10 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-primary/5"
        >
          {/* Large decorative quote */}
          <Quote className="absolute top-6 left-8 w-10 h-10 text-primary/10 rotate-180 pointer-events-none" />

          {/* Avatar */}
          {voice.image && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
              className="shrink-0"
            >
              <div className="relative">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                  <img src={voice.image} alt={voice.name || "Voice"} className="w-full h-full object-cover" />
                </div>
                {/* Decorative ring */}
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-primary/20 animate-spin-slow pointer-events-none" />
              </div>
            </motion.div>
          )}

          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            {voice.paragraph && (
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-lg md:text-xl font-medium text-gray-700 leading-relaxed italic mb-6"
              >
                "{voice.paragraph}"
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              viewport={{ once: true }}
              className="flex flex-col items-center md:items-start"
            >
              {/* Accent line */}
              <div className="w-10 h-1 bg-primary rounded-full mb-3" />
              {voice.name && (
                <p className="text-xl font-bold text-gray-900">{voice.name}</p>
              )}
              {voice.post && (
                <p className="text-sm text-primary font-semibold uppercase tracking-wider mt-1">{voice.post}</p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VoiceSection;
