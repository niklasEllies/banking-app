import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Plätzchen — Eine Karte für Orte, die nirgendwo stehen'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Topo SVG matches the landing-page background (Forest-Deep + contour lines).
  const topoBg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'>` +
        `<g fill='none' stroke='%2348583a' stroke-width='1.4'>` +
        `<path d='M-50 130 Q 300 50 600 145 T 1250 110' />` +
        `<path d='M-50 220 Q 300 140 600 235 T 1250 200' />` +
        `<path d='M-50 310 Q 300 230 600 325 T 1250 290' />` +
        `<path d='M-50 400 Q 300 320 600 415 T 1250 380' />` +
        `<path d='M-50 490 Q 300 410 600 505 T 1250 470' />` +
        `<path d='M-50 580 Q 300 500 600 595 T 1250 560' />` +
        `</g>` +
        `</svg>`,
    )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#1d2218',
          backgroundImage: `url("${topoBg}")`,
          backgroundSize: 'cover',
          padding: '60px 72px',
          color: '#e6e3d3',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#8aa376',
            fontFamily: 'monospace',
          }}
        >
          <span style={{ color: '#5e9e3e' }}>◆</span>
          <span>50.94° N</span>
          <span>·</span>
          <span>BETA · FRÜHJAHR 26</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 220,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <span>PLÄTZ</span>
            <span style={{ color: '#5e9e3e', fontStyle: 'italic', fontWeight: 300, textTransform: 'lowercase' }}>chen</span>
          </div>
          <div style={{ fontSize: 38, color: '#c8c8c0', lineHeight: 1.3, maxWidth: 900 }}>
            Eine Karte für Orte, die nirgendwo stehen.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 20,
            color: '#8aa376',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <div>Bänke · Aussichten · Schutzhütten · Liegewiesen</div>
          <div style={{ color: '#5e9e3e' }}>plaetzchen</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
