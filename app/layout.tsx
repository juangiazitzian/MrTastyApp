import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
import "./workflows.css";
import "./insights.css";

export const metadata: Metadata = {
  title: "Mr Tasty · Operaciones",
  description:
    "Centro de operaciones de Balbín y Perón: pedidos, stock, facturas, resultados y equipo.",
  applicationName: "Mr Tasty Operaciones",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/brand/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121010" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* Aplica el tema antes del primer pintado para evitar un destello de color. */
const themeBoot = `(function(){try{var s=localStorage.getItem("tasty-theme");var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
