"use client";

import React from "react";
import Link from "next/link";
import ScrollReveal from "@/components/client/ScrollReveal";
import { motion } from "framer-motion";

interface AboutHomeSectionProps {
  settings: any;
  gallery?: any;
}

const AboutHomeSection: React.FC<AboutHomeSectionProps> = ({
  settings,
  gallery,
}) => {
  if (!settings || (!settings.company_name && !settings.about)) return null;

  const displayImage =
    gallery?.images?.[0] ||
    settings?.banner;

  return (
    <section className="py-24 bg-white overflow-hidden relative">
      {/* Pulse background element */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.3, 0.1] 
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute -right-20 top-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-16">
          {/* Left: Text Content */}
          <ScrollReveal direction="up" className="w-full md:w-1/2">
            <div className={`${displayImage ? '' : 'max-w-3xl mx-auto'} space-y-6`}>
              <h1 className="text-4xl md:text-5xl font-bold text-primary">
                {settings?.company_name || "Aasha Kala Kendra"}
              </h1>
              <h3 className="text-xl md:text-2xl font-semibold text-secondary -mt-2">
                Dance & Music School
              </h3>

              <div className="text-black space-y-4 leading-relaxed text-sm md:text-base">
                {settings?.about ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: settings.about }}
                    className="text-justify"
                  />
                ) : (
                  <>
                    <p>
                      Aastha Kala Kendra is a dedicated center for performing
                      arts, believing in nurturing talent and passion in every
                      individual. We offer professional training in various forms
                      of dance and music.
                    </p>
                    <p>
                      Our mission is to provide high-quality education in
                      performing arts while preserving our cultural heritage. Join
                      us on a journey of self-discovery through art.
                    </p>
                  </>
                )}
              </div>

              <Link href="/about">
                <motion.button 
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0px 10px 20px rgba(0, 30, 90, 0.15)",
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="bg-linear-to-r from-primary to-secondary transition duration-300 text-white font-semibold py-2 px-8 rounded-xl shadow-lg"
                >
                  Read More
                </motion.button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Right: Image */}
          {displayImage && (
            <ScrollReveal direction="up" delay={200} className="w-full md:w-1/2">
              <motion.div 
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group"
              >
                <div className="absolute -top-6 -right-6 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity" />

                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src={displayImage}
                    alt="Dancers"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            </ScrollReveal>
          )}
        </div>
      </div>
    </section>
  );
};

export default AboutHomeSection;
