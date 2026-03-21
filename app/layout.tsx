
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Merriweather } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../context/AuthContext";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TutorIN",
  description: "Serverless Educational Calling Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TutorIN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${merriweather.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster />
          <PWAInstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
