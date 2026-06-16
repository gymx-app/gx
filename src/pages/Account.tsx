import { useState } from 'react'
import TopBar from '../components/layout/TopBar'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui'
import { colors } from '../styles/tokens'

export default function Account() {
  const { user, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      <TopBar title="ACCOUNT" />
      <div className="flex-1 overflow-y-auto pb-8 flex flex-col items-center justify-center px-6 gap-6">
        <div
          className="w-full max-w-[320px] p-8 text-center"
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '16px' }}
        >
          <p className="text-[40px] mb-3">⚙️</p>
          <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mb-2">ACCOUNT</h2>
          {user?.email && (
            <p className="text-[13px] text-[#888888] mb-3 break-all">{user.email}</p>
          )}
          <p className="text-[13px] text-[#666666] leading-[1.6]">
            Manage your profile, preferences, and programme settings.
          </p>
          <p className="text-[11px] text-[#444444] mt-3">Coming soon</p>
        </div>

        <div className="w-full max-w-[320px]">
          <Button
            variant="danger"
            label="Log Out"
            onPress={handleLogout}
            loading={loggingOut}
          />
        </div>
      </div>
    </>
  )
}
