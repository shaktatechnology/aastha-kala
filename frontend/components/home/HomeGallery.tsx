"use client";

import React, { useEffect, useState } from "react";
import ClientGallery from "@/components/client/ClientGallery";
import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";  
import ScrollReveal from "../client/ScrollReveal";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* -------------------- TYPES -------------------- */
type Category = {
  id: number;
  name: string;
};

type GalleryItem = {
  id: number;
  title: string;
  type: "images" | "video";
  category_id: number;
  images?: string[];
  video?: string;
};

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  x?: string;
}

/* -------------------- COMPONENT -------------------- */

const HomeGallery = ({
  socialLinks,
}: {
  socialLinks: SocialLinks | null;
}) => {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [galleryRes, catRes] = await Promise.all([
          fetch(`${API_URL}/galleries/position/gallery`),
          fetch(`${API_URL}/gallery-categories`)
        ]);

        const galleryData = await galleryRes.json();
        const catData = await catRes.json();

        setGallery(Array.isArray(galleryData) ? galleryData : galleryData?.data || []);
        setCategories(Array.isArray(catData) ? catData : catData?.data || []);
      } catch (error) {
        console.error("Failed to fetch gallery data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return null;
  if (gallery.length === 0) return null;

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center space-y-4 mb-16 relative z-0">
            {/* Pulsing background decorative element */}
            <motion.div 
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute left-1/2 -top-10 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" 
            />
            
            <h2 className="text-4xl md:text-5xl font-black text-gradient tracking-tight relative z-10 font-poppins">
              Our Visual Gallery
            </h2>
            <p className="text-text-muted text-base max-w-2xl mx-auto font-medium relative z-10 font-poppins">
              Explore the vibrant moments, artistic creations, and memorable events captured at Aastha Kala.
            </p>
          </div>
        </ScrollReveal>
      </div>
      
      <ScrollReveal delay={200} once={true}>
        <div className="relative">
          <ClientGallery gallery={gallery} categories={categories} />
        </div>
      </ScrollReveal>
    </section>
  );
};

export default HomeGallery;
