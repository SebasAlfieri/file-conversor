import type { Metadata } from "next";
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

const BASE_URL = "https://file-conversor-mu.vercel.app/"; // 👈 cambia esto

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Conversor de Imágenes y YouTube | PNG, JPG, WebP, SVG a PDF",
    template: "Conversor de Imágenes",
  },
  description:
    "Convierte PNG, JPG, WebP, SVG y más a PDF u otros formatos, comprime imágenes y descarga MP3 o MP4 desde enlaces de YouTube, sin subidas a servidor.",
  keywords: [
    "conversor de imágenes",
    "convertir imágenes online",
    "convertidor de imágenes gratis",
    "convertir PNG a PDF",
    "convertir JPG a PDF",
    "convertir JPEG a PDF",
    "convertir WebP a PDF",
    "convertir SVG a PDF",
    "convertir imagen a PDF",
    "convertir foto a PDF",
    "JPG a PNG",
    "PNG a JPG",
    "PNG a WebP",
    "WebP a PNG",
    "JPG a WebP",
    "WebP a JPG",
    "JPEG a PNG",
    "PNG a JPEG",
    "SVG a PNG",
    "SVG a JPG",
    "convertidor JPG",
    "convertidor PNG",
    "convertidor WebP",
    "convertidor SVG",
    "compresor de imágenes",
    "comprimir imágenes",
    "comprimir JPG",
    "comprimir PNG",
    "comprimir WebP",
    "reducir tamaño de imagen",
    "optimizar imágenes",
    "optimizar PNG",
    "optimizar JPG",
    "optimizar WebP",
    "herramienta de imágenes online",
    "editor de imágenes online",
    "convertir archivos de imagen",
    "convertidor de fotos",
    "convertir imágenes sin perder calidad",
    "convertir imágenes rápido",
    "convertidor online gratis",
    "descargar audio de youtube",
    "descargar mp3 de youtube",
    "descargar mp4 de youtube",
    "youtube a mp3",
    "youtube a mp4",
    "descargar video de youtube",
    "youtube converter",
    "youtube to mp3",
    "youtube to mp4",
    "image converter",
    "png converter",
    "jpg converter",
    "webp converter",
    "image compressor",
    "png to jpg",
    "jpg to png",
    "jpg to webp",
    "webp to png",
    "image to pdf",
  ],
  authors: [{ name: "Sebastian Alfieri", url: BASE_URL }],
  creator: "Sebastian Alfieri",
  publisher: "Sebastian Alfieri",

  // ── Indexación ───────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp…) ───────────
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: BASE_URL,
    siteName: "Conversor de Imágenes",
    title: "Conversor de Imágenes y YouTube | PNG, JPG, WebP, SVG a PDF",
    description:
      "Convierte y comprime imágenes gratis en tu navegador y descarga MP3/MP4 de YouTube. Sin subidas a servidor, sin coste.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Conversor de Imágenes Online",
      },
    ],
  },

  // ── Twitter / X Card ─────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Conversor de Imágenes y YouTube | PNG, JPG, WebP, SVG a PDF",
    description:
      "Convierte y comprime imágenes gratis en tu navegador y descarga MP3/MP4 de YouTube. Sin subidas a servidor, sin coste.",
    images: ["/og-image.png"],
    creator: "Sebastian Alfieri",
  },

  // ── PWA / íconos ─────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icon-32.ico" },
      { url: "/icon-16.ico", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.ico", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: "/icon-32.ico",
  },
  // manifest: "/site.webmanifest",

  // ── Verificación de propiedad ─────────────────────────────
  // verification: {
  //   google: "REEMPLAZA_CON_TU_TOKEN",
  //   // yandex: "...",
  //   // bing: "...",
  // },

  // ── Otros ────────────────────────────────────────────────
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
