import { memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, LayoutList, TrendingUp, CircleUser } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Today', path: '/', icon: Home },
  { label: 'Programme', path: '/program', icon: LayoutList },
  { label: 'Progress', path: '/progress', icon: TrendingUp },
  { label: 'Account', path: '/account', icon: CircleUser },
] as const

const ACTIVE_COLOR = '#FF4520'
const INACTIVE_COLOR = 'var(--muted)'

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
        paddingBottom: 0,
      }}
    >
      <div style={{ height: 60, display: 'flex' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => void navigate(item.path)}
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
                color,
                WebkitTapHighlightColor: 'transparent',
                padding: '8px 0',
                minWidth: 44,
                minHeight: 44,
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} color={color} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default memo(BottomNav)
