import "./globals.css";
import type { Metadata } from "next";
import { Space_Mono, Rubik } from "next/font/google";
import { PROJECT_CONFIG } from "@/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const rubik = Rubik({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const { meta, brand, links, publish } = PROJECT_CONFIG;
const siteOrigin = new URL(meta.url).origin;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: meta.title,
    template: `%s | ${brand.name}`,
  },
  description: meta.description,
  keywords: meta.keywords,
  authors: [{ name: meta.author, url: links.github }],
  creator: meta.author,
  publisher: meta.author,
  applicationName: brand.name,
  category: "developer tools",
  alternates: {
    canonical: meta.url,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: meta.url,
    siteName: brand.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
    creator: `@${brand.handle}`,
  },
};

/**
 * Structured data so search engines and package indexes read the same facts
 * the page shows: the version, the license, where the code lives, and where
 * the package is published.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: brand.name,
  description: meta.description,
  url: meta.url,
  codeRepository: links.github,
  programmingLanguage: "JavaScript",
  runtimePlatform: "Node.js",
  license: `https://opensource.org/licenses/${publish.license}`,
  version: publish.version,
  downloadUrl: publish.npmUrl,
  installUrl: publish.npmUrl,
  author: {
    "@type": "Person",
    name: brand.handle,
    url: links.github,
  },
  sameAs: [links.github, publish.npmUrl].filter(Boolean),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F8FC" },
    { media: "(prefers-color-scheme: dark)", color: "#24221f" },
  ],
};

const themeInitScript = `
(function(){
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceMono.variable} ${rubik.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Font Awesome 6.5.1 Kit */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/brands.min.css"
          integrity="sha512-8RxmFOVaKQe/xtg6lbscU9DU0IRhURWEuiI0tXevv+lXbAHfkpamD4VKFQRto9WgfOJDwOZ74c/s9Yesv3VvIQ=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        <Header />
        <main className="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
