"use client";

import { useState, useRef, useEffect } from "react";
import GalleryViewModal from "./GalleryViewModal";
import { ImageOff, Play } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/utils/url";

type Category = { id: number; name: string };
type GalleryItem = {
  id: number;
  title: string;
  description?: string;
  type: "images" | "video";
  category_id: number | null;
  category?: { name: string } | null;
  images?: string[];
  video?: string;
};
type Props = { gallery: GalleryItem[]; categories: Category[] };

type Slide = {
  key: string;
  url: string;
  title: string;
  type: "image" | "video";
  parentItem: GalleryItem;
  imageIndexInParent: number;
};

const getYTThumb = (url: string) => {
  const m = url.match(
    /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
};

/* Flatten gallery items → individual image/video slides, limit to 6 */
const buildSlides = (gallery: GalleryItem[]): Slide[] => {
  const slides: Slide[] = [];
  for (const item of gallery) {
    if (item.type === "images" && item.images && item.images.length > 0) {
      item.images.forEach((url, i) => {
        slides.push({
          key: `${item.id}-img-${i}`,
          url,
          title: item.title,
          type: "image",
          parentItem: item,
          imageIndexInParent: i,
        });
      });
    } else if (item.type === "video" && item.video) {
      const thumb = getYTThumb(item.video) ?? "";
      slides.push({
        key: `${item.id}-video`,
        url: thumb,
        title: item.title,
        type: "video",
        parentItem: item,
        imageIndexInParent: 0,
      });
    }
    if (slides.length >= 6) break; // cap at 6 slides
  }
  return slides;
};

const VISIBLE = 4;      // cards visible at once
const TALL_H  = 420;    // center card height px
const SHORT_H = 270;    // side card height px
const MID_H   = Math.round(SHORT_H + (TALL_H - SHORT_H) * 0.38);
const SPEED   = 0.5;    // px per animation frame

const ClientGallery = ({ gallery, categories }: Props) => {
  const slides = buildSlides(gallery);

  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTitle, setActiveTitle] = useState(slides[0]?.title ?? "");
  const [activeCat, setActiveCat] = useState(slides[0]?.parentItem?.category?.name ?? "");

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);

  const isDragging    = useRef(false);
  const hasDragged    = useRef(false);
  const startX        = useRef(0);
  const startOffset   = useRef(0);
  const offsetRef     = useRef(0);
  const isPausedRef   = useRef(false);
  const activeTitleRef = useRef(slides[0]?.title ?? "");
  const cardWRef      = useRef(0); // computed after mount
  const slidesRef     = useRef(slides);
  slidesRef.current   = slides;

  // Triple slides for seamless loop
  const items = slides.length > 0 ? [...slides, ...slides, ...slides] : [];

  /* ── Measure card width (= viewport / 4) ── */
  useEffect(() => {
    const measure = () => {
      cardWRef.current = window.innerWidth / VISIBLE;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ── RAF: scroll + active-card detection ── */
  useEffect(() => {
    if (slides.length === 0) return;

    const tick = () => {
      const track     = trackRef.current;
      const container = containerRef.current;
      const cw        = cardWRef.current;
      if (!track || !container || cw === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Advance scroll
      if (!isDragging.current && !isPausedRef.current) {
        offsetRef.current -= SPEED;
        const oneSet = cw * slidesRef.current.length;
        if (Math.abs(offsetRef.current) >= oneSet) offsetRef.current = 0;
        track.style.transform = `translateX(${offsetRef.current}px)`;
      }

      // Find which card is closest to viewport center
      const containerLeft = container.getBoundingClientRect().left;
      const viewCenter    = containerLeft + container.offsetWidth / 2;
      const totalCards    = slidesRef.current.length * 3;
      let minDist = Infinity;
      let activeIdx = 0;
      for (let i = 0; i < totalCards; i++) {
        const cx = containerLeft + offsetRef.current + i * cw + cw / 2;
        const d  = Math.abs(cx - viewCenter);
        if (d < minDist) { minDist = d; activeIdx = i; }
      }

      // Update card heights directly in DOM
      const cards = track.children;
      for (let i = 0; i < cards.length; i++) {
        const dist = Math.abs(i - activeIdx);
        const h    = dist === 0 ? TALL_H : dist === 1 ? MID_H : SHORT_H;
        (cards[i] as HTMLElement).style.height = `${h}px`;
      }

      // Update title only when center card changes
      const origIdx   = activeIdx % slidesRef.current.length;
      const focused   = slidesRef.current[origIdx];
      if (focused && focused.title !== activeTitleRef.current) {
        activeTitleRef.current = focused.title;
        setActiveTitle(focused.title);
        setActiveCat(focused.parentItem?.category?.name ?? "");
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [slides.length]);

  /* ── Mouse drag ── */
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current  = true;
    hasDragged.current  = false;
    startX.current      = e.clientX;
    startOffset.current = offsetRef.current;
    document.body.style.userSelect = "none";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) hasDragged.current = true;
    const oneSet = cardWRef.current * slides.length;
    offsetRef.current = startOffset.current + delta;
    if (offsetRef.current > 0) offsetRef.current -= oneSet;
    else if (Math.abs(offsetRef.current) > oneSet) offsetRef.current += oneSet;
    if (trackRef.current)
      trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    document.body.style.userSelect = "";
  };

  /* ── Touch drag ── */
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current  = true;
    hasDragged.current  = false;
    startX.current      = e.touches[0].clientX;
    startOffset.current = offsetRef.current;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    if (Math.abs(delta) > 4) hasDragged.current = true;
    const oneSet = cardWRef.current * slides.length;
    offsetRef.current = startOffset.current + delta;
    if (offsetRef.current > 0) offsetRef.current -= oneSet;
    else if (Math.abs(offsetRef.current) > oneSet) offsetRef.current += oneSet;
    if (trackRef.current)
      trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
  };
  const onTouchEnd = () => { isDragging.current = false; };

  const handleOpen = (slide: Slide) => {
    if (hasDragged.current) return;
    setSelectedItem(slide.parentItem);
    setCurrentSlide(slide.imageIndexInParent);
  };

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <ImageOff className="w-12 h-12" />
        <p className="text-sm">No gallery items available</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Strip ── */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden relative"
        style={{ height: `${TALL_H}px`, cursor: "grab" }}
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; onMouseUp(); }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10"
          style={{ width: 60, background: "linear-gradient(to right, white, transparent)" }} />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10"
          style={{ width: 60, background: "linear-gradient(to left, white, transparent)" }} />

        {/* Track — width set dynamically per card */}
        <div
          ref={trackRef}
          className="will-change-transform"
          style={{ display: "flex", alignItems: "center", height: "100%", width: "max-content" }}
        >
          {items.map((slide, idx) => (
            <div
              key={`${slide.key}-${idx}`}
              onClick={() => handleOpen(slide)}
              className="gc-item"
              style={{
                /* Width set to containerWidth/4 by the resize observer effect */
                width: `${100 / VISIBLE}vw`,
                height: `${SHORT_H}px`,
                flexShrink: 0,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                transition: "height 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              {slide.url ? (
                <img
                  src={slide.url}
                  alt={slide.title}
                  draggable={false}
                  className="gc-img"
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                    pointerEvents: "none", userSelect: "none",
                  }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: "#e2e8f0", color: "#94a3b8",
                }}>
                  <ImageOff style={{ width: 32, height: 32 }} />
                </div>
              )}

              {slide.type === "video" && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", pointerEvents: "none",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Play style={{ width: 16, height: 16, color: "white", fill: "white", marginLeft: 2 }} />
                  </div>
                </div>
              )}

              <div className="gc-overlay" />
              {slide.title && <div className="gc-title">{slide.title}</div>}
            </div>
          ))}
        </div>
      </div>

      <GalleryViewModal
        item={selectedItem}
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
        onClose={() => setSelectedItem(null)}
        getYouTubeEmbedUrl={getYouTubeEmbedUrl}
      />

      <style>{`
        .gc-img { transition: transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .gc-item:hover .gc-img { transform: scale(1.06); }
        .gc-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.4s ease;
        }
        .gc-item:hover .gc-overlay { opacity: 1; }
        .gc-title {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 14px; color: #fff;
          font-size: 13px; font-weight: 600; line-height: 1.35;
          opacity: 0; transform: translateY(6px);
          transition: opacity 0.38s ease, transform 0.38s ease;
          pointer-events: none;
        }
        .gc-item:hover .gc-title { opacity: 1; transform: translateY(0); }
      `}</style>
    </>
  );
};

export default ClientGallery;
