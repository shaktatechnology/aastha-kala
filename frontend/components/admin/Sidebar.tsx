"use client";
import { useEffect, useState } from "react";
import {
  Home,
  Settings,
  Book,
  Mail,
  Calendar,
  Flag,
  Image,
  LogOut,
  Mic,
  Shirt,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Banknote,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface SidebarProps {
  collapsed: boolean;
  toggleCollapse: () => void;
}

const menuItems = [
  // Dashboard
  { name: "Dashboard", icon: Home, href: "/admin" },

  // Daily Operations
  { name: "Booking", icon: Calendar, href: "/admin/booking" },
  { name: "Attendance", icon: Calendar, href: "/admin/attendance" },
  { name: "Instructor Schedule", icon: Calendar, href: "/admin/instructor/schedule" },

  // People Management
  { name: "Students", icon: Users, href: "/admin/students" },
  { name: "Employees", icon: Users, href: "/admin/employees" },

  // Academic
  { name: "Programs", icon: Book, href: "/admin/programs" },

  // Finance
  { name: "Fees & Billing", icon: CreditCard, href: "/admin/fees" },
  { name: "Salary Management", icon: CreditCard, href: "/admin/salary" },
  { name: "Company Income", icon: TrendingUp, href: "/admin/company-income" },
  { name: "Inhouse Expenses", icon: Banknote, href: "/admin/expenses" },

  // Inventory
  { name: "Dress Hire", icon: Shirt, href: "/admin/dress-hire" },

  // Website Content
  { name: "Gallery", icon: Image, href: "/admin/gallery" },
  { name: "Event", icon: Flag, href: "/admin/event" },
  { name: "Testimonials", icon: Mic, href: "/admin/testimonials" },
  { name: "Voices", icon: Mic, href: "/admin/voices" },
  { name: "Contact Us", icon: Mail, href: "/admin/contact" },

  // System
  { name: "Settings", icon: Settings, href: "/admin/settings" },
];

export default function Sidebar({ collapsed, toggleCollapse }: SidebarProps) {
  const router = useRouter();

  const pathname = usePathname();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const token = localStorage.getItem("token");

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-500 ease-in-out bg-brand-deep text-white shadow-2xl z-40 sticky top-0 ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Sidebar content */}
      <div className="flex flex-col h-screen relative z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          {!collapsed && (
            <span className="text-xl font-black text-white select-none tracking-tighter animate-fade-in">
              AASTHA <span className="text-primary">KALA</span>
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 text-white cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3 custom-scrollbar hide-scrollbar">
          <ul className="flex flex-col space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-xl transition-all duration-300 group
                      ${isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-white/40 group-hover:text-white"
                        }`}
                    />

                    {!collapsed && (
                      <span className="ml-3 text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300">
                        {item.name}
                      </span>
                    )}

                    {!collapsed && isActive && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>

                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-brand-deep border border-white/10 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all duration-300 ${isLoggingOut
              ? "opacity-50 cursor-not-allowed"
              : "text-error hover:bg-error/10 hover:text-error"
              } ${collapsed ? "justify-center" : ""}`}
          >
            {isLoggingOut ? (
              <div className="w-5 h-5 border-2 border-error/30 border-t-error rounded-full animate-spin" />
            ) : (
              <LogOut className={`w-5 h-5 ${collapsed ? "" : "mr-0"}`} />
            )}
            {!collapsed && (
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
