import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/map', '/changelog', '/login', '/signup'],
        disallow: [
          '/admin',
          '/admin/',
          '/profil',
          '/friends',
          '/spots/*/edit',
          '/spots/*/edit-photo',
          '/spots/new',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
