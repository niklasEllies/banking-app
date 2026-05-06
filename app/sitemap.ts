import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/map`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Public spots are crawlable. Anon RLS already filters to visibility='public'.
  let spotEntries: MetadataRoute.Sitemap = []
  try {
    const supabase = await createClient()
    const { data: spots } = await supabase
      .from('spots')
      .select('id, created_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(5000)

    spotEntries = (spots ?? []).map((s) => ({
      url: `${SITE_URL}/spots/${s.id}`,
      lastModified: new Date(s.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // If the DB is unreachable at sitemap-generation time we still want the
    // static routes indexed — fall through with an empty spot list.
  }

  return [...staticEntries, ...spotEntries]
}
