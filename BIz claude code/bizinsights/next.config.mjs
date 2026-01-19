/** @type {import('next').NextConfig} */
const nextConfig = {

  typescript: {
    // Allow production builds to successfully complete even if there are TypeScript errors
    ignoreBuildErrors: true
  }
};

export default nextConfig;
