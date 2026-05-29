import Link from "next/link";
import { formatDateShort } from "@/lib/utils";

const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/$/, "");

type EventItem = {
  id: number;
  title: string;
  description: string;
  slug: string;
  banner?: string | null;
  event_date: string;
  location: string;
  status: string;
};

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, "");
};

const getBannerUrl = (banner?: string | null): string => {
  if (!banner) return "/images/program-fallback.png";
  
  if (banner.startsWith("http")) {
    // Defensive check: If production returns localhost URL due to misconfigured APP_URL, fix it
    if (typeof window !== "undefined" && !window.location.host.includes("localhost") && banner.includes("localhost")) {
      const path = banner.split("/storage/")[1] || "";
      return `${IMAGE_URL}/${path}`;
    }
    return banner;
  }
  
  return `${IMAGE_URL}/${banner.replace(/^\/+/, "")}`;
};

const EventCard = ({ event }: { event: EventItem }) => {
  return (
    <Link 
      href={`/events/${event.slug}`}
      className="group relative rounded-2xl shadow-md overflow-hidden bg-white hover:shadow-xl transition duration-300 ease-in-out block"
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={getBannerUrl(event.banner)}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Date Overlay (Optional but looks premium) */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
           <p className="text-secondary text-xs font-bold uppercase tracking-wider">
             {formatDateShort(event.event_date)}
           </p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-2">
        {/* Heading */}
        <h2 className="text-xl font-bold text-blue-900 group-hover:text-primary transition-colors line-clamp-1">
          {event.title}
        </h2>

        {/* Detail / Description - Showed directly below heading */}
        <div className="mt-1">
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {stripHtml(event.description || "Join us for this exciting event at Aastha Kala and explore new creative horizons.")}
          </p>
        </div>

        {/* Location / Meta info */}
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-widest text-justify">
           <span className="flex items-center gap-1">
             📍 {event.location || "Main Studio"}
           </span>
           <span className="text-primary italic">Read More →</span>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
