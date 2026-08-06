import type { Metadata } from "next";

/**
 * POS segment layout — kiosk-style, full-screen, no sidebar.
 * Loads the MESA fonts (Manrope, JetBrains Mono, Material Symbols) for this
 * route group so the root layout's Geist fonts are not used here.
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
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
