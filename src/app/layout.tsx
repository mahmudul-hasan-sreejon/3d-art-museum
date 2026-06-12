import type { Metadata } from "next";
import "@fontsource/marcellus/400.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUSEA — A Walkable History of Art",
  description:
    "An interactive 3D museum of art history. Zoom the timeline, meet the artists, walk their galleries.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
