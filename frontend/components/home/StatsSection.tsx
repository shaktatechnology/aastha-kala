"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";

interface StatsSectionProps {
  settings?: any;
}

const StatCounter = ({ value, label }: { value: string; label: string }) => {
  const target = parseInt(value.replace(/\D/g, "")) || 0;
  const suffix = value.replace(/[0-9]/g, "");
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      animate(count, target, {
        duration: 2,
        ease: [0.22, 1, 0.36, 1],
      });
    }
  }, [isInView, target, count]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center gap-1 min-w-[100px]">
      <motion.span
        className="font-extrabold leading-none text-white drop-shadow-sm"
        style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
      >
        <motion.span>{rounded}</motion.span>{suffix}
      </motion.span>
      <p
        className="font-bold leading-tight text-white uppercase tracking-wider opacity-90"
        style={{
          fontSize: "clamp(0.6rem, 1vw, 0.75rem)",
        }}
      >
        {label}
      </p>
    </div>
  );
};

const StatsSection: React.FC<StatsSectionProps> = ({ settings }) => {
  const stats = [
    { label: "Years Experience", value: (settings?.years_of_experience || "10") + "+" },
    { label: "Awards & Recognition", value: (settings?.awards || "15") + "+" },
    {
      label: "Expert Instructors",
      value: (settings?.number_of_instructors || "25") + "+",
    },
    { label: "Students Trained", value: (settings?.number_of_students || "500") + "+" },
    { label: "Success Rate", value: (settings?.success_rate || "99") + "%" },
  ];

  return (
    <section className="relative w-full z-40 -mt-24 md:-mt-32 -mb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full py-6 md:py-10 px-6 md:px-12 rounded-[1.5rem] overflow-hidden shadow-[0_15px_40px_-10px_rgba(39,160,207,0.25)]"
          style={{
            background: "var(--primary)",
          }}
        >
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />

          <div className="flex flex-wrap items-center justify-around relative z-10 gap-6 md:gap-4">
            {stats.map((stat, index) => (
              <StatCounter key={index} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
