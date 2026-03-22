/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Canonical domain redirect
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'monitus.ai' }],
        destination: 'https://www.monitus.ai/:path*',
        permanent: true,
      },
      // Old tab routes → new tab routes
      { source: '/news', destination: '/signals', permanent: true },
      { source: '/news/:path*', destination: '/signals/:path*', permanent: true },
      { source: '/pipeline', destination: '/opportunities', permanent: true },
      { source: '/pipeline/:path*', destination: '/opportunities/:path*', permanent: true },
      { source: '/distribute', destination: '/content', permanent: true },
      { source: '/distribute/:path*', destination: '/content/:path*', permanent: true },
      { source: '/calendar', destination: '/content', permanent: true },
      { source: '/create', destination: '/opportunities', permanent: true },
      { source: '/reports', destination: '/briefing', permanent: true },
      { source: '/reports/:path*', destination: '/briefing/:path*', permanent: true },
      { source: '/competitive', destination: '/briefing', permanent: true },
      { source: '/competitive/:path*', destination: '/briefing/:path*', permanent: true },
      { source: '/messaging-bible', destination: '/narrative', permanent: true },
      { source: '/messaging-bible/:path*', destination: '/narrative/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
