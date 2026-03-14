import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111927',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://monitus.ai'),
  title: 'Monitus — Growth Intelligence for Specialist Insurtechs',
  description: 'Monitus monitors your market, defines your narrative, produces channel-specific content, and learns what works — so insurers, brokers, and MGAs see you consistently saying smart things about their world.',
  keywords: ['insurtech', 'growth intelligence', 'insurance marketing', 'MGA', 'broker', 'content platform', 'AI', 'messaging bible', 'insurance distribution'],
  authors: [{ name: 'Monitus' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    title: 'Monitus — Growth Intelligence for Specialist Insurtechs',
    description: 'Monitus monitors your market, defines your narrative, produces channel-specific content, and learns what works.',
    siteName: 'Monitus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monitus — Growth Intelligence for Specialist Insurtechs',
    description: 'Growth intelligence for specialist insurtechs. Define, monitor, draft, distribute, learn.',
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
