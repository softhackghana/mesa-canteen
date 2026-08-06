import type { Metadata } from "next";

/**
 * POS segment layout — kiosk-style, full-screen, no sidebar.
 * Loads only Material Symbols here; Manrope + JetBrains Mono are already
 * self-hosted by the root layout via next/font (avoids the duplicate font
 * lint error and the extra network round-trip).
 */
export const metadata: Metadata = {
  title: "MESA POS",
  description: "MESA canteen point-of-sale terminal",
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
