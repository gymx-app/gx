export default function Account() {
  return (
    <>
      <div className="bg-[#141414] border-b border-[#2a2a2a] flex-shrink-0 safe-area-top">
        <div className="h-[52px] px-4 flex items-center justify-between">
          <span className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-[#f0ede8]">G<span className="text-[#ff4520]">x</span></span>
          <span className="text-[10px] font-bold tracking-[2px] uppercase text-[#666666]">ACCOUNT</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="mt-32 text-center">
          <p className="text-[10px] font-bold tracking-[2px] uppercase text-[#666666]">ACCOUNT</p>
          <p className="text-[13px] text-[#666666] mt-2">Coming soon</p>
        </div>
      </div>
    </>
  )
}
