import { createContext, useContext, useState, useCallback, useRef } from 'react'

const LoadingContext = createContext(null)

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const counterRef = useRef(0)

  const startLoading = useCallback(() => {
    counterRef.current += 1
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    counterRef.current = Math.max(0, counterRef.current - 1)
    if (counterRef.current === 0) {
      setIsLoading(false)
    }
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) throw new Error('useLoading must be used within LoadingProvider')
  return context
}
