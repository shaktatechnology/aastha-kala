"use client";

import React, { useState, useEffect } from "react";
import InputField from "@/components/layout/InputField";
import {
  Building2,
  MapPin,
  Navigation,
  Phone,
  FileText,
  Image,
  Facebook,
  Instagram,
  Music,
  Twitter,
  Calendar,
  Award,
  UserCheck,
  GraduationCap,
  TrendingUp,
  Type,
  AlignLeft,
  Mail,
  Trash2,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";

// Types

interface Setting {
  company_name: string;
  address: string;
  location: string;
  phone: string;
  email: string;
  about: string;
  about_short: string;
  opening_hour: string;
  closing_hour: string;
  admission_fee: string;
  vat_percentage: string;
}

interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  twitter: string;
  youtube: string;
  whatsapp_number: string;
}

interface Stats {
  experience: string;
  awards: string;
  instructors: string;
  students: string;
  success_rate: string;
}

interface ContentItem {
  title: string;
  desc: string;
}

// tabs

const tabs = [
  { id: "general", label: "General" },
  { id: "fees", label: "Fees" },
  { id: "social", label: "Social Links" },
  { id: "stats", label: "Stats" },
  { id: "whyus", label: "Why Us" },
  { id: "mission", label: "Mission" },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // GENERAL
  const [setting, setSetting] = useState<Setting>({
    company_name: "",
    address: "",
    location: "",
    phone: "",
    email: "",
    about: "",
    about_short: "",
    opening_hour: "",
    closing_hour: "",
    admission_fee: "",
    vat_percentage: "13",
  });

  // SOCIAL
  const [social, setSocial] = useState<SocialLinks>({
    facebook: "",
    instagram: "",
    tiktok: "",
    twitter: "",
    youtube: "",
    whatsapp_number: "",
  });

  // STATS
  const [stats, setStats] = useState<Stats>({
    experience: "",
    awards: "",
    instructors: "",
    students: "",
    success_rate: "",
  });

  // WHY US
  const [whyUsItems, setWhyUsItems] = useState<ContentItem[]>([
    { title: "", desc: "" },
  ]);

  // MISSION
  const [missionItems, setMissionItems] = useState<ContentItem[]>([
    { title: "", desc: "" },
  ]);

  // fetch

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to fetch settings");
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/settings`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await res.json();

        if (data.success) {
          const s = data.data.setting ?? {};

          if (s.logo) setLogoPreview(s.logo);
          if (s.banner) setBannerPreview(s.banner);

          const settingData = {
            company_name: s.company_name || "",
            address: s.address || "",
            location: s.location_map || "",
            phone: s.phone || "",
            email: s.email || "",
            about: s.about || "",
            about_short: s.about_short || "",
            opening_hour: s.opening_hour || "",
            closing_hour: s.closing_hour || "",
            admission_fee: s.admission_fee?.toString() || "",
            vat_percentage: s.vat_percentage?.toString() || "13",
          };
          setSetting(settingData);

          const soc = data.data.social_links;
          const socialData = {
            facebook: soc?.facebook || "",
            instagram: soc?.instagram || "",
            tiktok: soc?.tiktok || "",
            twitter: soc?.x || "",
            youtube: soc?.youtube || "",
            whatsapp_number: soc?.whatsapp_number || "",
          };
          setSocial(socialData);

          const st = s;
          const statsData = {
            experience: st.years_of_experience?.toString() || "",
            awards: st.awards?.toString() || "",
            instructors: st.number_of_instructors?.toString() || "",
            students: st.number_of_students?.toString() || "",
            success_rate: st.success_rate?.toString() || "",
          };
          setStats(statsData);

          let whyUsData = [{ title: "", desc: "" }];
          if (
            data.data.why_us &&
            Array.isArray(data.data.why_us) &&
            data.data.why_us.length > 0
          ) {
            whyUsData = data.data.why_us.map((item: any) => ({
              title: item.title,
              desc: item.description,
            }));
          }
          setWhyUsItems(whyUsData);

          const mission = data.data.setting?.mission;
          let missionData = [{ title: "", desc: "" }];
          if (mission && Array.isArray(mission)) {
            missionData = mission.map((item: any) => ({
              title: item.title,
              desc: item.description || "",
            }));
          }
          setMissionItems(missionData);

          // Store all initial data for change detection
          setInitialData(
            JSON.stringify({
              setting: settingData,
              social: socialData,
              stats: statsData,
              whyUsItems: whyUsData,
              missionItems: missionData,
            }),
          );
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch settings");
      }
    };

    fetchSettings();
  }, []);

  // save
  const saveSettings = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("You must be logged in to save settings");
      return;
    }

    // Change detection
    const currentData = JSON.stringify({
      setting,
      social,
      stats,
      whyUsItems,
      missionItems,
    });
    if (currentData === initialData && !logoFile && !bannerFile) {
      toast("No changes made");
      return;
    }

    setIsSaving(true);
    setErrors({});
    const formData = new FormData();

    formData.append("company_name", setting.company_name);
    formData.append("address", setting.address);
    formData.append("location_map", setting.location);
    formData.append("phone", setting.phone);
    formData.append("email", setting.email);
    formData.append("about", setting.about);
    formData.append("about_short", setting.about_short);
    formData.append("opening_hour", setting.opening_hour);
    formData.append("closing_hour", setting.closing_hour);
    if (setting.admission_fee)
      formData.append("admission_fee", setting.admission_fee);
    if (setting.vat_percentage)
      formData.append("vat_percentage", setting.vat_percentage);

    // STATS
    formData.append("years_of_experience", stats.experience);
    formData.append("awards", stats.awards);
    formData.append("number_of_instructors", stats.instructors);
    formData.append("number_of_students", stats.students);
    formData.append("success_rate", stats.success_rate);

    // SOCIAL
    formData.append("social_links[facebook]", social.facebook);
    formData.append("social_links[instagram]", social.instagram);
    formData.append("social_links[tiktok]", social.tiktok);
    formData.append("social_links[x]", social.twitter);
    formData.append("social_links[youtube]", social.youtube);
    formData.append("social_links[whatsapp_number]", social.whatsapp_number);

    // WHY US
    whyUsItems.forEach((item, index) => {
      formData.append(`why_us[${index}][title]`, item.title);
      formData.append(`why_us[${index}][description]`, item.desc);
    });

    // MISSION
    formData.append("mission", JSON.stringify(missionItems));

    // FILES
    if (logoFile) formData.append("logo", logoFile);
    if (bannerFile) formData.append("banner", bannerFile);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/settings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formData,
        },
      );

      const data = await res.json();

      if (data.success) {
        setInitialData(currentData);
        setLogoFile(null);
        setBannerFile(null);
        setErrors({});
        toast.success("Settings saved successfully");
      } else {
        if (data.errors) {
          setErrors(data.errors);
          const firstError = Object.values(data.errors).flat()[0] as string;
          toast.error(firstError || "Validation failed");
        } else {
          toast.error(data.message || data.error || "Failed to save settings");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm animate-fade-in">
      <div className="p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight">
            System Settings
          </h1>
          <p className="text-text-muted text-xs font-medium mt-1">
            Configure your company profile, social links, and global parameters.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto scrollbar-hide gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                  isActive
                    ? "text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full animate-scale-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="max-w-4xl">
          {/* GENERAL */}
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Company Name"
                icon={Building2}
                required
                value={setting.company_name}
                onChange={(e) =>
                  setSetting({ ...setting, company_name: e.target.value })
                }
                disabled={isSaving}
                error={errors.company_name}
              />
              <InputField
                label="Email Address"
                icon={Mail}
                required
                value={setting.email}
                onChange={(e) =>
                  setSetting({ ...setting, email: e.target.value })
                }
                disabled={isSaving}
                error={errors.email}
              />
              <InputField
                label="Phone Number"
                icon={Phone}
                value={setting.phone}
                onChange={(e) =>
                  setSetting({ ...setting, phone: e.target.value })
                }
                disabled={isSaving}
                error={errors.phone}
              />
              <InputField
                label="Physical Address"
                icon={MapPin}
                value={setting.address}
                onChange={(e) =>
                  setSetting({ ...setting, address: e.target.value })
                }
                disabled={isSaving}
                error={errors.address}
              />
              <InputField
                label="Map Location URL"
                icon={Navigation}
                value={setting.location}
                onChange={(e) =>
                  setSetting({ ...setting, location: e.target.value })
                }
                disabled={isSaving}
                error={errors.location_map}
              />
              <InputField
                label="Short Description"
                icon={Type}
                value={setting.about_short}
                onChange={(e) =>
                  setSetting({ ...setting, about_short: e.target.value })
                }
                disabled={isSaving}
                error={errors.about_short}
              />
              <InputField
                label="Opening Time"
                icon={Calendar}
                placeholder="e.g. 10:00 AM"
                value={setting.opening_hour}
                onChange={(e) =>
                  setSetting({ ...setting, opening_hour: e.target.value })
                }
                disabled={isSaving}
              />
              <InputField
                label="Closing Time"
                icon={Calendar}
                placeholder="e.g. 6:00 PM"
                value={setting.closing_hour}
                onChange={(e) =>
                  setSetting({ ...setting, closing_hour: e.target.value })
                }
                disabled={isSaving}
              />

              {/* LOGO */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">
                  Company Logo
                </label>
                <div
                  className={`relative group rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center transition-all ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50 hover:bg-primary/5"}`}
                  onClick={() =>
                    !isSaving && document.getElementById("logoInput")?.click()
                  }
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="w-6 h-6 text-text-muted mx-auto mb-1.5" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        Upload Logo
                      </p>
                    </div>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </div>

              {/* BANNER */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">
                  Website Banner
                </label>
                <div
                  className={`relative group rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center transition-all ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50 hover:bg-primary/5"}`}
                  onClick={() =>
                    !isSaving && document.getElementById("bannerInput")?.click()
                  }
                >
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt="Banner"
                      className="h-16 w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="w-6 h-6 text-text-muted mx-auto mb-1.5" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        Upload Banner
                      </p>
                    </div>
                  )}
                  <input
                    id="bannerInput"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBannerFile(file);
                        setBannerPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <InputField
                  label="Long About Section"
                  textarea
                  icon={FileText}
                  value={setting.about}
                  onChange={(e) =>
                    setSetting({ ...setting, about: e.target.value })
                  }
                  disabled={isSaving}
                  error={errors.about}
                />
              </div>
            </div>
          )}

          {/* FEES */}
          {activeTab === "fees" && (
            <div className="space-y-6">
              <div className="bg-background border border-border rounded-xl p-6 flex items-start gap-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-base font-black text-text-primary tracking-tight">
                      Admission Configuration
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Set the global one-time fee charged to every new student
                      at enrollment.
                    </p>
                  </div>
                  <div className="max-w-md">
                    <InputField
                      label="Admission Fee (Rs.)"
                      type="number"
                      placeholder="e.g. 5000"
                      value={setting.admission_fee}
                      onChange={(e) =>
                        setSetting({
                          ...setting,
                          admission_fee: e.target.value,
                        })
                      }
                      disabled={isSaving}
                      error={errors.admission_fee}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-xl p-6 flex items-start gap-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-base font-black text-text-primary tracking-tight">
                      VAT Configuration
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Set the default VAT percentage for fee and commission calculations.
                    </p>
                  </div>
                  <div className="max-w-md">
                    <InputField
                      label="VAT Percentage (%)"
                      type="number"
                      placeholder="e.g. 13"
                      value={setting.vat_percentage}
                      onChange={(e) =>
                        setSetting({
                          ...setting,
                          vat_percentage: e.target.value,
                        })
                      }
                      disabled={isSaving}
                      error={errors.vat_percentage}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOCIAL */}
          {activeTab === "social" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Facebook URL"
                icon={Facebook}
                value={social.facebook}
                onChange={(e) =>
                  setSocial({ ...social, facebook: e.target.value })
                }
                disabled={isSaving}
                error={errors["social_links.facebook"]}
              />
              <InputField
                label="Instagram URL"
                icon={Instagram}
                value={social.instagram}
                onChange={(e) =>
                  setSocial({ ...social, instagram: e.target.value })
                }
                disabled={isSaving}
                error={errors["social_links.instagram"]}
              />
              <InputField
                label="TikTok URL"
                icon={Music}
                value={social.tiktok}
                onChange={(e) =>
                  setSocial({ ...social, tiktok: e.target.value })
                }
                disabled={isSaving}
                error={errors["social_links.tiktok"]}
              />
              <InputField
                label="X (Twitter) URL"
                icon={Twitter}
                value={social.twitter}
                onChange={(e) =>
                  setSocial({ ...social, twitter: e.target.value })
                }
                disabled={isSaving}
                error={errors["social_links.x"]}
              />

              <InputField
                label="YouTube URL"
                icon={Music}
                value={social.youtube}
                onChange={(e) =>
                  setSocial({ ...social, youtube: e.target.value })
                }
                disabled={isSaving}
                error={errors["youtube"]}
              />

              <InputField
                label="WhatsApp Number"
                icon={Phone}
                value={social.whatsapp_number}
                onChange={(e) =>
                  setSocial({ ...social, whatsapp_number: e.target.value })
                }
                disabled={isSaving}
                error={errors["whatsapp_number"]}
              />
            </div>
          )}

          {/* STATS */}
          {activeTab === "stats" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Years of Experience"
                icon={Calendar}
                value={stats.experience}
                onChange={(e) =>
                  setStats({ ...stats, experience: e.target.value })
                }
                disabled={isSaving}
                error={errors.years_of_experience}
              />
              <InputField
                label="Awards & Recognition"
                icon={Award}
                value={stats.awards}
                onChange={(e) => setStats({ ...stats, awards: e.target.value })}
                disabled={isSaving}
                error={errors.awards}
              />
              <InputField
                label="Expert Instructors"
                icon={UserCheck}
                value={stats.instructors}
                onChange={(e) =>
                  setStats({ ...stats, instructors: e.target.value })
                }
                disabled={isSaving}
                error={errors.number_of_instructors}
              />
              <InputField
                label="Students Trained"
                icon={GraduationCap}
                value={stats.students}
                onChange={(e) =>
                  setStats({ ...stats, students: e.target.value })
                }
                disabled={isSaving}
                error={errors.number_of_students}
              />
              <InputField
                label="Success Rate (%)"
                icon={TrendingUp}
                value={stats.success_rate}
                onChange={(e) =>
                  setStats({ ...stats, success_rate: e.target.value })
                }
                disabled={isSaving}
                error={errors.success_rate}
              />
            </div>
          )}

          {/* WHY US */}
          {activeTab === "whyus" && (
            <div className="space-y-6">
              {whyUsItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-background border border-border p-6 rounded-xl relative shadow-sm group/card animate-scale-in"
                >
                  <button
                    type="button"
                    disabled={isSaving}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all hover:bg-error hover:text-white cursor-pointer"
                    onClick={() => {
                      const updated = whyUsItems.filter((_, i) => i !== idx);
                      setWhyUsItems(updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-4">
                    <InputField
                      label={`Title #${idx + 1}`}
                      icon={Type}
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...whyUsItems];
                        updated[idx].title = e.target.value;
                        setWhyUsItems(updated);
                      }}
                      disabled={isSaving}
                    />
                    <InputField
                      label={`Description #${idx + 1}`}
                      textarea
                      icon={AlignLeft}
                      value={item.desc}
                      onChange={(e) => {
                        const updated = [...whyUsItems];
                        updated[idx].desc = e.target.value;
                        setWhyUsItems(updated);
                      }}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={isSaving}
                className="w-full py-3 border border-dashed border-border rounded-xl text-text-muted text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.98] cursor-pointer"
                onClick={() =>
                  setWhyUsItems([...whyUsItems, { title: "", desc: "" }])
                }
              >
                + Add Feature Item
              </button>
            </div>
          )}

          {/* MISSION */}
          {activeTab === "mission" && (
            <div className="space-y-6">
              {missionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-background border border-border p-6 rounded-xl relative shadow-sm group/card animate-scale-in flex items-center gap-4"
                >
                  <div className="flex-1">
                    <InputField
                      label={`Mission Goal ${idx + 1}`}
                      icon={Type}
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...missionItems];
                        updated[idx].title = e.target.value;
                        setMissionItems(updated);
                      }}
                      disabled={isSaving}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="w-10 h-10 rounded-lg bg-error/10 text-error flex items-center justify-center transition-all hover:bg-error hover:text-white cursor-pointer mt-5"
                    onClick={() => {
                      const updated = missionItems.filter((_, i) => i !== idx);
                      setMissionItems(updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={isSaving}
                className="w-full py-3 border border-dashed border-border rounded-xl text-text-muted text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.98] cursor-pointer"
                onClick={() =>
                  setMissionItems([...missionItems, { title: "", desc: "" }])
                }
              >
                + Add Mission Goal
              </button>
            </div>
          )}
        </div>

        {/* SAVE */}
        <div className="mt-12 flex justify-end border-t border-border pt-8">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-8 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] cursor-pointer transition-all"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
