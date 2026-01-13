'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ================= TYPES ================= */

type CommentRow = {
  id: string
  content: string
  created_at: string
  updated_at: string | null
  author_id: string
  profiles: {
    name: string
  }[] | null
}

type Props = {
  entityType: string
  entityId: string
}

/* ================= COMPONENT ================= */

export default function Comments({ entityType, entityId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  /* 🔐 SESSION LADEN (EXTREM WICHTIG FÜR RLS) */
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
    }

    loadSession()
  }, [])

  /* 📥 KOMMENTARE LADEN */
  const loadComments = async () => {
    if (!entityId) return

    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        author_id,
        profiles (
          name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Load comments error:', error)
      return
    }

    setComments(data ?? [])
  }

  useEffect(() => {
    loadComments()
  }, [entityId])

  /* ➕ / ✏️ SPEICHERN */
  const addOrUpdateComment = async () => {
    if (!text.trim() || !user) return

    setLoading(true)

    if (editingId) {
      const { error } = await supabase
        .from('comments')
        .update({
          content: text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .eq('author_id', user.id)

      if (error) console.error('Update error:', error)
    } else {
      const { error } = await supabase
        .from('comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          content: text,
          author_id: user.id, // 🔥 MUSS auth.uid() SEIN
        })
        .select()

      if (error) {
        console.error('Insert error:', error)
        setLoading(false)
        return
      }
    }

    setText('')
    setEditingId(null)
    setLoading(false)
    loadComments()
  }

  /* 🗑️ LÖSCHEN */
  const deleteComment = async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id)

    if (error) console.error('Delete error:', error)

    loadComments()
  }

  /* ================= UI ================= */

  return (
    <div className="mt-6 bg-gray-900 rounded-xl p-4">
      <h3 className="font-bold text-lg mb-4 text-white">
        💬 Interne Kommentare
      </h3>

      <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
        {comments.map((c) => (
          <div
            key={c.id}
            className="bg-gray-800 rounded-lg p-3 text-sm text-white"
          >
            <div className="flex justify-between mb-1">
              <span className="font-semibold">
                {c.profiles?.[0]?.name ?? 'Unbekannt'}
              </span>
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
        placeholder={
          user
            ? 'Kommentar schreiben…'
            : 'Bitte einloggen um zu kommentieren'
        }
        className="w-full p-3 rounded bg-white text-black mb-3"
        rows={3}
        disabled={!user || loading}
      />

      <button
        onClick={addOrUpdateComment}
        disabled={!user || loading}
        className="px-4 py-2 bg-blue-600 rounded text-white font-semibold disabled:opacity-50"
      >
        {editingId ? 'Speichern' : 'Kommentar hinzufügen'}
      </button>
    </div>
  )
}
