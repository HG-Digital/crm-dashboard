'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function login() {
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

    // EXTREM WICHTIG
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        <input
          className="w-full mb-3 p-3 rounded bg-gray-800"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full mb-4 p-3 rounded bg-gray-800"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 mb-3">{error}</p>}

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-indigo-600 py-3 rounded"
        >
          {loading ? '...' : 'Einloggen'}
        </button>
      </div>
    </div>
  )
}
