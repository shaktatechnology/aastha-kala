export const dynamic = "force-dynamic";
import Heading from "@/components/global/Heading";
import AboutIntro from "@/components/about/AboutIntro";
import StatsSection from "@/components/about/StatsSection";
import ValuesSection from "@/components/about/ValuesSection";
import WhyChooseUs from "@/components/about/WhyChooseUs";
import MissionSection from "@/components/about/MissionSection";
import JoinUsSection from "@/components/about/JoinUsSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/settings`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch settings");
    const data = await res.json();
    return data?.data || { setting: null, why_us: [] };
  } catch (error) {
    console.error(error);
    return { setting: null, why_us: [] };
  }
};

const fetchGalleryByPosition = async (position: string) => {
  try {
    const res = await fetch(`${API_URL}/galleries/position/${position}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch gallery");
    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const defaultWhyUs = [
  {
    title: "Expert Guidance",
    desc: "Our skilled teachers provide personal guidance, helping students grow with strong fundamentals and artistic confidence.",
  },
  {
    title: "Balanced & Holistic Learning",
    desc: "We focus on technique, expression, discipline, and creativity—honoring tradition while embracing modern styles.",
  },
  {
    title: "Classes for All Ages & Levels",
    desc: "From beginners to advanced learners, our programs are designed for children, youth, and adults alike.",
  },
  {
    title: "Regular Performances & Exposure",
    desc: "Students get opportunities to perform on stage, participate in events, and attend workshops to build real-world experience.",
  },
  {
    title: "Warm & Supportive Environment",
    desc: "A positive, inspiring space where every student feels encouraged to learn, express, and shine.",
  },
  {
    title: "Modern Facilities",
    desc: "Our studios are equipped with the best tools and environment to facilitate a seamless learning experience.",
  },
];

const AboutPage = async () => {
  const [data, aboutGallery] = await Promise.all([
    fetchSettings(),
    fetchGalleryByPosition("about-intro"),
  ]);

  const settings = data?.setting;
  const whyUs: any[] = data?.why_us || [];

  const introImages = aboutGallery.length > 0 ? aboutGallery[0].images : [];
  const image1 = introImages[0] || "/images/program-fallback.png";
  const image2 = introImages[1] || image1;

  const whyChooseCards =
    whyUs.length > 0
      ? whyUs.map((item: any) => ({ title: item.title, desc: item.description }))
      : defaultWhyUs;

  return (
    <div className=" font-poppins selection:bg-blue-100 selection:text-blue-600">
      <Heading 
        title="About Us"
        subtitle="Discover our story, mission, and the passion behind Aastha Kala Kendra."
      />

      <AboutIntro 
        companyName={settings?.company_name}
        aboutText={settings?.about}
        image1={image1}
        image2={image2}
      />

      <StatsSection settings={settings} />

      <ValuesSection />

      <WhyChooseUs 
        heading={settings?.why_choose_heading || `Why Choose ${settings?.company_name || "Aastha Kala Kendra"}?`}
        cards={whyChooseCards}
      />

      <MissionSection 
        missionData={settings?.mission}
        missionParagraph={settings?.mission_paragraph}
      />

      <JoinUsSection />
    </div>
  );
};

export default AboutPage;
