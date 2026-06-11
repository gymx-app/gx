import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoadingProvider } from './hooks/useLoading'
import { ToastProvider } from './hooks/useToast'
import ProtectedRoute from './auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import SplashScreen from './components/SplashScreen'
import LoadingBar from './components/LoadingBar'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

/**
 * Lazy import with automatic retry + hard reload on chunk load failure.
 * Handles stale service worker caching old chunk hashes after a new deploy.
 */
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk failed — likely a stale SW cache. Force reload once.
      const key = 'gx-chunk-reload'
      const lastReload = sessionStorage.getItem(key)
      const now = Date.now()
      // Only auto-reload once per 30s to prevent infinite reload loops
      if (!lastReload || now - Number(lastReload) > 30000) {
        sessionStorage.setItem(key, String(now))
        window.location.reload()
      }
      // If we already reloaded recently, surface the error
      return importFn()
    })
  )
}

const Login = lazyWithRetry(() => import('./pages/Login'))
const Today = lazyWithRetry(() => import('./pages/Today'))

function AppRoutes() {
  const { user, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [timerDone, setTimerDone] = useState(false)

  // 1.5s minimum splash
  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // Hide splash only when BOTH timer elapsed AND auth check complete
  useEffect(() => {
    if (timerDone && !loading) {
      setShowSplash(false)
    }
  }, [timerDone, loading])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <>
      <LoadingBar />
      <PWAUpdatePrompt />
      <Suspense fallback={null}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Today />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/gx">
        <AuthProvider>
          <LoadingProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </LoadingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
