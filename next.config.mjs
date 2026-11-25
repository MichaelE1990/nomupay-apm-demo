/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Pay by Bank's Get started and Integration pages are one article now
  async redirects() {
    return [
      { source: '/open-banking/integration', destination: '/open-banking#payment-workflow', permanent: false },
      { source: '/open-banking/integration/return', destination: '/open-banking/return', permanent: false },
    ]
  },
}

export default nextConfig
