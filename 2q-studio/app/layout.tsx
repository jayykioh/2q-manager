import type { Metadata } from "next";
import { Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "2Q Manager",
  description: "Internal POS and Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var preference = localStorage.getItem('2q-theme') || 'system';
                  var isDark = preference === 'dark' ||
                    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var resolvedTheme = isDark ? 'dark' : 'light';
                  var themes = {
                    light: {'--ink':'#0A0A0A','--paper':'#FAFAFA','--mid':'#737373','--rule':'#E2E2E2','--surface':'#F4F4F4','--inverse-bg':'#0A0A0A','--inverse-fg':'#FAFAFA','--accent':'#0A0A0A','--destructive':'#D62828','--success':'#1A7A4A'},
                    dark: {'--ink':'#FAFAFA','--paper':'#0A0A0A','--mid':'#A3A3A3','--rule':'#333333','--surface':'#171717','--inverse-bg':'#FAFAFA','--inverse-fg':'#0A0A0A','--accent':'#FAFAFA','--destructive':'#F05252','--success':'#45A66F'}
                  };
                  var root = document.documentElement;
                  root.dataset.theme = resolvedTheme;
                  root.style.colorScheme = resolvedTheme;
                  Object.keys(themes[resolvedTheme]).forEach(function(property) {
                    root.style.setProperty(property, themes[resolvedTheme][property]);
                  });
                } catch (_) {}
              })();
            `,
          }}
        />
        <script
          id="register-sw"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
