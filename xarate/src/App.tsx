import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { initializeDatabase } from './db'

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
      <div className="min-h-screen bg-gray-50">
        <h1 className="text-3xl font-bold text-center py-8">
          Personal Expense Tracker
        </h1>
      </div>
    </BrowserRouter>
  )
}

export default App
