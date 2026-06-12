import { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import { getProgrammeConfig, upsertProgrammeConfig } from '../services/programmeService'
import { logger } from '../lib/logger'
import { Button, Text } from '../components/ui'

async function ensureProgrammeConfig(userId) {
  const { data } = await getProgrammeConfig(userId)
  if (!data) {
    await upsertProgrammeConfig(userId, {
      start_date: new Date().toISOString().split('T')[0],
      phase_weeks: [4, 4, 5, 4, 999],
      min_active_days: 4,
    })
  }
}

const Login = memo(function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const { startLoading, stopLoading } = useLoading()
  const navigate = useNavigate()

  async function handleSignIn() {
    setError(null)
    setSubmitting(true)
    startLoading()

    try {
      const { user } = await signIn(email, password)
      await ensureProgrammeConfig(user.id)
      navigate('/', { replace: true })
    } catch (err) {
      logger.error('Login error:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
      stopLoading()
    }
  }

  return (
    <div
      className="flex flex-col px-6 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at center, #111111 0%, #080808 70%)', height: '100dvh' }}
    >
      {/* Logo */}
      <div className="pt-16 pb-0">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-[#ff4520]">GX</h1>
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#444444] mt-1">
          Built for Discipline
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          aria-label="Email address"
          className="w-full h-[52px] border border-[#222222] rounded-none px-4 text-white text-[15px] placeholder:text-[#444444] focus:border-[#ff4520] focus:outline-none transition-all duration-150"
          style={{ background: 'linear-gradient(180deg, #191919 0%, #161616 100%)', boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 3px rgba(0,0,0,0.3)' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          aria-label="Password"
          className="w-full h-[52px] border border-[#222222] rounded-none px-4 text-white text-[15px] placeholder:text-[#444444] focus:border-[#ff4520] focus:outline-none transition-all duration-150"
          style={{ background: 'linear-gradient(180deg, #191919 0%, #161616 100%)', boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 3px rgba(0,0,0,0.3)' }}
        />

        {error && (
          <Text variant="body" className="text-[#ef4444] text-[13px] -mt-1" role="alert">{error}</Text>
        )}

        <div className="mt-2">
          <Button
            variant="primary"
            label={submitting ? 'Signing in...' : 'Sign In'}
            onPress={handleSignIn}
            disabled={!email || !password}
            loading={submitting}
          />
        </div>
      </div>

      <div className="pb-12" />
    </div>
  )
})

export default Login
