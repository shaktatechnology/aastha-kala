"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Phone } from "lucide-react";
import { Scan } from "lucide-react";

type DressHireItem = {
  id: number;
  title: string;
  phone: string;
  images: string[];
};

type ClientDressHireProps = {
  dresses: DressHireItem[];
};

const ClientDressHire: React.FC<ClientDressHireProps> = ({ dresses }) => {
  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL?.replace(/\/$/, "");

  const [modalOpen, setModalOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [currentDress, setCurrentDress] = useState<DressHireItem | null>(null);

  const openModal = (dress: DressHireItem, index = 0) => {
    setCurrentDress(dress);
    setCurrentImages(dress.images?.length ? dress.images : []);
    setCurrentIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const prevImage = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const nextImage = () =>
    setCurrentIndex((prev) => Math.min(prev + 1, currentImages.length - 1));

  useEffect(() => {
    if (!modalOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
      else if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalOpen, currentImages]);

  const getFullImageUrl = (path: string) => {
    if (!path) return "";

    if (path.startsWith("http")) {
      if (
        typeof window !== "undefined" &&
        !window.location.host.includes("localhost") &&
        path.includes("localhost")
      ) {
        const relativePath = path.split("/storage/")[1] || "";
        return `${IMAGE_URL}/${relativePath}`;
      }
      return path;
    }

    return `${IMAGE_URL}/${path.replace(/^\/+/, "")}`;
  };

  const getImageUrl = (images?: string[]) => {
    if (!images || images.length === 0) return null;
    return getFullImageUrl(images[0]);
  };

  return (
    <section className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {dresses.map((dress) => {
          const imageUrl = getImageUrl(dress.images);

          return (
            <div
              key={dress.id}
              className="overflow-hidden bg-white shadow hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group "
              onClick={() => openModal(dress)}
            >
              {/* image */}
              <div className="h-70 w-full bg-primary/10 flex items-center justify-center overflow-hidden relative group p-4 ">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={dress.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded"
                    />

                    {/* scan icon */}
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white p-1.5 rounded-md border border-white/20">
                      <Scan className="w-4 h-4" />
                    </div>

                    {/* phone  */}
                    {dress.phone && (
                      <a
                        href={`tel:${dress.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 left-2 flex items-center gap-1 bg-primary/70 hover:bg-primary/80 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md transition"
                      >
                        <Phone className="w-3 h-3" />
                        {dress.phone}
                      </a>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* content */}
              <div className="p-3 text-center space-y-1 bg-primary">
                {/* title */}
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {dress.title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* modal */}
      {modalOpen && (
        <div className="fixed top-[68px] inset-x-0 bottom-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          {/* close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-30 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="relative w-full h-full flex flex-col items-center justify-center px-4">
            {/* image*/}
            {currentImages.length > 0 ? (
              <div className="relative flex items-center justify-center w-full">
                {/* prev */}
                {currentIndex > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 
                     bg-white/10 hover:bg-white/20 
                     text-white p-3 rounded-full backdrop-blur-md transition"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}

                {/* image */}
                <img
                  src={getFullImageUrl(currentImages[currentIndex])}
                  alt={`Image ${currentIndex + 1}`}
                  className="max-h-[75vh] max-w-[90vw] object-contain 
                   rounded-lg shadow-2xl"
                />

                {/* next */}
                {currentIndex < currentImages.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 
                     bg-white/10 hover:bg-white/20 
                     text-white p-3 rounded-full backdrop-blur-md transition"
                  >
                    <ChevronRight size={22} />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-white/60 flex flex-col items-center gap-2">
                <ImageIcon className="w-12 h-12 opacity-30" />
                <p className="text-xs uppercase tracking-widest">
                  No images available
                </p>
              </div>
            )}

            {currentDress && (
              <div className="w-full mt-4 flex justify-center">
                <div className="relative bg-primary/70 text-white px-4 py-3 rounded-md flex items-center justify-between w-full max-w-2xl overflow-hidden">
                  {/* title */}
                  <h2 className="text-sm md:text-base font-medium uppercase tracking-wide truncate max-w-[35%]">
                    {currentDress.title}
                  </h2>

                  {/* Counter in perfect center */}
                  {currentImages.length > 0 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] md:text-xs font-bold px-3 py-1 tracking-widest whitespace-nowrap">
                      {currentIndex + 1} / {currentImages.length}
                    </div>
                  )}

                  {/* phone */}
                  {currentDress.phone ? (
                    <a
                      href={`tel:${currentDress.phone}`}
                      className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition whitespace-nowrap max-w-[35%] justify-end"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="truncate">{currentDress.phone}</span>
                    </a>
                  ) : (
                    <div className="w-4 h-4 invisible" />
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  );
};

export default ClientDressHire;
