import { memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'TODAY', path: '/', icon: '🏋️' },
  { label: 'PROGRESS', path: '/progress', icon: '📈' },
  { label: 'PROGRAM', path: '/program', icon: '📋' },
  { label: 'ACCOUNT', path: '/account', icon: '⚙️' },
] as const

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      style={{
        background: '#141414',
        borderTop: '1px solid #2a2a2a',
        flexShrink: 0,
        zIndex: 10,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ height: 60, display: 'flex' }}>
        {TABS.map(({ label, path, icon }) => {
          const active = location.pathname === path

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.5px',
                color: active ? '#f0ede8' : '#666666',
                WebkitTapHighlightColor: 'transparent',
                padding: 0,
              }}
              aria-label={label}
            >
              <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default memo(BottomNav)
