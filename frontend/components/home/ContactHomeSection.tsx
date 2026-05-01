"use client";

import React from "react";
import { Phone, Mail, MapPin, Facebook, Twitter, Youtube, Instagram } from "lucide-react";
import ScrollReveal from "@/components/client/ScrollReveal";
import { motion } from "framer-motion";
import ContactForm from "@/components/client/ContactForm";
import { ensureAbsoluteUrl } from "@/utils/url";

interface ContactHomeSectionProps {
  settings: any;
  socialLinks?: any;
}

const ContactHomeSection: React.FC<ContactHomeSectionProps> = ({ settings, socialLinks }) => {
  if (!settings || (!settings.phone && !settings.email && !settings.address)) return null;

  const getEmbedUrl = (input: string, isForRedirection: boolean = false) => {
    if (!input) return "";
    
    let url = input;
    if (input.includes("<iframe")) {
      const srcMatch = input.match(/src="([^"]+)"/);
      url = srcMatch ? srcMatch[1] : "";
    }

    if (url.startsWith("https:/") && !url.startsWith("https://")) {
      url = url.replace("https:/", "https://");
    }
    
    // If it's for redirection and it's an embed URL, fallback to address search
    if (isForRedirection && url.includes("/maps/embed")) {
      return "";
    }
    
    return ensureAbsoluteUrl(url);
  };

  const mapUrl = getEmbedUrl(settings?.location_map);

  return (
    <section className="py-16 bg-[#F8F9FA] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-20">
          {/* Left Column: Info */}
          <ScrollReveal>
            <div className="space-y-10">
              <div>
                <h2 className="text-4xl font-bold text-primary mb-6">
                  Get In Touch
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed max-w-lg">
                  Ready to start your musical journey? Contact us today for more
                  information or to schedule a tour. We are here to help you every step of the way.
                </p>
              </div>

              <div className="space-y-6">
                {/* Location */}
                <a 
                  href={getEmbedUrl(settings?.location_map, true) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.address || "Narayangoal Chowk, Kathmandu, Nepal")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">Address</h4>
                    <p className="text-gray-600">
                      {settings?.address || "Narayangoal Chowk, Kathmandu, Nepal"}
                    </p>
                  </div>
                </a>

                {/* Phone */}
                <a 
                  href={`tel:${settings?.phone || "+9779841305158"}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">Phone Number</h4>
                    <p className="text-gray-600">
                      {settings?.phone || "+977 9841305158"}
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a 
                  href={`mailto:${settings?.email || "aasthakalakendra1@gmail.com"}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">E-Mail</h4>
                    <p className="text-gray-600 break-all">
                      {settings?.email || "aasthakalakendra1@gmail.com"}
                    </p>
                  </div>
                </a>

                {/* WhatsApp Dynamic Row */}
                {socialLinks?.whatsapp_number && (
                  <a 
                    href={`https://wa.me/${socialLinks.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#25D366]/20 group-hover:scale-110 transition-transform">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                        <path d="M20.52 3.48A11.79 11.79 0 0 0 12.06 0C5.47 0 .12 5.35.12 11.94c0 2.1.55 4.14 1.6 5.93L0 24l6.3-1.66a11.9 11.9 0 0 0 5.76 1.47c6.59 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.39ZM12.07 21.5a9.9 9.9 0 0 1-5.05-1.38l-4.1 1.07 1.1-3.98A9.93 9.93 0 0 1 2.2 11.9c0-5.47 4.45-9.92 9.92-9.92s9.92 4.45 9.92 9.92-4.45 9.92-9.97 9.92Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg group-hover:text-[#25D366] transition-colors">WhatsApp</h4>
                      <p className="text-gray-600">
                        {socialLinks.whatsapp_number}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              {/* Social Links */}
              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-4">Follow Us:</h4>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: "facebook", Icon: Facebook, url: ensureAbsoluteUrl(socialLinks?.facebook) },
                    { id: "instagram", Icon: Instagram, url: ensureAbsoluteUrl(socialLinks?.instagram) },
                    { id: "youtube", Icon: Youtube, url: ensureAbsoluteUrl(socialLinks?.youtube) },
                    { id: "twitter", Icon: Twitter, url: ensureAbsoluteUrl(socialLinks?.x) },
                    { 
                      id: "tiktok", 
                      Icon: () => (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.45-.1.74-.12 1.49-.12 2.24 0 2.44-.68 4.96-2.52 6.58-1.89 1.74-4.7 2.22-7.09 1.58-2.6-.74-4.56-2.99-4.99-5.61-.56-3.23 1.25-6.66 4.28-7.82.52-.2 1.07-.33 1.62-.41V9.58c-1.54.21-2.91 1.23-3.4 2.73-.65 1.83.1 4.09 1.83 5 1.73.95 4.15.54 5.39-1.04.53-.66.82-1.49.82-2.33V0h.01Z" />
                        </svg>
                      ), 
                      url: ensureAbsoluteUrl(socialLinks?.tiktok) 
                    },
                    { 
                      id: "whatsapp", 
                      Icon: () => (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M20.52 3.48A11.79 11.79 0 0 0 12.06 0C5.47 0 .12 5.35.12 11.94c0 2.1.55 4.14 1.6 5.93L0 24l6.3-1.66a11.9 11.9 0 0 0 5.76 1.47c6.59 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.39ZM12.07 21.5a9.9 9.9 0 0 1-5.05-1.38l-4.1 1.07 1.1-3.98A9.93 9.93 0 0 1 2.2 11.9c0-5.47 4.45-9.92 9.92-9.92s9.92 4.45 9.92 9.92-4.45 9.92-9.97 9.92Z" />
                        </svg>
                      ), 
                      url: socialLinks?.whatsapp_number ? `https://wa.me/${socialLinks.whatsapp_number.replace(/\D/g, "")}` : null 
                    }
                  ]
                  .filter(social => social.url)
                  .map((social) => (
                    <motion.a
                      key={social.id}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -2 }}
                      className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md shadow-primary/10 transition-all"
                    >
                      <social.Icon />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right Column: Form */}
          <ScrollReveal delay={200}>
            <motion.div 
              className="bg-white p-10 md:p-12 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-50"
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Send a Message
              </h3>
              <ContactForm />
            </motion.div>
          </ScrollReveal>
        </div>

        {/* Full-width Map at bottom */}
        {mapUrl && (
          <ScrollReveal delay={400}>
            <div className="mt-16 rounded-3xl overflow-hidden shadow-2xl shadow-gray-200 border-8 border-white">
              <div className="w-full h-[450px]">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Aastha Kala Kendra Location"
                ></iframe>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
};

export default ContactHomeSection;