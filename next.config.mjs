/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'monitus.ai' }],
        destination: 'https://www.monitus.ai/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
