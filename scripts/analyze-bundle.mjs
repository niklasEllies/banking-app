import fs from 'node:fs'

const reports = ['client', 'nodejs', 'edge']
const baseDir = new URL('../.next/analyze/', import.meta.url)

function flatten(node, depth = 0, out = []) {
  out.push({ depth, label: node.label, parsed: node.parsedSize ?? 0, gzip: node.gzipSize ?? 0, stat: node.statSize ?? 0 })
  if (Array.isArray(node.groups)) for (const child of node.groups) flatten(child, depth + 1, out)
  return out
}

for (const name of reports) {
  const url = new URL(`${name}.html`, baseDir)
  const html = fs.readFileSync(url, 'utf8')
  const m = html.match(/window\.chartData\s*=\s*(\[[^;]+\])\s*;/)
  if (!m) { console.log(`[${name}] no chartData`); continue }
  const data = JSON.parse(m[1])
  const all = data.flatMap(c => flatten(c))
  const top = data.map(c => ({ label: c.label, parsed: c.parsedSize ?? 0, gzip: c.gzipSize ?? 0 })).sort((a,b) => b.parsed - a.parsed)
  console.log(`\n=== ${name}.html — top chunks ===`)
  for (const c of top.slice(0, 20)) {
    console.log(`${(c.parsed/1024).toFixed(1).padStart(7)} KB parsed  ${(c.gzip/1024).toFixed(1).padStart(6)} KB gzip   ${c.label}`)
  }
  console.log(`Total parsed: ${(top.reduce((a,c)=>a+c.parsed,0)/1024).toFixed(1)} KB / gzip ${(top.reduce((a,c)=>a+c.gzip,0)/1024).toFixed(1)} KB`)

  // Hot suspects: motion, leaflet, tabler, exifr, react
  const suspects = ['motion', 'leaflet', '@tabler', 'exifr', 'react-leaflet', 'supabase', '@supabase']
  console.log(`\n--- module-search inside ${name} (top 30 by parsed) ---`)
  const hits = all.filter(n => suspects.some(s => n.label.includes(s)))
  hits.sort((a,b) => b.parsed - a.parsed).slice(0, 30).forEach(h => {
    console.log(`${(h.parsed/1024).toFixed(1).padStart(7)} KB  ${h.label}`)
  })
}
