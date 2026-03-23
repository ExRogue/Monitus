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
      // Old routes → new 3-agent structure
      { source: '/signals', destination: '/market-analyst', permanent: true },
      { source: '/signals/:path*', destination: '/market-analyst/:path*', permanent: true },
      { source: '/opportunities', destination: '/strategy', permanent: true },
      { source: '/opportunities/:path*', destination: '/strategy/:path*', permanent: true },
      { source: '/briefing', destination: '/strategy', permanent: true },
      { source: '/briefing/:path*', destination: '/strategy/:path*', permanent: true },
      { source: '/learning', destination: '/market-analyst', permanent: true },
      { source: '/learning/:path*', destination: '/market-analyst/:path*', permanent: true },
      // Legacy routes → final destinations (flattened chains)
      { source: '/news', destination: '/market-analyst', permanent: true },
      { source: '/news/:path*', destination: '/market-analyst/:path*', permanent: true },
      { source: '/pipeline', destination: '/strategy', permanent: true },
      { source: '/pipeline/:path*', destination: '/strategy/:path*', permanent: true },
      { source: '/distribute', destination: '/content', permanent: true },
      { source: '/distribute/:path*', destination: '/content/:path*', permanent: true },
      { source: '/calendar', destination: '/content', permanent: true },
      { source: '/create', destination: '/strategy', permanent: true },
      { source: '/reports', destination: '/strategy', permanent: true },
      { source: '/reports/:path*', destination: '/strategy/:path*', permanent: true },
      { source: '/competitive', destination: '/market-analyst', permanent: true },
      { source: '/competitive/:path*', destination: '/market-analyst/:path*', permanent: true },
      { source: '/messaging-bible', destination: '/narrative', permanent: true },
      { source: '/messaging-bible/:path*', destination: '/narrative/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
