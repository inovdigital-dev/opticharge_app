import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #2563eb 0%, #16a34a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Lightning bolt */}
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
          <path
            d="M10 1L2 11.5H9L8 19L16 8.5H9L10 1Z"
            fill="white"
            strokeWidth="0"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
