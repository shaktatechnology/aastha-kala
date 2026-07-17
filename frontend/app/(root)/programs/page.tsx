export const dynamic = "force-dynamic";

import ClientPrograms from "@/components/client/ClientPrograms";
import Heading from "@/components/global/Heading";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchPrograms = async () => {
  if (!API_URL) {
    console.error("API_URL is not configured");
    return [];
  }
  try {
    const res = await fetch(`${API_URL}/programs`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch programs");
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    console.error("Fetch Programs Error:", error);
    return [];
  }
};

export const metadata = {
  title: "Our Programs | Aastha Kala Kendra",
  description:
    "Explore our performing arts programs including vocal training, dance, instrumental music, and acting. Book your class.",
};

const ProgramsPage = async () => {
  const programs = await fetchPrograms();

  return (
    <section className="min-h-screen">
      <Heading 
        title="Our Programs"
        subtitle="Explore our performing arts programs designed to nurture talent and build confidence through professional guidance."
      />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <ClientPrograms programs={programs} />
      </div>
    </section>
  );
};

export default ProgramsPage;