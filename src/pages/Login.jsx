import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'

async function ensureProgrammeConfig(userId) {
  const { data } = await supabase
    .from('programme_config')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!data) {
    await supabase.from('programme_config').insert({
      user_id: userId,
      start_date: new Date().toISOString().split('T')[0],
      phase_weeks: [4, 4, 5, 4, 999],
      min_active_days: 4,
    })
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSignIn() {
    setError(null)
    setSubmitting(true)

    try {
      const { user } = await signIn(email, password)
      await ensureProgrammeConfig(user.id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col px-6 overflow-y-auto">

      {/* Logo — upper third */}
      <div className="pt-16 pb-0">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-[#ff4520]">GX</h1>
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444444] mt-1">
          Built for Discipline
        </p>
      </div>

      {/* Form — vertically centered in remaining space */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full h-[52px] bg-[#161616] border border-[#2a2a2a] rounded-none px-4 text-white text-[15px] placeholder:text-[#444444] focus:border-[#ff4520] focus:outline-none transition-colors"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full h-[52px] bg-[#161616] border border-[#2a2a2a] rounded-none px-4 text-white text-[15px] placeholder:text-[#444444] focus:border-[#ff4520] focus:outline-none transition-colors"
        />

        {error && (
          <p className="text-[#ef4444] text-[13px] -mt-1">{error}</p>
        )}

        <button
          onClick={handleSignIn}
          disabled={submitting}
          className="w-full h-[52px] bg-[#ff4520] text-white font-semibold text-[15px] tracking-[-0.01em] rounded-none mt-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

      <div className="pb-12" />
    </div>
  )
}
