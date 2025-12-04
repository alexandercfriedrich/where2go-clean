/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the experimental appDir config as it's stable in Next.js 14
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wien.imxplatform.de',
      },
      {
        protocol: 'https',
        hostname: '**.wien.gv.at',
      },
      {
        protocol: 'https',
        hostname: 'www.wien.info',
      },
      {
        protocol: 'https',
        hostname: 'cdn.wien.info',
      },
      {
        protocol: 'https',
        hostname: '**.wien.info',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
      // Allow common event image hosts
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: '**.ticketmaster.com',
      },
      {
        protocol: 'https',
        hostname: 'ra.co',
      },
      {
        protocol: 'https',
        hostname: '**.ra.co',
      },
      // Allow any HTTPS image for better compatibility
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Redirect /discover to / (home is now the discover page)
  async redirects() {
    return [
      {
        source: '/discover',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
