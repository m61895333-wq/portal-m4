import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Portal M4 | Mercado, investimentos, tecnologia e IA",
    template: "%s | Portal M4"
  },
  description:
    "Portal premium do Grupo M4 com analises sobre mercado financeiro, investimentos, tecnologia, inteligencia artificial e carreira.",
  icons: {
    icon: "/portal-m4-brand-logo.png",
    apple: "/portal-m4-brand-logo.png"
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://portalm4.com.br")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-GNFK5W0K7N" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GNFK5W0K7N');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
