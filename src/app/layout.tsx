import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOHAMED ELATTAR | PORTFOLIO",
  description: "Creative Full-Stack Developer Portfolio showcasing my projects and skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        {children}
      </body>
    </html>
  );
}