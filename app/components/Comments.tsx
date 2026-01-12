'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Comment = {
  id: string
  author: string
  content: string
  created_at: string
  updated_at?: string
}

const USERS = ['Richard Gumpinger', 'Simon Höld', 'Bennet Wylezol']

export default function Comments({
  entityType,
  entityId,
}: {
  entityType: string
  entityId: string
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at')

    setComments(data || [])
  }

  const extractMentions = (text: string) =>
    USERS.filter((u) => text.includes(`@${u.split(' ')[0]}`))

  const addOrUpdateComment = async () => {
    if (!text.trim()) return

    if (editingId) {
      await supabase
        .from('comments')
        .update({
          content: text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
    } else {
      await supabase.from('comments').insert({
        entity_type: entityType,
        entity_id: entityId,
        author: 'Richard Gumpinger',
        content: text,
      })

      // 🔔 Notifications
      const mentions = extractMentions(text)
      for (const name of mentions) {
        await supabase.from('notifications').insert({
          user_name: name,
          message: `Du wurdest in einem Kommentar erwähnt`,
          entity_type: entityType,
          entity_id: entityId,
        })
      }
    }

    setText('')
    setEditingId(null)
    loadComments()
  }

  const deleteComment = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id)
    loadComments()
  }

  useEffect(() => {
  if (entityId) {
    loadComments()
  }
}, [entityId])

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
              <span className="font-semibold">{c.author}</span>
              <span className="text-xs opacity-60">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>

            <div className="mb-2 whitespace-pre-wrap">{c.content}</div>

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
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Kommentar schreiben… (@Richard @Simon @Bennet)"
        className="w-full p-3 rounded bg-white text-black mb-3"
        rows={3}
      />

      <button
        onClick={addOrUpdateComment}
        className="px-4 py-2 bg-blue-600 rounded text-white font-semibold"
      >
        {editingId ? 'Speichern' : 'Kommentar hinzufügen'}
      </button>
    </div>
  )
}
