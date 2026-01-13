'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const login = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // ✅ DAS HAT GEFEHLT
    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold mb-2 text-center">🔐 Login</h1>
        <p className="text-gray-400 text-center mb-8">
          Zugriff auf das CRM Dashboard
        </p>

        <div className="mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@firma.de"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600"
          />
        </div>

        <div className="mb-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600"
          />
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <button
          onClick={login}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Einloggen…' : 'Einloggen'}
        </button>
      </div>
    </div>
  )
}
