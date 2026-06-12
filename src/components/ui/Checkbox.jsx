import { memo, useCallback } from 'react'
import { colors, radius } from '../../styles/tokens'

const CHECK_SVG = (
  <svg className="w-[11px] h-[11px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

function Checkbox({ checked, onToggle, size = 20 }) {
  const handleToggle = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(30)
    onToggle()
  }, [onToggle])

  const style = {
    width: size,
    height: size,
    borderRadius: radius.checkbox,
    ...(checked
      ? { background: colors.success, borderColor: colors.success }
      : { border: `1.5px solid ${colors.dim}` }
    ),
  }

  const cls = `shrink-0 flex items-center justify-center transition-all duration-150 ${
    checked ? 'text-black' : 'text-transparent'
  }`

  if (!onToggle) {
    return (
      <div role="checkbox" aria-checked={checked} className={cls} style={style}>
        {CHECK_SVG}
      </div>
    )
  }

  return (
    <button onClick={handleToggle} role="checkbox" aria-checked={checked} className={cls} style={style}>
      {CHECK_SVG}
    </button>
  )
}

export default memo(Checkbox)
