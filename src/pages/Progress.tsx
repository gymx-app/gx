import { useState, useEffect } from 'react'
import TopBar from '../components/layout/TopBar'
import { colors } from '../styles/tokens'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

interface BaselineRow {
  exercise_name: string
  estimated_1rm_kg: number
  working_weight_kg: number
  set3_weight_kg: number
  set3_reps: number
  tested_at: string | null
}

export default function Progress() {
  const { user } = useAuth()
  const [baselines, setBaselines] = useState<BaselineRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function load() {
      try {
        const { data: programme, error: progErr } = await supabase
          .from('programmes')
          .select('id')
          .eq('user_id', user!.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (progErr) throw progErr

        if (!programme) {
          if (!cancelled) setBaselines([])
          return
        }

        const { data, error } = await supabase
          .from('strength_baselines')
          .select(
            'exercise_name, estimated_1rm_kg, working_weight_kg, set3_weight_kg, set3_reps, tested_at'
          )
          .eq('user_id', user!.id)
          .eq('programme_id', programme.id)
          .order('tested_at', { ascending: true })
        if (error) throw error

        if (!cancelled) setBaselines(data ?? [])
      } catch (err) {
        logger.error('Progress baseline load:', err)
        if (!cancelled) setBaselines([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the user identity changes
  }, [user?.id])

  if (!loading && baselines.length > 0) {
    const testedAt = baselines[0]?.tested_at
    const testedLabel = testedAt
      ? new Date(testedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : ''

    return (
      <>
        <TopBar title="PROGRESS" />
        <div className="flex-1 overflow-y-auto pb-8 px-4">
          <h2 className="font-['Bebas_Neue'] text-2xl text-white mt-4">YOUR BASELINE STRENGTH</h2>
          <p className="font-['DM_Sans'] text-sm text-zinc-400 mt-1 mb-4">
            Tested on {testedLabel}. Used to prescribe your starting weights.
          </p>

          {baselines.map((b, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-4 mb-3">
              <p className="font-['DM_Sans'] text-sm font-medium text-white">{b.exercise_name}</p>
              <p className="text-xs text-zinc-400">Est. 1RM: {b.estimated_1rm_kg}kg</p>
              <p className="text-xs text-orange-500">Day 1 weight: {b.working_weight_kg}kg</p>
              <p className="text-xs text-zinc-600">
                Test: {b.set3_weight_kg}kg × {b.set3_reps} reps
              </p>
            </div>
          ))}

          <p className="text-xs text-zinc-600 text-center mt-4">
            Full progress tracking coming soon
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="PROGRESS" />
      <div className="flex-1 overflow-y-auto pb-8 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-[320px] p-8 text-center"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
          }}
        >
          <p className="text-[40px] mb-3">📈</p>
          <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mb-2">
            PROGRESS
          </h2>
          <p className="text-[13px] text-[#666666] leading-[1.6]">
            Track your lifts, volume, and consistency over time.
          </p>
          <p className="text-[11px] text-[#444444] mt-3">Coming soon</p>
        </div>
      </div>
    </>
  )
}
