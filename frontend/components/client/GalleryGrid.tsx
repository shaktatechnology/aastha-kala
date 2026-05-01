"use client";

import { useState } from "react";
import GalleryViewModal from "./GalleryViewModal";
import { ImageOff, Play } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

type Category = { id: number; name: string };
type GalleryItem = {
  id: number;
  title: string;
  type: "images" | "video";
  category_id: number | null;
  images?: string[];
  video?: string;
  category?: { name: string } | null;
};

type Props = { gallery: GalleryItem[]; categories: Category[] };

const getYTThumb = (url: string) => {
  const m = url.match(
    /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
};

type Card = {
  id: string;
  url: string;
  title: string;
  type: "image" | "video";
  parent: GalleryItem;
  index: number;
};

const GalleryGrid = ({ gallery, categories }: Props) => {
  const [activeTab, setActiveTab] = useState<number | "all">("all");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter out the 'Banner' category from tabs
  const displayCategories = categories.filter(
    (cat) => cat.name.toLowerCase() !== "banner"
  );

  const filteredItems = gallery.filter((item) => {
    const catName = (item.category?.name || "").toLowerCase();
    
    // 1. Exclude items belonging to the "Banner" category (case-insensitive)
    if (catName === "banner") return false;

    // 2. Tab filtering logic
    if (activeTab === "all") return true;
    return item.category_id === activeTab;
  });

  // Flatten for display in grid (each image in an item is a card)
  const displayCards: Card[] = filteredItems.flatMap((item): Card[] => {
    if (item.type === "images" && item.images) {
      return item.images.map((url, i) => ({
        id: `${item.id}-${i}`,
        url,
        title: item.title,
        type: "image",
        parent: item,
        index: i,
      }));
    } else if (item.type === "video" && item.video) {
      return [{
        id: `${item.id}-vid`,
        url: getYTThumb(item.video) || "",
        title: item.title,
        type: "video",
        parent: item,
        index: 0,
      }];
    }
    return [];
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-10">
      {/* Category Tabs - More compact and clean */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
            activeTab === "all" 
              ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
              : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
          )}
        >
          All Works
        </button>
        {displayCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
              activeTab === cat.id 
                ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid - More compact, smaller gaps, clean lines */}
      {displayCards.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {displayCards.map((card) => (
            <div
              key={card.id}
              onClick={() => {
                setSelectedItem(card.parent);
                setCurrentSlide(card.index);
              }}
              className="group relative aspect-square bg-gray-50 overflow-hidden cursor-pointer"
            >
              <img
                src={card.url}
                alt={card.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              
              {/* Refined Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <p className="text-white text-[9px] font-bold uppercase tracking-widest mb-1 opacity-80">
                  {card.parent.category?.name || "Gallery"}
                </p>
                <h3 className="text-white text-[11px] font-black uppercase tracking-wide leading-tight line-clamp-2">
                  {card.title}
                </h3>
              </div>

              {card.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-gray-300">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <ImageOff className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No items in this collection</p>
        </div>
      )}

      <GalleryViewModal
        item={selectedItem}
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
        onClose={() => setSelectedItem(null)}
        getYouTubeEmbedUrl={getYouTubeEmbedUrl}
      />
    </div>
  );
};

export default GalleryGrid;
