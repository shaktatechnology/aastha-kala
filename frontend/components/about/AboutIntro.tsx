"use client";

import React from "react";
import { motion } from "framer-motion";

interface AboutIntroProps {
  companyName: string;
  aboutText: string;
  image1: string;
  image2: string;
}

const AboutIntro = ({ companyName, aboutText, image1, image2 }: AboutIntroProps) => {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-primary uppercase bg-primary/10 rounded-full">
            Our Story
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {companyName || "Aastha Kala Kendra"}
          </h1>
          <h2 className="text-2xl text-primary font-medium mb-8">
            Nurturing Art, Elevating Souls
          </h2>
          <div className="space-y-6 text-gray-600 text-lg leading-relaxed text-justify">
            <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
              {aboutText ||
                "Aastha Kala Kendra is a premier institution dedicated to the preservation and promotion of traditional dance and music forms. Since its inception, we have been a cradle for artistic excellence, nurturing talent and fostering a deep appreciation for the arts."}
            </p>
          </div>
        </motion.div>

        {/* Right: overlapping images with animation */}
        <div className="relative h-[450px] md:h-[500px]">
          {/* Main image — top right */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="absolute top-0 right-0 w-[85%] h-[85%] rounded-[2.5rem] overflow-hidden shadow-2xl z-0 border-8 border-white"
          >
            <img
              src={image1}
              alt="Dance School Students"
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          {/* Overlapping image — bottom left */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="absolute bottom-0 left-0 w-[55%] h-[55%] rounded-[2rem] overflow-hidden shadow-2xl z-10 border-8 border-white"
          >
            <img
              src={image2}
              alt="Dance Performance"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Decorative element */}
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 z-[-1]"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 10, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 z-[-1]"
          />
        </div>
      </div>
    </section>
  );
};

export default AboutIntro;
