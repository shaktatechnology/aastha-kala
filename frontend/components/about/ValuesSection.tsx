"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Star, Target, ShieldCheck } from "lucide-react";

const values = [
  {
    title: "Passion",
    description: "We are driven by our deep love for dance and music, inspiring every student to find their own creative spark.",
    icon: <Heart className="w-6 h-6" />,
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Excellence",
    description: "We strive for the highest standards in teaching and performance, nurturing discipline and artistic precision.",
    icon: <Star className="w-6 h-6" />,
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Inclusivity",
    description: "Our doors are open to everyone, regardless of age or skill level, fostering a diverse and supportive community.",
    icon: <Target className="w-6 h-6" />,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Integrity",
    description: "We uphold the traditions of art while maintaining transparency and respect in everything we do.",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "bg-green-50 text-green-600",
  },
];

const ValuesSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Our Core Values
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-gray-600 max-w-2xl mx-auto"
          >
            These principles guide us in our mission to inspire and empower the next generation of artists.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${value.color} flex items-center justify-center mb-6`}>
                {value.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValuesSection;
