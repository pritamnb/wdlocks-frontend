import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/constants';

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#F8F3EC',
          color: '#0A0806',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9999, background: '#DA1519' }} />
          <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{SITE.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>{SITE.tagline}</div>
          <div style={{ fontSize: 34, color: '#292734', fontFamily: 'sans-serif', maxWidth: 1000 }}>{SITE.description}</div>
        </div>
        <div style={{ display: 'flex', gap: 40, fontSize: 24, fontFamily: 'sans-serif', color: '#292734' }}>
          <span>BSI Kitemarked</span>
          <span>·</span>
          <span>Sold Secure Diamond</span>
          <span>·</span>
          <span>5-star Trustpilot</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
