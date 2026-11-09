import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { AppSetup } from "@/components/app-setup";
import { APP_NAME, COLORS } from "@/lib/brand";
import "./globals.css";

// Modern geometric sans. "cyrillic-ext" holds the Mongolian Ө/ө and Ү/ү.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: COLORS.surface,
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className={`${manrope.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              borderRadius: 14,
              border: `1px solid ${COLORS.line}`,
              boxShadow: "0 14px 34px -14px rgb(20 20 22 / 0.28)",
              fontFamily: "var(--font-manrope)",
              fontWeight: 600,
              fontSize: 14,
            },
          }}
        />
        <AppSetup />
      </body>
    </html>
  );
}
