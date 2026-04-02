import type { Metadata, Viewport } from "next";
import QueryClientProvider from "@/components/providers/QueryClientProvider";
import { ServiceWorkerProvider } from "@/components/shared/ServiceWorkerProvider";
import { PWAInstallPrompt, StandaloneModeIndicator } from "@/components/shared/PWAInstallPrompt";
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
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to CloudFront CDN — starts DNS + TCP + TLS early so
            plant images load faster on first paint */}
        {process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN && (
          <>
            <link rel="preconnect" href={`https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}`} />
            <link rel="dns-prefetch" href={`https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}`} />
          </>
        )}
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fancy Planties" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#a7f3d0" />
      </head>
      <body className="antialiased">
        {/* Skip-to-content link — keyboard/screen-reader users can bypass
            navigation and jump straight to the page content. The target
            id="main-content" is rendered in the dashboard & admin layouts. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-emerald-700 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <ServiceWorkerProvider>
          <QueryClientProvider>
            <StandaloneModeIndicator />
            <PWAInstallPrompt />
            {children}
          </QueryClientProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
