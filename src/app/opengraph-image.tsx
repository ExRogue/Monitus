import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Monitus — Growth Intelligence for Specialist Insurtechs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#111927',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4A9E96, #3D8B84)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: '96px', fontWeight: 700, color: '#E1E7EF', letterSpacing: '-2px' }}>
            Monitus
          </span>
        </div>
        <span style={{ fontSize: '32px', color: '#4A9E96', fontWeight: 500 }}>
          Growth Intelligence for Specialist Insurtechs
        </span>
      </div>
    ),
    { ...size }
  );
}
