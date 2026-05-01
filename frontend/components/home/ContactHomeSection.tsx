"use client";

import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import ScrollReveal from "@/components/client/ScrollReveal";
import { motion } from "framer-motion";
import ContactForm from "@/components/client/ContactForm";

interface ContactHomeSectionProps {
  settings: any;
}

const ContactHomeSection: React.FC<ContactHomeSectionProps> = ({ settings }) => {
  if (!settings || (!settings.phone && !settings.email && !settings.address)) return null;

  const getEmbedUrl = (input: string) => {
    if (!input) return null;

    // Check if user pasted the full iframe tag
    if (input.includes("<iframe")) {
      const srcMatch = input.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }

    // Check if it's already an embed URL
    if (input.includes("/maps/embed") || (input.includes("google.com/maps") && input.includes("output=embed"))) {
      return input;
    }

    // If it's a regular Google Maps URL (e.g., search/place), try to convert it
    if (input.includes("google.com/maps")) {
      try {
        const url = new URL(input);
        // Handle search or place pages
        if (url.pathname.includes("/place/") || url.pathname.includes("/search/")) {
           // Extract the query parameter (address/place name)
           let query = "";
           if (url.pathname.includes("/place/")) {
             query = url.pathname.split("/place/")[1].split("/")[0];
           } else if (url.pathname.includes("/search/")) {
             query = url.pathname.split("/search/")[1].split("/")[0];
           }
           
           if (query) {
             return `https://www.google.com/maps?q=${query}&output=embed`;
           }
        }
        
        // Final fallback for any other google maps URL: use it as a query
        const qParam = url.searchParams.get("q");
        if (qParam) {
           return `https://www.google.com/maps?q=${encodeURIComponent(qParam)}&output=embed`;
        }
      } catch (e) {
        // Not a valid URL object, return as is
      }
    }

    return input;
  };

  const mapUrl = getEmbedUrl(settings?.location_map);

  return (
    <section className="py-24 bg-[#EEF0F5] relative overflow-hidden">
      {/* Pulse background element */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3] 
        }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute -left-20 -bottom-20 w-96 h-96 bg-white/40 rounded-full blur-3xl" 
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-3">
              Get In Touch
            </h2>
            <h4 className="text-secondary text-base mx-auto">
              Ready to start your musical journey? Contact us today for more
              information or to schedule a tour
            </h4>
          </div>
        </ScrollReveal>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Info Cards */}
          <ScrollReveal delay={200}>
            <div className="space-y-5">
              {/* Phone */}
              <motion.div 
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-5 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-base mb-0.5">
                    Contact Number
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {settings?.phone || "+977 9841305158"}
                  </p>
                </div>
              </motion.div>

              {/* Email */}
              <motion.div 
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-5 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-base mb-0.5">
                    Email Address
                  </h4>
                  <p className="text-gray-600 text-sm break-all">
                    {settings?.email || "aasthakalakendra1@gmail.com"}
                  </p>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div 
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-5 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <MapPin className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-base mb-0.5">
                    Location
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {settings?.address || "Narayangoal Chowk, Kathmandu, Nepal"}
                  </p>
                </div>
              </motion.div>
            </div>
          </ScrollReveal>

          {/* Contact Form */}
          <ScrollReveal delay={400}>
            <motion.div 
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-white/50"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Send us a Message
              </h3>
              <ContactForm />
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default ContactHomeSection;