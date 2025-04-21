/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Add this line to enable static export
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig