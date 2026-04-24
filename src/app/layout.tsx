import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkinForge — Minecraft Skin Studio",
  description:
    "Create, remix, and export Minecraft skins with AI generation and pixel-perfect editing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-forge-bg text-forge-text antialiased">
        {children}
      </body>
    </html>
  );
}
