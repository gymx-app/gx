import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { shadows, gradients } from '../../styles/tokens'

const TABS = [
  { label: 'TODAY', path: '/' },
  { label: 'PROGRESS', path: '/progress' },
  { label: 'PROGRAM', path: '/program' },
  { label: 'ACCOUNT', path: '/account' },
]

const BottomNav = memo(function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="border-t border-[#1a1a1a] flex-shrink-0"
      style={{
        background: gradients.nav,
        boxShadow: shadows.nav,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="h-16 flex justify-around items-center">
        {TABS.map(({ label, path }) => {
          const active = location.pathname === path
          const color = active ? 'text-[#ff4520]' : 'text-[#444444]'

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] gap-1 active:opacity-70 transition-opacity ${color}`}
            >
              <div
                className={`w-5 h-5 rounded-sm ${active ? 'bg-[#ff4520] opacity-20' : 'bg-[#444444] opacity-20'}`}
              />
              <span className="text-[10px] tracking-[0.08em] uppercase font-semibold">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
})

export default BottomNav
