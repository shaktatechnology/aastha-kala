"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const JoinUsSection = () => {
  return (
    <section className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto rounded-[2.5rem] overflow-hidden bg-primary relative shadow-2xl shadow-primary/20"
      >
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 px-8 py-16 md:py-24 flex flex-col items-center text-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-6"
          >
            <Sparkles className="w-12 h-12 text-white/80" />
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to Begin Your Artistic Journey?
          </h2>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mb-12 font-medium">
            Join Aastha Kala Kendra today and discover the joy of dance and music with our expert instructors.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              href="/contact"
              className="px-12 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center group shadow-xl hover:shadow-white/20 hover:-translate-y-1"
            >
              Contact Now
              <ArrowRight className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/programs"
              className="px-12 py-4 bg-white/10 text-white border border-white/20 backdrop-blur-sm font-bold rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center justify-center hover:-translate-y-1"
            >
              Explore Programs
            </Link>
          </div>
        </div>

        {/* Decorative Gradients */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent rounded-full blur-[100px] opacity-40" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary rounded-full blur-[100px] opacity-30" />
      </motion.div>
    </section>
  );
};

export default JoinUsSection;
