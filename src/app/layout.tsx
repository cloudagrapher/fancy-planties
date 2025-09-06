import type { Metadata, Viewport } from "next";
import QueryClientProvider from "@/components/providers/QueryClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fancy Planties",
  description: "Track your fancy plant collection and care schedules",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fancy Planties",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Fancy Planties",
    title: "Fancy Planties",
    description: "Track your fancy plant collection and care schedules",
  },
  twitter: {
    card: "summary",
    title: "Fancy Planties",
    description: "Track your fancy plant collection and care schedules",
  },
};

export const viewport: Viewport = {
  themeColor: "#a7f3d0",
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fancy Planties" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#a7f3d0" />
      </head>
      <body className="antialiased">
        <QueryClientProvider>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
