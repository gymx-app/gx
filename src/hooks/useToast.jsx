import { createContext, useContext, useState, useCallback, useRef, memo } from 'react'

const ToastContext = createContext(null)

const TOAST_COLORS = {
  success: 'border-[#22c55e]/30 text-[#22c55e]',
  error: 'border-[#ef4444]/30 text-[#ef4444]',
  warning: 'border-[#f59e0b]/30 text-[#f59e0b]',
  info: 'border-[#2a2a2a] text-[#888888]',
}

const MAX_TOASTS = 3

/**
 * Toast provider — renders toast stack and exposes show/dismiss.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type, duration }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const ToastStack = memo(function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[95] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`bg-[#1a1a1a] border px-4 py-2 animate-slide-up pointer-events-auto ${
            TOAST_COLORS[toast.type] || TOAST_COLORS.info
          }`}
        >
          <span className="text-[13px]">{toast.message}</span>
        </div>
      ))}
    </div>
  )
})

/**
 * Hook to show toasts from any component.
 * @returns {{ show: (opts: { message: string, type?: string, duration?: number }) => number, dismiss: (id: number) => void }}
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
