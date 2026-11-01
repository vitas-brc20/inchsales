import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 8,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ color: '#ffffff' }}>1</span>
        <span style={{ color: '#3b82f6', fontSize: 13, marginLeft: 1 }}>"</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
