/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // the old projects page now lives on the home page as case files
  async redirects() {
    return [{ source: "/projects", destination: "/#cases", permanent: true }]
  },
}

export default nextConfig
