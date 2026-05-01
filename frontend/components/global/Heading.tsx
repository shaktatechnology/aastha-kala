import React from "react";
import HeadingSlider from "./HeadingSlider";
import { getYouTubeEmbedUrl } from "@/utils/url";

export type HeroMedia = {
  url: string;
  type: "image" | "video";
};

interface HeadingProps {
  title: string;
  subtitle: React.ReactNode;
  className?: string;
  position?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

const fetchHeroMedia = async (pos: string = "slider-home"): Promise<HeroMedia[]> => {
  try {
    const res = await fetch(`${API_URL}/galleries/position/${pos}`, {
      cache: "no-store",
    });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    
    // Support multiple response formats: data.data.data (paginated), data.data (standard), or data (direct array)
    const rawData = data?.data?.data || data?.data || data || [];
    const items = Array.isArray(rawData) ? rawData : [];
    
    // Attempt to filter by "banner" category with multiple fallback property checks
    const bannerItems = items.filter((item: any) => {
      const categoryName = (
        item.category?.name || 
        item.category?.title || 
        item.category_name || 
        (typeof item.category === "string" ? item.category : "")
      )?.toLowerCase();
      
      return categoryName === "banner";
    });

    // If banner category items exist, use them; otherwise, use all items for that position
    const finalItems = bannerItems.length > 0 ? bannerItems : items;
    
    const media: HeroMedia[] = [];

    finalItems.forEach((item: any) => {
      if (item.type === "images" && item.images) {
        item.images.forEach((img: string) => {
          let cleanPath = img;
          
          // Extract relative path even if it's an absolute URL from DB
          if (img.startsWith("http")) {
            try {
              const urlObj = new URL(img);
              cleanPath = urlObj.pathname;
            } catch {}
          }

          const base = IMAGE_URL;
          if (!base) {
            console.warn("NEXT_PUBLIC_IMAGE_URL is not configured");
            return;
          }
          const finalBase = base.endsWith("/") ? base.slice(0, -1) : base;
          
          // Ensure we don't double up /storage
          const relativePath = cleanPath.replace(/^\/storage/, "").replace(/^storage/, "");
          const imgPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
          
          media.push({
            url: `${finalBase}${imgPath}`,
            type: "image",
          });
        });
      } else if (item.type === "video" && item.video) {
        media.push({
          url: getYouTubeEmbedUrl(item.video),
          type: "video",
        });
      }
    });

    return media;
  } catch (err) {
    console.error("Failed to fetch heading slider media", err);
    return [];
  }
};

const Heading = async ({ title, subtitle, className, position }: HeadingProps) => {
  const media = await fetchHeroMedia(position);

  return (
    <HeadingSlider 
      title={title} 
      subtitle={subtitle} 
      media={media} 
      className={className}
    />
  );
};

export default Heading;
