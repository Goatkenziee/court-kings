import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Kings — Basketball Game",
  description: "Dribble, shoot, and score in this browser basketball game. WASD to move, Space to shoot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ ["--font-sans" as string]: "Inter, system-ui, sans-serif" }}>
      <body>{children}</body>
    </html>
  );
}
