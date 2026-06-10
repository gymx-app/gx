import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoadingProvider } from './hooks/useLoading'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import Today from './pages/Today'
import SplashScreen from './components/SplashScreen'
import LoadingBar from './components/LoadingBar'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

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
    </>
  )
}

function App() {
  return (
    <BrowserRouter basename="/gx">
      <AuthProvider>
        <LoadingProvider>
          <AppRoutes />
        </LoadingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
