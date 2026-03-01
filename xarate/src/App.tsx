import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initializeDatabase } from './db'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { HouseholdSetupPage } from './pages/HouseholdSetupPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ProtectedRoute, SetupGuard } from './components/auth'
import { ToastContainer } from './components/ui'

// Temporary home page component
function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Personal Expense Tracker
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome! You're successfully authenticated.
        </p>
        <div className="space-y-4">
          <a
            href="/expenses"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mr-4"
          >
            View Expenses
          </a>
          <a
            href="/categories"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Manage Categories
          </a>
        </div>
      </div>
    </div>
  )
}

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <HouseholdSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <HomePage />
              </SetupGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <CategoriesPage />
              </SetupGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <SetupGuard>
                <ExpensesPage />
              </SetupGuard>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
