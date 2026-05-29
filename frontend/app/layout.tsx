import type { Metadata } from "next";
import { Poppins, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/layout/ToastProvider";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";

// Updated Poppins configuration to be the application-wide font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
});

export async function generateMetadata(): Promise<Metadata> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 3600 } });
    const json = await res.json();
    const settings = json?.data?.setting;
    const companyName = settings?.company_name || "Aastha Kala";
    const description = settings?.about_short || "Learn dance, arts and more with Aastha Kala Academy.";
    
    return {
      title: {
        template: `%s | ${companyName}`,
        default: companyName,
      },
      description: description,
      icons: {
        icon: "/logo.png",
      },
    };
  } catch (error) {
    return {
      title: "Aastha Kala",
      description: "Learn dance, arts and more with Aastha Kala Academy.",
      icons: {
        icon: "/logo.png",
      },
    };
  }
}

const theme = createTheme({
  fontFamily: "var(--font-poppins), var(--font-devanagari), sans-serif",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${notoDevanagari.variable} ${poppins.className} antialiased`}>
        <MantineProvider theme={theme}>
          {children}
          <ToastProvider />
        </MantineProvider>
      </body>
    </html>
  );
}
