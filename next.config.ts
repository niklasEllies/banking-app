import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// Pin file-tracing to this project root so multi-lockfile setups (e.g. git
// worktrees nested under a parent checkout) don't trigger Next's auto-detection
// warning and accidental tracing into the parent.
const projectRoot = import.meta.dirname

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
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Spot photos live in Supabase Storage. The bucket is public-read via
    // direct CDN URL (no SELECT policy on storage.objects — see Phase 7.5).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
