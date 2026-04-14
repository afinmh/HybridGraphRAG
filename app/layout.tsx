import type { Metadata } from "next";
import "./globals.css";
import { ChatWidget } from "@/components/home/ChatWidget";

export const metadata: Metadata = {
  title: "Sumber Herbal",
  description: "Platform pencarian informasi tanaman herbal berbasis AI",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* Global ChatWidget - appears on all pages */}
        <ChatWidget />
      </body>
    </html>
  );
}
