import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://www.mohamedaelattar.com";

export const metadata: Metadata = {
  title: "MOHAMED ELATTAR | PORTFOLIO",
  description: "Creative Full-Stack Developer Portfolio showcasing my projects and skills.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mohamed Elattar",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Mohamed Elattar",
  jobTitle: "Full-Stack Developer",
  url: SITE_URL,
  sameAs: ["https://github.com/MdElattar", SITE_URL],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
