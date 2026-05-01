"use client";

import React, { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { Users, GraduationCap, Award, Calendar, Star } from "lucide-react";

interface StatsSectionProps {
  settings?: any;
}

const StatCounter = ({ value, label, icon: Icon }: { value: string; label: string; icon: any }) => {
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
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 group"
    >
      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary transition-colors duration-300">
        <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors duration-300" />
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold text-gray-900">
          <motion.span>{rounded}</motion.span>{suffix}
        </h3>
        <p className="text-gray-500 font-medium uppercase tracking-wider text-xs">{label}</p>
      </div>
    </motion.div>
  );
};

const StatsSection = ({ settings }: StatsSectionProps) => {
  const stats = [
    { 
      label: "Years of Excellence", 
      value: (settings?.years_of_experience || "15") + "+",
      icon: Calendar
    },
    { 
      label: "Happy Students", 
      value: (settings?.number_of_students || "500") + "+",
      icon: Users
    },
    { 
      label: "Expert Instructors", 
      value: (settings?.number_of_instructors || "20") + "+",
      icon: GraduationCap
    },
    { 
      label: "Awards & Honors", 
      value: (settings?.awards || "15") + "+",
      icon: Award
    },
    { 
      label: "Success Rate", 
      value: (settings?.success_rate || "99") + "%",
      icon: Star
    },
  ];

  return (
    <section className="py-20 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <StatCounter 
              key={index} 
              value={stat.value} 
              label={stat.label} 
              icon={stat.icon} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
