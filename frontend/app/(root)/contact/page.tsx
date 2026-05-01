export const dynamic = "force-dynamic";
import ContactForm from "@/components/client/ContactForm";
import Heading from "@/components/global/Heading";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import { ensureAbsoluteUrl } from "@/utils/url";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch settings");

    const data = await res.json();
    return data?.data || { setting: null, social_links: null };
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getMapEmbedUrl = (url: string) => {
  if (!url) return "";
  let embedUrl = url;

  if (url.includes("<iframe")) {
    const match = url.match(/src="([^"]+)"/);
    if (match) embedUrl = match[1];
  }

  // Fix malformed https:/ (single slash) often caused by bad copy/paste
  if (embedUrl.startsWith("https:/") && !embedUrl.startsWith("https://")) {
    embedUrl = embedUrl.replace("https:/", "https://");
  }

  if (embedUrl.includes("google.com/maps/embed")) return embedUrl;

  // Extract place name or coordinates if it's a standard URL
  try {
    const urlObj = new URL(url);
    if (
      urlObj.hostname.includes("google.com") &&
      urlObj.pathname.includes("/maps/place/")
    ) {
      const placeName = urlObj.pathname.split("/maps/place/")[1].split("/")[0];
      return `https://www.google.com/maps?q=${placeName}&output=embed`;
    }
  } catch (e) {
    // If parsing fails, fall back to simple search embed if it looks like a string
  }

  return embedUrl;
};

