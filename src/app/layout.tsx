import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1628',
};

export const metadata: Metadata = {
  title: 'Telum — AI Content Engine for Insurance Distribution',
  description: 'Transform insurance news into branded, compliance-checked content. Built for MGAs, Insurtechs, and Brokers.',
  keywords: ['insurance', 'content generation', 'MGA', 'insurtech', 'broker', 'compliance', 'AI', 'newsletter', 'insurance distribution'],
  authors: [{ name: 'Telum' }],
  openGraph: {
    type: 'website',
    title: 'Telum — AI Content Engine for Insurance Distribution',
    description: 'Transform insurance news into branded, compliance-checked content. Built for MGAs, Insurtechs, and Brokers.',
    siteName: 'Telum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Telum — AI Content Engine for Insurance Distribution',
    description: 'Transform insurance news into branded, compliance-checked content.',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
