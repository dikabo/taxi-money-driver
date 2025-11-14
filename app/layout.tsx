import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn"; // This will work now!

/**
 * File: /app/layout.tsx
 * Purpose: This is the complete, correct root layout.
 * It provides the font variable and CSS baseline.
 */

// Setup the Inter font with the Tailwind variable
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans", // This is the magic line for fonts
});

// Metadata (with 404s fixed)
export const metadata: Metadata = {
  title: "Taxi Money Driver",
  description: "Manage your earnings and payments.",
  // We'll add these back when we have the files
  // manifest: "/manifest.json", 
  // icons: {
  //   apple: "/icon.png",
  // },
};

// Viewport (Fixes the themeColor warning)
export const viewport: Viewport = {
  themeColor: "#1e293b", // Slate-800
};

// The Root Layout Component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* This is the most important part!
        We apply the Inter font variable to the <body> tag.
        We use cn() to safely merge the classes.
      */}
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <Providers>
          {/* Main content */}
          <main>{children}</main>
          
          {/* Global Toaster for notifications */}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}

