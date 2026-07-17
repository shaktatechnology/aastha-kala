export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import HomeInstructor from "@/components/home/HomeInstructor";
import HomeProgramSection from "@/components/home/HomeProgramSection";
import TestimonialSlider from "@/components/home/TestimonialSlider";
import HomeGallery from "@/components/home/HomeGallery";
import ContactHomeSection from "@/components/home/ContactHomeSection";
import InstructorSection from "@/components/home/InstructorSection";
import VoiceSection from "@/components/home/VoiceSection";


const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/settings`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch settings");
    const data = await res.json();
    return data?.data || { setting: null, social_links: null };
  } catch (error) {
    console.error(error);
    return { setting: null, social_links: null };
  }
};

const fetchGalleriesByPosition = async (position: string) => {
  try {
    const res = await fetch(`${API_URL}/galleries/position/${position}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch galleries");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Loading skeletons or basic fallbacks for selective streaming
const SectionPlaceholder = () => <div className="min-h-[200px] animate-pulse bg-gray-50" />;

const fetchInstructors = async () => {
  try {
    const res = await fetch(`${API_URL}/instructors`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch instructors");
    const data = await res.json();
    return data?.data?.data || data?.data || data || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const Page = async () => {
  // Fetch key data in parallel
  const [data, aboutHomeGallery, instructors] = await Promise.all([
    fetchSettings(),
    fetchGalleriesByPosition("about-home"),
    fetchInstructors(),
  ]);

  const settings = data?.setting;
  const socialLinks = data?.social_links;

  return (
    <div className="bg-white min-h-screen">
      <Suspense fallback={<SectionPlaceholder />}>
        <HeroSection />
      </Suspense>

      <StatsSection settings={settings} />

      <Suspense fallback={<SectionPlaceholder />}>
        <VoiceSection />
      </Suspense>

      {/* {settings && (
        <AboutHomeSection settings={settings} gallery={aboutHomeGallery?.[0]} />
      )} */}

      <Suspense fallback={<SectionPlaceholder />}>
        <HomeProgramSection />
      </Suspense>

      <Suspense fallback={<SectionPlaceholder />}>
        <InstructorSection instructors={instructors} />
      </Suspense>

      <Suspense fallback={<SectionPlaceholder />}>
        <HomeGallery socialLinks={socialLinks} />
      </Suspense>

      <Suspense fallback={<SectionPlaceholder />}>
        <TestimonialSlider />
      </Suspense>

      {settings && <ContactHomeSection settings={settings} socialLinks={socialLinks} />}
    </div>
  );
};

export default Page;
