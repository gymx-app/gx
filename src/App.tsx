import { useState, useEffect, lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoadingProvider } from './hooks/useLoading'
import { ToastProvider } from './hooks/useToast'
import { useProfileCompletion } from './hooks/useProfileCompletion'
import ProtectedRoute from './auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import SplashScreen from './components/SplashScreen'
import LoadingBar from './components/LoadingBar'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import AppLayout from './components/layout/AppLayout'
import { checkCacheVersion } from './services/cacheVersion'
import { initNetworkQuality } from './services/networkQuality'
import { initSyncState } from './services/syncState'

checkCacheVersion()
initNetworkQuality()
initSyncState()

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
const PRHistory = lazyWithRetry(() => import('./pages/PRHistory'))
const ScanReport = lazyWithRetry(() => import('./pages/ScanReport'))
const Program = lazyWithRetry(() => import('./pages/Program'))
const Account = lazyWithRetry(() => import('./pages/Account'))
const OnboardingWizard = lazyWithRetry(() => import('./features/onboarding/OnboardingWizard'))
const DesignSystem = import.meta.env.DEV
  ? lazyWithRetry(() => import('./pages/DesignSystem'))
  : null

function OnboardingGate({ children }: { children: ReactNode }) {
  const { status } = useProfileCompletion()

  if (status === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div className="w-8 h-8 border-2 border-[#ff4520] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (status === 'goal-only') {
    return <Navigate to="/onboarding?mode=complete" replace />
  }

  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const [timerDone, setTimerDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), 1500)
    return () => clearTimeout(t)
  }, [])

  if (!timerDone || loading) {
    return <SplashScreen />
  }

  return (
    <>
      <LoadingBar />
      <PWAUpdatePrompt />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          {DesignSystem && <Route path="/design-system" element={<DesignSystem />} />}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/prs"
            element={
              <ProtectedRoute>
                <PRHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/scan"
            element={
              <ProtectedRoute>
                <ScanReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout
                    tabs={[
                      { path: '/', element: <Today /> },
                      { path: '/program', element: <Program /> },
                      { path: '/progress', element: <Progress /> },
                      { path: '/account', element: <Account /> },
                    ]}
                  />
                </OnboardingGate>
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
