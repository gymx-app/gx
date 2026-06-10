export default function WorkoutCompleteSheet({ workout, completedSets, onDismiss }) {
  const exercises = workout?.ex || []

  // Count totals
  let totalSetsLogged = 0
  let totalVolume = 0
  for (const key of Object.keys(completedSets)) {
    const set = completedSets[key]
    if (set.weight && set.reps) {
      totalSetsLogged++
      totalVolume += set.weight * set.reps
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onDismiss} />

      <div className="relative w-[calc(100%-32px)] max-w-[380px] bg-[#111111] border border-[#1a1a1a] p-6">
        {/* Big check */}
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-[22px] font-black text-center text-white tracking-tight">
          WORKOUT COMPLETE
        </h2>
        <p className="text-[13px] text-[#555555] text-center mt-1">
          {workout?.title}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-5 pt-4 border-t border-[#1a1a1a]">
          <div className="text-center">
            <p className="text-[24px] font-black text-[#ff4520]">{totalSetsLogged}</p>
            <p className="text-[10px] tracking-wider uppercase text-[#555555] mt-0.5">Sets</p>
          </div>
          <div className="text-center">
            <p className="text-[24px] font-black text-[#ff4520]">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            </p>
            <p className="text-[10px] tracking-wider uppercase text-[#555555] mt-0.5">Volume kg</p>
          </div>
          <div className="text-center">
            <p className="text-[24px] font-black text-[#ff4520]">{exercises.length}</p>
            <p className="text-[10px] tracking-wider uppercase text-[#555555] mt-0.5">Exercises</p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-6 bg-[#ff4520] text-white py-3.5 text-[13px] font-black tracking-wider uppercase active:scale-[0.98] transition-transform"
        >
          DONE
        </button>
      </div>
    </div>
  )
}
