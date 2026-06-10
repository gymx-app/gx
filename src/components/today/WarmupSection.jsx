import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import exerciseData from '../../data/exercises.json'

const WARMUP_ITEMS = exerciseData.WARMUP_ITEMS

export default function WarmupSection({ dateStr, phase, warmupLogs, onUpdate }) {
  const { user } = useAuth()
  const completedKeys = new Set(warmupLogs.filter(l => l.completed).map(l => l.item_key))
  const completedCount = completedKeys.size
  const allDone = completedCount === WARMUP_ITEMS.length
  const [collapsed, setCollapsed] = useState(allDone)

  async function toggleItem(item) {
    const isCompleted = completedKeys.has(item.k)
    await supabase.from('warmup_logs').upsert({
      user_id: user.id,
      date: dateStr,
      phase,
      item_key: item.k,
      item_label: item.label,
      completed: !isCompleted,
    }, { onConflict: 'user_id,date,item_key' })
    onUpdate()
  }

  return (
    <div className="mt-4">
      <button
        className="w-full flex justify-between items-center mb-2"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#555555]">
          Warmup Protocol
        </span>
        <div className="flex items-center gap-2">
          {allDone ? (
            <span className="text-[11px] font-semibold text-[#22c55e]">Done</span>
          ) : (
            <span className="text-[11px] text-[#444444]">
              {completedCount}/{WARMUP_ITEMS.length}
            </span>
          )}
          <span className={`text-[10px] text-[#333333] transition-transform duration-200 ${
            collapsed ? '' : 'rotate-180'
          }`}>
            ▾
          </span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-[2px] bg-[#1a1a1a] w-full mb-3">
        <div
          className="h-full bg-[#ff4520] transition-all duration-300"
          style={{ width: `${(completedCount / WARMUP_ITEMS.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <div className="border border-[#1a1a1a]">
          {WARMUP_ITEMS.map((item, idx) => {
            const done = completedKeys.has(item.k)
            return (
              <button
                key={item.k}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-[#1a1a1a] transition-colors ${
                  idx > 0 ? 'border-t border-[#111111]' : ''
                }`}
                onClick={() => toggleItem(item)}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'bg-[#ff4520]' : 'border-2 border-[#2a2a2a]'
                }`}>
                  {done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-tight ${done ? 'text-[#444444]' : 'text-white'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[#333333] mt-0.5">{item.detail}</p>
                </div>
                <span className="text-[16px] shrink-0">{item.ic}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
