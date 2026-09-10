import type { Metadata } from "next";
import "./globals.css";
import "./workflows.css";
import "./brand.css";
import "./insights.css";

export const metadata: Metadata = {
  title: "Tasty · Operaciones",
  description: "Balbín y Perón: pedidos, facturas, resultados y equipo.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand/logo.png",
    shortcut: "/brand/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
