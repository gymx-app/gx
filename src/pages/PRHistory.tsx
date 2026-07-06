import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PrRow from '../components/progress/PrRow'
import { ALL_EXERCISES, buildFullPrHistory } from '../components/progress/prData'
import { Text } from '../components/ui'
import { colors, radius } from '../styles/tokens'

const ALL_PRS = buildFullPrHistory()
const PAGE_SIZE = 20

const DATE_FILTERS = ['All time', 'Last 30 days', 'Last 90 days', 'This year'] as const
type DateFilter = (typeof DATE_FILTERS)[number]

function matchesDateFilter(dateISO: string, filter: DateFilter) {
  if (filter === 'All time') return true
  const date = new Date(dateISO)
  const now = new Date()
  if (filter === 'This year') return date.getFullYear() === now.getFullYear()
  const diffDays = (now.getTime() - date.getTime()) / 86_400_000
  if (filter === 'Last 30 days') return diffDays <= 30
  return diffDays <= 90
}

const SELECT_CLASS = "appearance-none flex-1 h-9 px-3 text-[12px] font-bold font-['DM_Sans']"

export default function PRHistory() {
  const navigate = useNavigate()
  const [dateFilter, setDateFilter] = useState<DateFilter>('All time')
  const [workoutFilter, setWorkoutFilter] = useState('All workouts')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () =>
      ALL_PRS.filter(
        (pr) =>
          (workoutFilter === 'All workouts' || pr.name === workoutFilter) &&
          matchesDateFilter(pr.dateISO, dateFilter)
      ),
    [dateFilter, workoutFilter]
  )

  // Reset pagination when filters change — adjusted during render (not an
  // effect) per https://react.dev/learn/you-might-not-need-an-effect
  const [prevFilters, setPrevFilters] = useState([dateFilter, workoutFilter])
  if (prevFilters[0] !== dateFilter || prevFilters[1] !== workoutFilter) {
    setPrevFilters([dateFilter, workoutFilter])
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE)
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  return (
    <div className="app-shell" style={{ background: colors.bg }}>
      <div
        className="flex items-center gap-3 px-4 h-[52px] shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <button onClick={() => void navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} color={colors.text} />
        </button>
        <Text variant="cardTitle">All PRs</Text>
      </div>

      <div className="flex gap-2 px-4 py-3 shrink-0">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className={SELECT_CLASS}
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: radius.chip,
          }}
        >
          {DATE_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={workoutFilter}
          onChange={(e) => setWorkoutFilter(e.target.value)}
          className={SELECT_CLASS}
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: radius.chip,
          }}
        >
          <option value="All workouts">All workouts</option>
          {ALL_EXERCISES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {visible.length === 0 ? (
          <Text variant="bodyMuted" className="text-center mt-8">
            No PRs match these filters.
          </Text>
        ) : (
          visible.map((pr, i) => (
            <div
              key={`${pr.name}-${pr.dateISO}`}
              style={
                i < visible.length - 1
                  ? { borderBottom: `1px solid ${colors.borderSubtle}` }
                  : undefined
              }
            >
              <PrRow {...pr} />
            </div>
          ))
        )}
        {hasMore && (
          <div ref={sentinelRef} className="py-4 text-center">
            <Text variant="caption">Loading more…</Text>
          </div>
        )}
      </div>
    </div>
  )
}
