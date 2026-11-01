import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontWeight: 900,
            fontSize: 84,
            fontFamily: 'sans-serif',
          }}
        >
          <span style={{ color: '#ffffff' }}>1</span>
          <span style={{ color: '#3b82f6', fontSize: 60, marginLeft: 2 }}>"</span>
        </div>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: -0.5,
            marginTop: -8,
            fontFamily: 'sans-serif',
          }}
        >
          inchsales
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
