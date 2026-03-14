import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/admin/', '/billing/', '/settings/', '/login/', '/register/', '/forgot-password/', '/reset-password/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
