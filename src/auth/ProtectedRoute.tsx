import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-bg" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
