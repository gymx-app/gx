import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { shadows, gradients } from '../../styles/tokens'

const HomeIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8.5L10 3L17 8.5V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V8.5Z"
      fill={active ? '#ff4520' : 'none'}
      stroke={active ? '#ff4520' : '#333333'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChartIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="10" width="3.5" height="7" rx="0.5" fill={active ? '#ff4520' : '#333333'} />
    <rect x="8.25" y="6" width="3.5" height="11" rx="0.5" fill={active ? '#ff4520' : '#333333'} />
    <rect x="13.5" y="3" width="3.5" height="14" rx="0.5" fill={active ? '#ff4520' : '#333333'} />
  </svg>
)

const GridIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="6" height="6" rx="1" fill={active ? '#ff4520' : '#333333'} />
    <rect x="11" y="3" width="6" height="6" rx="1" fill={active ? '#ff4520' : '#333333'} />
    <rect x="3" y="11" width="6" height="6" rx="1" fill={active ? '#ff4520' : '#333333'} />
    <rect x="11" y="11" width="6" height="6" rx="1" fill={active ? '#ff4520' : '#333333'} />
  </svg>
)

const PersonIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="7" r="3.5" fill={active ? '#ff4520' : '#333333'} />
    <path d="M3.5 17C3.5 13.5 6 11.5 10 11.5C14 11.5 16.5 13.5 16.5 17"
      stroke={active ? '#ff4520' : '#333333'}
      strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
)

const TABS = [
  { label: 'TODAY', path: '/', Icon: HomeIcon },
  { label: 'PROGRESS', path: '/progress', Icon: ChartIcon },
  { label: 'PROGRAM', path: '/program', Icon: GridIcon },
  { label: 'ACCOUNT', path: '/account', Icon: PersonIcon },
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
        {TABS.map(({ label, path, Icon }) => {
          const active = location.pathname === path

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px] gap-1 active:opacity-70 transition-opacity"
            >
              <Icon active={active} />
              <span className={`text-[9px] font-semibold tracking-[0.1em] uppercase ${
                active ? 'text-[#ff4520]' : 'text-[#333333]'
              }`}>
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
