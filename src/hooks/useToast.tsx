import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  show: (opts: { message: string; type?: ToastType; duration?: number }) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'border-[#22c55e]/30 text-[#22c55e]',
  error: 'border-[#ef4444]/30 text-[#ef4444]',
  warning: 'border-[#f59e0b]/30 text-[#f59e0b]',
  info: 'border-[#2a2a2a] text-[#888888]',
}

const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((tid) => clearTimeout(tid))
      timers.clear()
    }
  }, [])

  const show = useCallback(
    ({
      message,
      type = 'info',
      duration = 3000,
    }: {
      message: string
      type?: ToastType
      duration?: number
    }) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type, duration }])

      if (duration > 0) {
        const tid = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
          timersRef.current.delete(id)
        }, duration)
        timersRef.current.set(id, tid)
      }
      return id
    },
    []
  )

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const ToastStack = memo(function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[95] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
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

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
