import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webscribe | Budget OTT Engine & Reseller Platform",
  description: "Centralized platform for OTT inventory discovery, semi-automated UPI payments, instant credential delivery, and reseller management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
