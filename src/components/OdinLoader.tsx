import { useEffect, useState } from 'react'

const MESSAGES = [
  'Analysing your profile',
  'Calibrating load targets',
  'Sequencing phases',
  'Building your sessions',
  'Validating programme',
]

const MESSAGE_INTERVAL_MS = 2800

const BLOB_KEYFRAMES = `
  0% { d: path("M36 7C50 4 68 14 70 29C72 44 63 60 47 66C31 72 14 64 9 50C4 36 9 17 23 10C29 6 30 9 36 7Z"); }
  25% { d: path("M38 5C54 7 70 19 68 37C66 55 51 69 34 67C17 65 4 51 6 35C8 19 22 3 38 5Z"); }
  50% { d: path("M34 9C50 3 68 17 70 35C72 53 58 69 40 69C22 69 6 55 6 37C6 19 18 15 34 9Z"); }
  75% { d: path("M36 7C52 5 70 21 68 39C66 57 50 71 32 67C14 63 2 47 6 31C10 15 24 8 36 7Z"); }
  100% { d: path("M36 7C50 4 68 14 70 29C72 44 63 60 47 66C31 72 14 64 9 50C4 36 9 17 23 10C29 6 30 9 36 7Z"); }
`

// 8 compass tick marks (radial lines) at 45° increments, N at top, clockwise.
const TICKS = [
  { x1: 50, y1: 4, x2: 50, y2: 11 }, // N
  { x1: 82.5, y1: 17.5, x2: 78.3, y2: 21.7 }, // NE
  { x1: 96, y1: 50, x2: 89, y2: 50 }, // E
  { x1: 82.5, y1: 82.5, x2: 78.3, y2: 78.3 }, // SE
  { x1: 50, y1: 96, x2: 50, y2: 89 }, // S
  { x1: 17.5, y1: 82.5, x2: 21.7, y2: 78.3 }, // SW
  { x1: 4, y1: 50, x2: 11, y2: 50 }, // W
  { x1: 17.5, y1: 17.5, x2: 21.7, y2: 21.7 }, // NW
]

// Small arrow triangles at N / E / S / W, pointing outward.
const ARROWS = [
  'M50 1L46 10L54 10Z', // N
  'M99 50L90 46L90 54Z', // E
  'M50 99L46 90L54 90Z', // S
  'M1 50L10 46L10 54Z', // W
]

