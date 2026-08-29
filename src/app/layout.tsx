import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adverio.vercel.app"),

  title: {
    default: "Adverio | AI Marketing Automation for Small Businesses",
    template: "%s | Adverio",
  },

  description:
    "Adverio helps small businesses attract customers, capture enquiries, respond instantly and follow up automatically with AI-powered marketing automation.",

  keywords: [
    "AI marketing automation",
    "marketing automation for small businesses",
    "AI marketing",
    "AI lead generation",
    "AI lead follow-up",
    "small business marketing",
    "marketing automation",
    "lead generation for trades",
    "AI marketing for electricians",
    "AI marketing for plumbers",
  ],

  authors: [
    {
      name: "Adverio",
    },
  ],

  creator: "Adverio",

  applicationName: "Adverio",

  category: "Business",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://adverio.vercel.app",
    siteName: "Adverio",
    title: "Adverio | AI Marketing Automation for Small Businesses",
    description:
      "Turn your marketing into customers with AI-powered campaigns, lead capture and automated follow-ups.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Adverio | AI Marketing Automation",
    description:
      "AI-powered marketing automation that helps small businesses attract, capture and convert more customers.",
  },

  alternates: {
    canonical: "https://adverio.vercel.app",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
