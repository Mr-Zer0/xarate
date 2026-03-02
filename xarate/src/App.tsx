import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initializeDatabase } from './db'
import {
  LoginPage,
  SignupPage,
  HouseholdSetupPage,
  ExpensesPage,
  AddExpensePage,
  EditExpensePage,
  SummaryPage,
  CategoriesPage,
  NotFoundPage,
} from './pages'
import { ProtectedRoute, SetupGuard } from './components/auth'
import { AppShell } from './components/layout'
import { ToastContainer } from './components/ui'

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize IndexedDB on app startup
    initializeDatabase()
      .then(() => {
        console.log('Database ready')
        setDbReady(true)
      })
      .catch((error) => {
        console.error('Database initialization failed:', error)
        setDbError(error.message || 'Failed to initialize database')
      })
  }, [])

  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Database Error
          </h1>
          <p className="text-gray-700">{dbError}</p>
        </div>
      </div>
    )
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">
            Initializing...
          </h1>
          <p className="text-gray-600">Setting up local database</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public routes - Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected route - Setup (requires auth but not setup completion) */}
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <HouseholdSetupPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes - Main app (requires auth and setup completion) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <Navigate to="/expenses" replace />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <ExpensesPage />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <AddExpensePage />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <EditExpensePage />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <SummaryPage />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <AppShell>
                  <CategoriesPage />
                </AppShell>
              </SetupGuard>
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found - catch all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
