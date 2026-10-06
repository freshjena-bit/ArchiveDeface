import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEFACEID — Defacement Archive",
  description:
    "Open archive of website defacement incidents, mirror snapshots and attacker attribution. Top defacers, recent records, live stats.",
  keywords: [
    "defacement archive",
    "defacer",
    "hall of fame",
    "top defacers",
    "mirror",
    "cybersecurity",
    "web security",
  ],
  authors: [{ name: "Deface Archive Project" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "DEFACEID — Defacement Archive",
    description: "Open archive of website defacement incidents and top defacers leaderboard.",
    siteName: "DEFACEID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DEFACEID — Defacement Archive",
    description: "Open archive of website defacement incidents and top defacers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
