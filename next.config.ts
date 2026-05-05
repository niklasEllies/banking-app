import type { NextConfig } from 'next'

const securityHeaders = [
  // Disallow framing — clickjacking protection
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer leakage to same-origin paths only
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Geolocation needed (own GPS), camera/microphone explicitly off
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
