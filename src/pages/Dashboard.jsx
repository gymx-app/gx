import { useAuth } from '../auth/AuthContext'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate() {
  const now = new Date()
  return `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
}

export default function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6">

      {/* Top bar */}
      <div className="flex justify-between items-center pt-14 pb-8 border-b border-[#1a1a1a]">
        <span className="text-xl font-black tracking-[-0.04em] text-[#ff4520]">GX</span>
        <span className="text-[11px] text-[#444444] tracking-wide">{user?.email}</span>
      </div>

      {/* Page title */}
      <div className="mt-8">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444444]">
          {formatDate()}
        </p>
        <h1 className="text-5xl font-black tracking-[-0.04em] text-white mt-1">
          TODAY
        </h1>
      </div>

      {/* Placeholder content */}
      <div className="mt-6 border border-[#2a2a2a] p-4">
        <p className="text-[#444444] text-[11px] tracking-wide uppercase font-semibold">
          Workout
        </p>
        <p className="text-white text-[17px] font-semibold mt-1">
          Coming soon
        </p>
      </div>

      {/* Sign out — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 bg-[#0a0a0a]">
        <button
          onClick={signOut}
          className="w-full h-[48px] border border-[#2a2a2a] text-[#555555] text-[11px] tracking-[0.1em] uppercase rounded-none active:scale-[0.98] transition-transform"
        >
          Sign Out
        </button>
      </div>

    </div>
  )
}
