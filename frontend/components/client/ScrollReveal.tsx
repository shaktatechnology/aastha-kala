"use client";

import React from "react";
import { motion } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "none";
  once?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ 
  children, 
  className = "", 
  delay = 0, 
  direction = "up",
  once = true 
}) => {
  const customEasing = [0.22, 1, 0.36, 1];

  const variants = {
    initial: { 
      opacity: 0, 
      y: direction === "up" ? 30 : 0, 
      scale: 0.98 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.8, 
        delay: delay / 1000, // Convert ms to s
        ease: [0.22, 1, 0.36, 1] as any 
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      whileInView="animate"
      viewport={{ once, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
