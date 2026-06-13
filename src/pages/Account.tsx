import TopBar from '../components/layout/TopBar'
import { colors } from '../styles/tokens'

export default function Account() {
  return (
    <>
      <TopBar title="ACCOUNT" />
      <div className="flex-1 overflow-y-auto pb-8 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-[320px] p-8 text-center"
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '16px' }}
        >
          <p className="text-[40px] mb-3">⚙️</p>
          <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mb-2">ACCOUNT</h2>
          <p className="text-[13px] text-[#666666] leading-[1.6]">
            Manage your profile, preferences, and programme settings.
          </p>
          <p className="text-[11px] text-[#444444] mt-3">Coming soon</p>
        </div>
      </div>
    </>
  )
}
