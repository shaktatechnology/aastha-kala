import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
} from "lucide-react";

import Link from "next/link";
import { ensureAbsoluteUrl } from "@/utils/url";

// Fetch settings with caching (1 hour)
const getSettings = async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data?.data || { setting: null, social_links: null };
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return { setting: null, social_links: null };
  }
};

const getPrograms = async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs`, {
      cache: "no-store",
    });
    const data = await res.json();
    // Since index() might use pagination, check for data.data.data or fallback to data.data
    return data?.data?.data || data?.data || [];
  } catch (error) {
    console.error("Failed to fetch programs:", error);
    return [];
  }
};

const Footer = async () => {
  const [data, programs] = await Promise.all([getSettings(), getPrograms()]);
  const setting = data?.setting;
  const socialLinks = data?.social_links;

  const getLogoUrl = (logo: string | null | undefined) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;

    const base = process.env.NEXT_PUBLIC_IMAGE_URL || "";
    const baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;
    const imgPath = logo.startsWith("/") ? logo : `/${logo}`;

    return `${baseUrl}${imgPath}`;
  };

  const logoUrl = getLogoUrl(setting?.logo);
  
  const getMapLink = (input: string, isForRedirection: boolean = false) => {
    if (!input) return "";
    
    let url = input;
    if (input.includes("<iframe")) {
      const match = input.match(/src="([^"]+)"/);
      url = match ? match[1] : "";
    }

    // If it's for a link redirection and it's an embed URL, 
    // it's better to fallback to a search for the address for a better mobile/app experience
    if (isForRedirection && url.includes("/maps/embed")) {
      return ""; // Returning empty will trigger the address-based search fallback in the component
    }

    return ensureAbsoluteUrl(url);
  };

  const socials = [
    {
      id: "facebook",
      icon: <Facebook className="w-5 h-5" />,
      url: ensureAbsoluteUrl(socialLinks?.facebook),
      className:
        "bg-fb text-white border-transparent hover:shadow-[0_8px_20px_-8px_var(--fb)]",
    },
    {
      id: "instagram",
      icon: <Instagram className="w-5 h-5" />,
      url: ensureAbsoluteUrl(socialLinks?.instagram),
      className:
        "bg-gradient-to-tr from-pink-500 via-pink-600 to-yellow-400 via-insta-pink to-insta-purple text-white border-transparent hover:shadow-[0_8px_20px_-8px_var(--insta-pink)]",
    },
    {
      id: "tiktok",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
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
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M20.52 3.48A11.79 11.79 0 0 0 12.06 0C5.47 0 .12 5.35.12 11.94c0 2.1.55 4.14 1.6 5.93L0 24l6.3-1.66a11.9 11.9 0 0 0 5.76 1.47c6.59 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.39ZM12.07 21.5a9.9 9.9 0 0 1-5.05-1.38l-4.1 1.07 1.1-3.98A9.93 9.93 0 0 1 2.2 11.9c0-5.47 4.45-9.92 9.92-9.92s9.92 4.45 9.92 9.92-4.45 9.92-9.97 9.92Z" />
    </svg>
  ),
  url: socialLinks?.whatsapp_number
    ? `https://wa.me/${socialLinks.whatsapp_number.replace(/\D/g, "")}`
    : null,
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
      icon: <Youtube className="w-5 h-5" />,
      url: ensureAbsoluteUrl(socialLinks?.youtube),
      className:
        "bg-[#FF0000] text-white border-transparent hover:shadow-[0_8px_20px_-8px_#FF0000]",
    },
  ].filter((social) => social.url);

  return (
    <footer className="bg-white border-blue-100 mt-10">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col items-center sm:items-start text-center sm:text-left">
            <Link
              href="/"
              className="flex items-center space-x-2 justify-center sm:justify-start mb-4"
            >
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={setting?.company_name || "Aastha Kala Kendra"}
                  className="h-14 w-auto object-contain"
                />
              )}
              <h2 className="text-xl font-semibold text-primary">
                {setting?.company_name || "Aastha Kala Kendra"}
              </h2>
            </Link>

            <p className="text-gray-600 text-sm max-w-sm mx-auto sm:mx-0">
              {setting?.about_short ||
                "Empowering artists and nurturing talent since 1999. Join our vibrant community and discover your creative potential."}
            </p>

            {/* Social Icons */}
            {socials.length > 0 && (
              <div className="mt-6 flex gap-4 justify-center sm:justify-start">
                {socials.map((social) => (
                  <a
                    key={social.id}
                    href={social.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-full flex items-center justify-center ${social.className}`}
                    title={`Follow us on ${social.id}`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="sm:col-span-1 lg:col-span-2">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li>
                <Link href="/about" className="hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/instructors" className="hover:text-primary">
                  Instructors
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-primary">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-primary">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Programs */}
          <div className="sm:col-span-1 lg:col-span-4">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Programs
            </h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              {programs.slice(0, 5).map((program: any) => (
                <li key={program.id}>
                  <Link
                    href="/programs"
                    className="hover:text-primary transition-colors"
                  >
                    {program.title}
                  </Link>
                </li>
              ))}
              {programs.length === 0 && (
                <li className="italic text-gray-400">Comming soon...</li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Contact Details
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <a 
                href={`tel:${setting?.phone || "+9779841305158"}`}
                className="flex items-center space-x-3 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{setting?.phone || "+977 9841305158"}</span>
              </a>
              <a 
                href={`mailto:${setting?.email || "aasthakalakendra@gmail.com"}`}
                className="flex items-center space-x-3 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="break-all">{setting?.email || "aasthakalakendra@gmail.com"}</span>
              </a>
              <a 
                href={getMapLink(setting?.location_map, true) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(setting?.address || "Narayangopal Chowk, Kathmandu, Nepal")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start space-x-3 hover:text-primary transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  {setting?.address || "Narayangopal Chowk, Kathmandu, Nepal"}
                </span>
              </a>
              
              {setting?.opening_hour && setting?.closing_hour && (
                <div className="flex items-start space-x-3 pt-2">
                  <div className="text-primary font-semibold uppercase text-[10px] tracking-wider mt-1 px-1 border border-primary rounded">
                    Open
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Working Hours</p>
                    <p className="text-gray-500">
                      {setting.opening_hour} - {setting.closing_hour}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t-1 mt-10 pt-6 text-center text-sm text-primary">
          © {new Date().getFullYear()}{" "}
          {setting?.company_name || "Aastha Kala Kendra"}, All rights reserved.
          | Designed & Developed by{" "}
          <Link
            href="https://shaktatechnology.com/"
            target="_blank"
            className="font-bold hover:underline"
          >
            Shakta Technology
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
