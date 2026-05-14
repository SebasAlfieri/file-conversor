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

const BASE_URL = "https://tu-dominio.com"; // 👈 cambia esto

export const metadata: Metadata = {
  // ── Básico ──────────────────────────────────────────────
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Conversor de Imágenes Online | PNG, JPG, WebP, SVG a PDF",
    template: "%s | Conversor de Imágenes",
  },
  description:
    "Convierte PNG, JPG, WebP, SVG y más a PDF u otros formatos, comprime imágenes y descarga todo en tu navegador, sin coste ni subidas a servidor.",
  keywords: [
    "conversor de imágenes",
    "convertir PNG a PDF",
    "convertir JPG a PDF",
    "comprimir imágenes",
    "WebP a PDF",
    "SVG a PDF",
    "convertir imágenes online gratis",
  ],
  authors: [{ name: "Tu Nombre o Empresa", url: BASE_URL }],
  creator: "Tu Nombre o Empresa",
  publisher: "Tu Nombre o Empresa",

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
    languages: {
      "es-AR": `${BASE_URL}/ar`,
      "es-ES": `${BASE_URL}/es`,
    },
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp…) ───────────
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: BASE_URL,
    siteName: "Conversor de Imágenes",
    title: "Conversor de Imágenes Online | PNG, JPG, WebP, SVG a PDF",
    description:
      "Convierte y comprime imágenes gratis en tu navegador. Sin subidas a servidor, sin coste.",
    images: [
      {
        url: "/og-image.png", // 1200×630 px recomendado
        width: 1200,
        height: 630,
        alt: "Conversor de Imágenes Online",
      },
    ],
  },

  // ── Twitter / X Card ─────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Conversor de Imágenes Online | PNG, JPG, WebP, SVG a PDF",
    description:
      "Convierte y comprime imágenes gratis en tu navegador. Sin subidas a servidor, sin coste.",
    images: ["/og-image.png"],
    // creator: "@tuUsuario",  // descomenta si tienes cuenta
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
