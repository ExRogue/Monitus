import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111927',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://monitus.ai'),
  title: 'Monitus — The AI Growth Manager for Insurtechs',
  description: 'Turn insurance market signals into credibility and pipeline. Monitus monitors your market, identifies where you should contribute perspective, and helps you consistently show up with intelligent, market-aware commentary.',
  keywords: ['insurtech', 'growth intelligence', 'insurance marketing', 'MGA', 'broker', 'AI growth manager', 'narrative', 'London Market', 'Lloyd\'s', 'B2B insurtech'],
  authors: [{ name: 'Monitus' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    title: 'Monitus — The AI Growth Manager for Insurtechs',
    description: 'Turn insurance market signals into credibility and pipeline.',
    siteName: 'Monitus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monitus — The AI Growth Manager for Insurtechs',
    description: 'Turn insurance market signals into credibility and pipeline.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
