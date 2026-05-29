"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const pathname = usePathname();

  const [logo, setLogo] = useState("/images/logo.png");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/settings`
        );

        const json = await res.json();

        const settings =
          json?.data?.setting || json?.setting;

        if (settings?.logo) {
          setLogo(settings.logo);
        }
      } catch (error) {
        console.error(error);
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
    <>
      <nav className="w-full bg-primary text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-between">

          <Link href="/">
            <img
              src={logo}
              alt="Logo"
              className="h-14 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`transition duration-300 hover:text-blue-300 ${
                    isActive
                      ? "font-semibold underline underline-offset-4"
                      : ""
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <Link href="/contact">
              <button className="border border-white rounded-full px-5 py-2 transition duration-300 hover:bg-blue-600 hover:border-blue-600">
                Contact
              </button>
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsOpen(true)}
          >
            <Menu size={30} />
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="fixed inset-0 bg-primary z-[100] flex flex-col md:hidden">

          <div className="flex justify-end px-6 py-6">
            <button onClick={() => setIsOpen(false)}>
              <X size={32} className="text-white" />
            </button>
          </div>

          <div className="flex flex-col px-6 space-y-3">

            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg py-3 px-4 rounded-md transition duration-300 ${
                    isActive
                      ? "bg-white text-primary font-semibold"
                      : "hover:bg-blue-600"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="pt-4"
            >
              <button className="w-full bg-white text-primary rounded-full py-3 transition duration-300 hover:bg-blue-600 hover:text-white">
                Contact
              </button>
            </Link>

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;