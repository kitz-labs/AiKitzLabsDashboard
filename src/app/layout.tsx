import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NavRail } from "@/components/layout/nav-rail";
import { HeaderBar } from "@/components/layout/header-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hermes Dashboard",
  description: "Builderz Marketing Engine Control Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <HeaderBar />
        <div className="flex min-h-[calc(100vh-var(--header-height))]">
          <NavRail />
          <main className="main-content flex-1 ml-[var(--nav-width)] mt-[var(--header-height)] p-6 overflow-auto">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