export function OdinLoader() {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (stepIdx >= MESSAGES.length - 1) return
    const timer = setTimeout(() => setStepIdx((i) => i + 1), MESSAGE_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [stepIdx])

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Odin eye ── */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Rune compass ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 odin-compass"
          style={{ width: '100%', height: '100%' }}
        >
          {TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="var(--accent)"
              strokeWidth={1.5}
              opacity={0.18}
            />
          ))}
          {ARROWS.map((d, i) => (
            <path key={i} d={d} fill="var(--accent)" opacity={0.18} />
          ))}
        </svg>

        {/* Orbit rings */}
        <div
          className="absolute rounded-full odin-ring-outer"
          style={{
            width: 140,
            height: 140,
            top: 0,
            left: 0,
            border: '1px solid var(--accent)',
            opacity: 0.15,
          }}
        />
        <div
          className="absolute rounded-full odin-ring-inner"
          style={{
            width: 116,
            height: 116,
            top: 12,
            left: 12,
            border: '1px dashed var(--accent)',
            opacity: 0.12,
          }}
        />

        {/* Pulse rings */}
        <div
          className="absolute rounded-full odin-pulse"
          style={{
            width: 72,
            height: 72,
            top: 34,
            left: 34,
            border: '1px solid var(--accent)',
            animationDelay: '0s',
          }}
        />
        <div
          className="absolute rounded-full odin-pulse"
          style={{
            width: 72,
            height: 72,
            top: 34,
            left: 34,
            border: '1px solid var(--accent)',
            animationDelay: '0.8s',
          }}
        />

        {/* Concentric morphing blobs */}
        <svg
          viewBox="0 0 76 76"
          className="absolute"
          style={{ width: 72, height: 72, top: 34, left: 34 }}
        >
          <path
            className="odin-blob-outer"
            d="M36 7C50 4 68 14 70 29C72 44 63 60 47 66C31 72 14 64 9 50C4 36 9 17 23 10C29 6 30 9 36 7Z"
            fill="var(--accent)"
            opacity={0.12}
          />
        </svg>
        <svg
          viewBox="0 0 76 76"
          className="absolute"
          style={{ width: 50, height: 50, top: 45, left: 45 }}
        >
          <path
            className="odin-blob-middle"
            d="M36 7C50 4 68 14 70 29C72 44 63 60 47 66C31 72 14 64 9 50C4 36 9 17 23 10C29 6 30 9 36 7Z"
            fill="var(--accent)"
            opacity={0.2}
          />
        </svg>
        <svg
          viewBox="0 0 76 76"
          className="absolute"
          style={{ width: 28, height: 28, top: 56, left: 56 }}
        >
          <path
            className="odin-blob-core"
            d="M36 7C50 4 68 14 70 29C72 44 63 60 47 66C31 72 14 64 9 50C4 36 9 17 23 10C29 6 30 9 36 7Z"
            fill="var(--accent)"
            opacity={1}
          />
        </svg>
      </div>

      {/* ── Identity block ── */}
      <p
        className="font-['DM_Sans'] uppercase mt-8"
        style={{ fontSize: 9, letterSpacing: '0.28em', color: 'var(--muted)' }}
      >
        Powered by
      </p>
      <h2
        className="font-['Bebas_Neue'] font-bold leading-none mt-1"
        style={{ fontSize: 32, letterSpacing: '0.14em', color: 'var(--accent)' }}
      >
        ODIN
      </h2>
      <p
        className="font-['DM_Sans'] uppercase mt-1 text-center"
        style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--muted)', opacity: 0.65 }}
      >
        Ragnar&apos;s AI Engine · Forging your programme
      </p>

      {/* Divider */}
      <div
        className="mt-6 mb-6"
        style={{
          width: 160,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
        }}
      />

      {/* ── Status block ── */}
      <p
        className="font-['DM_Sans'] uppercase"
        style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--muted)' }}
      >
        Status
      </p>
      <p
        key={stepIdx}
        className="font-['Bebas_Neue'] odin-message mt-1"
        style={{ fontSize: 14, color: 'var(--muted)' }}
      >
        {MESSAGES[stepIdx]}
      </p>

      {/* Shimmer bar */}
      <div className="relative overflow-hidden mt-4" style={{ width: 160, height: 1 }}>
        <div
          className="absolute inset-y-0 odin-shimmer"
          style={{
            width: '40%',
            background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          }}
        />
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {MESSAGES.map((_, i) => (
          <span
            key={i}
            className="rounded-full odin-dot"
            style={{
              width: 4,
              height: 4,
              background: 'var(--accent)',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5 mt-3">
        {MESSAGES.map((_, i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: 18,
              height: 3,
              background:
                i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--accent)' : 'var(--border)',
              opacity: i === stepIdx ? 1 : i < stepIdx ? 0.2 : 1,
              transition: 'background 0.3s ease, opacity 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes odin-blob-morph {
          ${BLOB_KEYFRAMES}
        }
        .odin-blob-outer {
          animation: odin-blob-morph 3.5s ease-in-out infinite;
        }
        .odin-blob-middle {
          animation: odin-blob-morph 2.8s ease-in-out infinite reverse;
        }
        .odin-blob-core {
          animation: odin-blob-morph 2s ease-in-out infinite;
        }

        @keyframes odin-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes odin-spin-reverse {
          to { transform: rotate(-360deg); }
        }
        .odin-ring-outer {
          animation: odin-spin 12s linear infinite;
        }
        .odin-ring-inner {
          animation: odin-spin-reverse 8s linear infinite;
        }
        .odin-compass {
          animation: odin-spin 20s linear infinite;
        }

        @keyframes odin-pulse-out {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .odin-pulse {
          animation: odin-pulse-out 2.4s ease-out infinite;
        }

        @keyframes odin-message-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .odin-message {
          animation: odin-message-fade 0.3s ease;
        }

        @keyframes odin-shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .odin-shimmer {
          animation: odin-shimmer-sweep 2.4s ease-in-out infinite;
        }

        @keyframes odin-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.6); opacity: 1; }
        }
        .odin-dot {
          animation: odin-dot-pulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
