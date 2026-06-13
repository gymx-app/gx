import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoadingProvider } from './hooks/useLoading'
import { ToastProvider } from './hooks/useToast'
import ProtectedRoute from './auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import SplashScreen from './components/SplashScreen'
import LoadingBar from './components/LoadingBar'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import AppLayout from './components/layout/AppLayout'

function lazyWithRetry(importFn: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    importFn().catch(() => {
      const key = 'gx-chunk-reload'
      const lastReload = sessionStorage.getItem(key)
      const now = Date.now()
      if (!lastReload || now - Number(lastReload) > 30000) {
        sessionStorage.setItem(key, String(now))
        window.location.reload()
      }
      return importFn()
    })
  )
}

const Login = lazyWithRetry(() => import('./pages/Login'))
const Today = lazyWithRetry(() => import('./pages/Today'))
const Progress = lazyWithRetry(() => import('./pages/Progress'))
const Program = lazyWithRetry(() => import('./pages/Program'))
const Account = lazyWithRetry(() => import('./pages/Account'))

function AppRoutes() {
  const { user, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [timerDone, setTimerDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), 1500)
    return () => clearTimeout(t)
  }, [])

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
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Today />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/program" element={<Program />} />
          <Route path="/account" element={<Account />} />
        </Route>
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
