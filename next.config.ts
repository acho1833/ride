import type { NextConfig } from 'next';
import { API_PREFIX } from '@/const';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['better-sqlite3'],
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/ide',
        permanent: false
      }
    ];
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: `${API_PREFIX}/api/:path*`,
        headers: [
          { key: 'Access-Control-Max-Age', value: '360000' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: '*' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Cache-Control', value: 'no-cache,no-store,max-age=0,must-revalidate' }
        ]
      }
    ];
  },
  devIndicators: false,
  allowedDevOrigins: [process.env.DEV_HOST || '*'] // somehow this is needed to allow HMR.  wildcard does not work but it might be fixed in next version
};

export default nextConfig;
