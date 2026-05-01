"use client";

import React from "react";
import { motion } from "framer-motion";
import { Quote, Target } from "lucide-react";

interface MissionSectionProps {
  missionData: any[];
  missionParagraph: string;
}

const MissionSection = ({ missionData, missionParagraph }: MissionSectionProps) => {
  const hasMissionList = missionData && missionData.length > 0;

  return (
    <section className="py-20 bg-white overflow-hidden relative">
      {/* Background decoration with theme colors */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6"
          >
            <Target className="w-8 h-8 text-primary" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 tracking-tight"
          >
            Our Mission
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="w-full"
          >
            {hasMissionList ? (
              <div className="grid gap-4 max-w-2xl mx-auto">
                {missionData.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="p-5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-4 text-left group hover:border-primary/30 transition-colors"
                  >
                    <div className="mt-1">
                      <Quote className="w-5 h-5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 leading-relaxed italic text-justify">
                      {item.title}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="relative p-8 rounded-3xl bg-gray-50 border border-gray-100">
                <Quote className="absolute -top-4 left-6 w-10 h-10 text-primary/20" />
                <p className="text-xl md:text-2xl font-medium leading-relaxed italic text-gray-700">
                  {missionParagraph || "To empower students through dance and music, helping them grow not only as performers but as confident individuals who respect art, culture, and creativity."}
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="h-1 w-20 bg-primary/20 mx-auto mt-12 rounded-full"
          />
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
