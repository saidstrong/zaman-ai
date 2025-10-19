import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TabBar } from "../components/TabBar";
import { FabChat } from "../components/FabChat";
import { GlobalVoiceHandler } from "../components/GlobalVoiceHandler";
import { ChatProvider } from "../components/ChatContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zaman Bank - Исламский банк",
  description: "Halal банковские услуги без процентов",
  manifest: "/manifest.json",
  themeColor: "#2D9A86",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zaman Bank"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Zaman Bank" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <ChatProvider>
              <div className="min-h-screen pb-20 md:pb-0">
                {children}
              </div>
              <TabBar />
              <FabChat />
              <GlobalVoiceHandler />
            </ChatProvider>
          </body>
    </html>
  );
}
