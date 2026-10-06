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
  title: "DEFACE ARCHIVE — Cybersecurity Defacement Registry",
  description:
    "An open archive of website defacement incidents, attacker leaderboards, and mirror snapshots. Built for security research and historical record.",
  keywords: [
    "defacement archive",
    "cybersecurity",
    "hall of fame",
    "security research",
    "mirror",
    "web security",
  ],
  authors: [{ name: "Deface Archive Project" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "DEFACE ARCHIVE",
    description: "An open archive of website defacement incidents and security researcher leaderboards.",
    siteName: "Deface Archive",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DEFACE ARCHIVE",
    description: "An open archive of website defacement incidents.",
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