const ContactPage = async () => {
  const data = await fetchSettings();
  const settings = data?.setting;
  const socialLinks = data?.social_links;

  const socials = [
    {
      id: "facebook",
      icon: <Facebook className="w-6 h-6" />,
      url: ensureAbsoluteUrl(socialLinks?.facebook),
      className:
        "bg-[#1877F2] text-white border-transparent hover:shadow-[0_8px_20px_-8px_#1877F2]",
    },
    {
      id: "instagram",
      icon: <Instagram className="w-6 h-6" />,
      url: ensureAbsoluteUrl(socialLinks?.instagram),
      className:
        "bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white border-transparent hover:shadow-[0_8px_20px_-8px_#ee2a7b]",
    },
    {
      id: "tiktok",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.45-.1.74-.12 1.49-.12 2.24 0 2.44-.68 4.96-2.52 6.58-1.89 1.74-4.7 2.22-7.09 1.58-2.6-.74-4.56-2.99-4.99-5.61-.56-3.23 1.25-6.66 4.28-7.82.52-.2 1.07-.33 1.62-.41V9.58c-1.54.21-2.91 1.23-3.4 2.73-.65 1.83.1 4.09 1.83 5 1.73.95 4.15.54 5.39-1.04.53-.66.82-1.49.82-2.33V0h.01Z" />
        </svg>
      ),
      url: ensureAbsoluteUrl(socialLinks?.tiktok),
      className:
        "bg-black text-white border-transparent hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)]",
    },
    {
      id: "whatsapp",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M20.52 3.48A11.79 11.79 0 0 0 12.06 0C5.47 0 .12 5.35.12 11.94c0 2.1.55 4.14 1.6 5.93L0 24l6.3-1.66a11.9 11.9 0 0 0 5.76 1.47c6.59 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.39ZM12.07 21.5a9.9 9.9 0 0 1-5.05-1.38l-4.1 1.07 1.1-3.98A9.93 9.93 0 0 1 2.2 11.9c0-5.47 4.45-9.92 9.92-9.92s9.92 4.45 9.92 9.92-4.45 9.92-9.97 9.92Z" />
        </svg>
      ),
      url: socialLinks?.whatsapp_number
        ? `https://wa.me/${socialLinks.whatsapp_number.replace(/\D/g, "")}`
        : undefined,
      className:
        "bg-[#25D366] text-white border-transparent hover:shadow-[0_8px_20px_-8px_#25D366]",
    },
    // {
    //   id: "x",
    //   icon: (
    //     <svg
    //       viewBox="0 0 24 24"
    //       fill="currentColor"
    //       className="w-5 h-5"
    //       xmlns="http://www.w3.org/2000/svg"
    //     >
    //       <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298l13.312 17.404Z" />
    //     </svg>
    //   ),
    //   url: ensureAbsoluteUrl(socialLinks?.x),
    //   className:
    //     "bg-[#0f1419] text-white border-transparent hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)]",
    // },
    {
      id: "youtube",
      icon: <Youtube className="w-6 h-6" />,
      url: ensureAbsoluteUrl(socialLinks?.youtube),
      className:
        "bg-[#FF0000] text-white border-transparent hover:shadow-[0_8px_20px_-8px_#FF0000]",
    },
  ].filter((social) => social.url);

  return (
    <section className="bg-white">
      <Heading
        title="Get in Touch"
        subtitle="Ready to start your musical journey? Contact us today for more information or schedule a tour"
      />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Information */}
          <div className="space-y-12">
            <div className="space-y-8">
              <a 
                href={`tel:${settings?.phone || "+9779841305158"}`}
                className="flex items-start gap-4 group"
              >
                <div className="bg-linear-to-r from-primary to-secondary p-2.5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    Contact Number
                  </h3>
                  <p className="text-black text-xl mt-1">
                    {settings?.phone || "+977 9841305158"}
                  </p>
                </div>
              </a>

              <a 
                href={`mailto:${settings?.email || "aasthakalakendra1@gmail.com"}`}
                className="flex items-start gap-4 group"
              >
                <div className="bg-linear-to-r from-primary to-secondary p-2.5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    Email Address
                  </h3>
                  <p className="text-black text-xl mt-1 break-all">
                    {settings?.email || "aasthakalakendra1@gmail.com"}
                  </p>
                </div>
              </a>

              <a 
                href={getMapEmbedUrl(settings?.location_map) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.address || "Narayangoal Chowk, Kathmandu, Nepal")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 group"
              >
                <div className="bg-linear-to-r from-primary to-secondary p-2.5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">Location</h3>
                  <p className="text-black text-xl mt-1">
                    {settings?.address || "Narayangoal Chowk, Kathmandu, Nepal"}
                  </p>
                </div>
              </a>

              {socialLinks?.whatsapp_number && (
                <div className="flex items-start gap-4">
                  <div className="bg-[#25D366] p-2.5 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                      <path d="M20.52 3.48A11.79 11.79 0 0 0 12.06 0C5.47 0 .12 5.35.12 11.94c0 2.1.55 4.14 1.6 5.93L0 24l6.3-1.66a11.9 11.9 0 0 0 5.76 1.47c6.59 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.39ZM12.07 21.5a9.9 9.9 0 0 1-5.05-1.38l-4.1 1.07 1.1-3.98A9.93 9.93 0 0 1 2.2 11.9c0-5.47 4.45-9.92 9.92-9.92s9.92 4.45 9.92 9.92-4.45 9.92-9.97 9.92Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">WhatsApp</h3>
                    <p className="text-black text-xl mt-1">
                      {socialLinks.whatsapp_number}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Google Maps Embed */}
            {settings?.location_map && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 h-80 shadow-lg">
                <iframe
                  src={getMapEmbedUrl(settings.location_map)}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            )}
          </div>

          {/*Contact Form */}
          <div className="bg-gray-50 p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-3xl  font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary  mb-8">
              Send us a Message
            </h2>
            <ContactForm />
          </div>
        </div>

        {/* Social Media Section */}
        {socials.length > 0 && (
          <div className="mt-16 text-center space-y-6">
            <p className="text-primary font-semibold tracking-wide uppercase text-lg">
              Want to see more? Follow us on social media!
            </p>
            <div className="flex justify-center gap-6">
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-full border shadow-sm transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center ${social.className}`}
                  title={`Follow us on ${social.id}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContactPage;
