export default function Program() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#111111] safe-area-top">
        <div className="h-14 px-4 flex items-center justify-between">
          <span className="text-xl font-black text-[#ff4520] w-10">Gx</span>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[#555555] font-medium">PROGRAM</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-offset pb-32">
        <div className="mt-32 text-center">
          <p className="text-[11px] tracking-[0.08em] uppercase text-[#333333]">PROGRAM</p>
          <p className="text-[13px] text-[#222222] mt-2">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
