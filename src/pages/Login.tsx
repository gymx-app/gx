import { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import { getProgrammeConfig, upsertProgrammeConfig } from '../services/programmeService'
import { logger } from '../lib/logger'
import { Button, Text, Input } from '../components/ui'
import { colors } from '../styles/tokens'

async function ensureProgrammeConfig(userId: string) {
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const { signIn, signUp } = useAuth()
  const { startLoading, stopLoading } = useLoading()
  const navigate = useNavigate()

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    startLoading()

    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      } else {
        const { user } = await signIn(email, password) as { user: { id: string } }
        await ensureProgrammeConfig(user.id)
        navigate('/', { replace: true })
      }
    } catch (err: unknown) {
      logger.error(`${mode} error:`, err)
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
      stopLoading()
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
    setSuccess(null)
  }

  return (
    <div
      className="flex flex-col px-6 overflow-y-auto"
      style={{ background: colors.bg, height: '100dvh' }}
    >
      <div className="pt-16 pb-0">
        <h1 className="font-['Bebas_Neue'] text-[36px] tracking-[6px] text-[#f0ede8] uppercase">
          G<span className="text-[#ff4520]">x</span>
        </h1>
        <p className="text-[11px] font-medium tracking-[3px] uppercase text-[#666666] mt-1">
          Built for Discipline
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <Text variant="body" className="text-[#ef4444] text-[13px] -mt-1" role="alert">{error}</Text>
        )}

        {success && (
          <Text variant="body" className="text-[#22c55e] text-[13px] -mt-1" role="status">{success}</Text>
        )}

        <div className="mt-2">
          <Button
            variant="primary"
            label={submitting
              ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')
            }
            onPress={handleSubmit}
            disabled={!email || !password}
            loading={submitting}
          />
        </div>

        <button
          onClick={switchMode}
          className="text-[13px] text-[#666666] mt-2 text-center active:text-[#f0ede8] transition-colors"
        >
          {mode === 'login'
            ? <>Don&apos;t have an account? <span className="text-[#ff4520] font-bold">Sign Up</span></>
            : <>Already have an account? <span className="text-[#ff4520] font-bold">Sign In</span></>
          }
        </button>
      </div>

      <div className="pb-12" />
    </div>
  )
})

export default Login
