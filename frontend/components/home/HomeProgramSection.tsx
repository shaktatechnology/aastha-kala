import ClientProgramSlider from "@/components/client/ClientProgramSlider";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/client/ScrollReveal";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchPrograms = async () => {
  try {
    const res = await fetch(`${API_URL}/programs`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch programs");
    const data = await res.json();
    return data?.data?.data || data?.data || [];
  } catch (error) {
    console.error("Failed to fetch programs for home section:", error);
    return [];
  }
};

const HomeProgramSection = async () => {
  const programs = await fetchPrograms();

  if (programs.length === 0) return null;



  return (
    <section className="bg-white pt-20 pb-6 px-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <ScrollReveal once={true} direction="up">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 relative">
            <div className="text-center md:text-left space-y-3 relative z-10">
              <h2 className="text-4xl font-bold text-primary tracking-tight uppercase">
                What WE Offer
              </h2>
              <p className="text-text-muted font-medium max-w-xl">Discover our curated programs designed to nurture your artistic and musical talent</p>
            </div>

            <Link
              href="/programs"
              className="flex items-center gap-3 px-8 py-3 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-primary-hover shadow-xl shadow-primary/25 hover:-translate-y-1 active:scale-95 transition-all duration-300 group"
            >
              All Programs
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          </div>
        </ScrollReveal>

        {/* MOBILE VIEW: Show ALL Programs */}
        <ScrollReveal delay={200}>
          <div className="block md:hidden">
            <ClientProgramSlider programs={programs} viewType="grid" />
          </div>
        </ScrollReveal>

        {/* DESKTOP/UI VIEW: The "Perfect" Slider */}
        <ScrollReveal delay={200}>
          <div className="hidden md:block">
            <ClientProgramSlider programs={programs} viewType="slider" />
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
};

export default HomeProgramSection;