import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FollowCursor from "@/components/ui/FollowCursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mission2k38",
  description: "Mission2k38",
};

import SmoothScroll from "@/components/ui/SmoothScroll";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll>
          <FollowCursor />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
