'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/client'

type CommentUI = {
  id: string
  content: string
  created_at: string
  author_id: string
  author_name: string
}

type Props = {
  entityType: string
  entityId: string
}

export default function Comments({ entityType, entityId }: Props) {
  const [comments, setComments] = useState<CommentUI[]>([])
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  /* 🔐 AUTH */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  /* 📥 LOAD COMMENTS (BOMBENSICHER) */
  const loadComments = async () => {
    if (!entityId) {
      setComments([])
      return
    }

    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        author_id,
        profiles ( name )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })

    if (error || !Array.isArray(data)) {
      console.error('❌ Load comments failed:', error, data)
      setComments([])
      return
    }

    /* 🔥 NORMALISIERUNG – DAS IST DER FIX */
    const normalized: CommentUI[] = data.map((row: any) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles

      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        author_id: row.author_id,
        author_name: profile?.name || 'Unbekannt',
      }
    })

    setComments(normalized)
  }

  useEffect(() => {
    loadComments()
  }, [entityId])

  /* ➕ / ✏️ SAVE */
  const saveComment = async () => {
    if (!text.trim() || !user) return
    setLoading(true)

    if (editingId) {
      await supabase
        .from('comments')
        .update({ content: text })
        .eq('id', editingId)
        .eq('author_id', user.id)
    } else {
      await supabase.from('comments').insert({
        entity_type: entityType,
        entity_id: entityId,
        content: text,
      })
    }

    setText('')
    setEditingId(null)
    setLoading(false)
    loadComments()
  }

  /* 🗑️ DELETE */
  const deleteComment = async (id: string) => {
    if (!user) return
    await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id)

    loadComments()
  }

  /* ================= UI ================= */

  return (
    <div className="mt-6 bg-gray-900 rounded-xl p-4">
      <h3 className="text-white font-bold text-lg mb-4">
        💬 Interne Kommentare
      </h3>

      <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
        {comments.map((c) => (
          <div
            key={c.id}
            className="bg-gray-800 rounded-lg p-3 text-sm text-white"
          >
            <div className="flex justify-between mb-1">
              <span className="font-semibold">{c.author_name}</span>
              <span className="text-xs opacity-60">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>

            <div className="mb-2 whitespace-pre-wrap">
              {c.content}
            </div>

            {user?.id === c.author_id && (
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => {
                    setEditingId(c.id)
                    setText(c.content)
                  }}
                  className="text-blue-400 hover:underline"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-red-400 hover:underline"
                >
                  Löschen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-3 rounded bg-white text-black mb-3"
        rows={3}
        disabled={!user || loading}
        placeholder={user ? 'Kommentar schreiben…' : 'Bitte einloggen'}
      />

      <button
        onClick={saveComment}
        disabled={!user || loading}
        className="px-4 py-2 bg-blue-600 rounded text-white font-semibold disabled:opacity-50"
      >
        {editingId ? 'Speichern' : 'Kommentar hinzufügen'}
      </button>
    </div>
  )
}
