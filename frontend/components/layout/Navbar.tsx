"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [logo, setLogo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const getLogoUrl = (logoPath: string | null | undefined) => {
    if (!logoPath) return null;

    if (logoPath.startsWith("http")) {
      // Defensive check: If production returns localhost URL due to misconfigured APP_URL, fix it
      if (
        typeof window !== "undefined" &&
        !window.location.host.includes("localhost") &&
        logoPath.includes("localhost")
      ) {
        const base = process.env.NEXT_PUBLIC_IMAGE_URL || "";
        const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
        const relativePath = logoPath.split("/storage/")[1] || "";
        return `${cleanBase}/${relativePath}`;
      }
      return logoPath;
    }

    const base =
      process.env.NEXT_PUBLIC_IMAGE_URL || "http://localhost:8000/storage/";
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const cleanPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
    return `${cleanBase}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`);
        const json = await res.json();
        const settings = json?.data?.setting || json?.setting;
        if (settings?.logo) {
          setLogo(getLogoUrl(settings.logo));
        } else {
          // Fall back to the static logo in the public directory
          setLogo("/images/logo.png");
        }
      } catch (error) {
        console.error("Failed to fetch settings for logo:", error);
        // Fall back to the static logo on network/parse error
        setLogo("/images/logo.png");
      }
    };
    fetchSettings();
  }, []);

  const navItems = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Programs", path: "/programs" },
    { name: "Instructors", path: "/instructors" },
    { name: "Events", path: "/events" },
    { name: "Gallery", path: "/gallery" },
    { name: "Dress Hire", path: "/dress-hire" },
  ];

  return (
    <nav className="w-full bg-primary text-white sticky top-0 z-[100] shadow-sm">
      <div className="px-4 md:px-5 lg:px-6 py-1.5 flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo — far left, fixed width */}
        <div className="flex items-center shrink-0 gap-2">
          <Link href="/">
            {logo && <img src={logo} alt="Logo" className="h-14 w-auto" />}
          </Link>

          <span className="hidden md:block lg:hidden text-white font-semibold text-lg">
            Astha Kala Kendra
          </span>
        </div>

        <button
          className="lg:hidden relative z-[60] text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Nav links + Contact — takes remaining space, items spread to the right */}
        <div className="hidden lg:flex items-center justify-end flex-1 gap-x-6 lg:gap-x-10 font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`whitespace-nowrap transition hover:text-gray-200 ${
                  isActive ? "font-semibold underline underline-offset-4" : ""
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          <Link href="/contact" className="shrink-0">
            <button className="border border-white rounded-full px-5 py-1.5 hover:bg-white hover:text-blue-700 transition font-medium whitespace-nowrap">
              Contact
            </button>
          </Link>
        </div>

        {isOpen && (
          <div className="fixed inset-0 z-50 bg-primary flex flex-col px-6 mt-16 py-6 animate-slideDown lg:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`py-2 px-3 rounded-md transition ${
                    isActive
                      ? "bg-white text-blue-700 font-semibold"
                      : "hover:bg-blue-600"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="border-t border-blue-500 my-2"></div>

            {/* Contact Button */}
            <Link href="/contact" onClick={() => setIsOpen(false)}>
              <button className="w-full bg-white text-blue-700 rounded-full py-2 font-medium hover:bg-gray-100 transition">
                Contact
              </button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
