import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

interface TabPaneProps {
  active: boolean
  children: ReactNode
}

function TabPane({ active, children }: TabPaneProps) {
  return (
    <div
      style={{ display: active ? 'contents' : 'none' }}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

interface AppLayoutProps {
  tabs: { path: string; element: ReactNode }[]
}

export default function AppLayout({ tabs }: AppLayoutProps) {
  const location = useLocation()

  return (
    <div className="app-shell">
      {tabs.map(({ path, element }) => (
        <TabPane key={path} active={location.pathname === path}>
          {element}
        </TabPane>
      ))}
      <BottomNav />
    </div>
  )
}
