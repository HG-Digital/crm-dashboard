'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Notification = {
  id: string
  message: string
  entity_type: string
  entity_id: string
  user_name: string
  read: boolean
  created_at: string
}

const CURRENT_USER = 'Richard Gumpinger'

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  // ⏱️ relative Zeit
  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  // 🔹 Initial Load (nur unread)
  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_name', CURRENT_USER)
      .eq('read', false)
      .order('created_at', { ascending: false })

    setNotifications(data || [])
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('notifications-live')

      // ✅ INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification

          if (n.user_name !== CURRENT_USER || n.read) return

          setNotifications((prev) =>
            prev.find((x) => x.id === n.id) ? prev : [n, ...prev]
          )
        }
      )

      // ✅ UPDATE (z.B. read=false gesetzt)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification

          setNotifications((prev) => {
            // wurde gelesen → entfernen
            if (n.user_name === CURRENT_USER && n.read) {
              return prev.filter((x) => x.id !== n.id)
            }

            // unread update → hinzufügen
            if (
              n.user_name === CURRENT_USER &&
              !n.read &&
              !prev.find((x) => x.id === n.id)
            ) {
              return [n, ...prev]
            }

            return prev
          })
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const openNotification = async (n: Notification) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', n.id)

    // sofort aus UI entfernen (kein Reload)
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))

    router.push(`/${n.entity_type}s/${n.entity_id}`)
  }

  // 💤 Empty State
  if (notifications.length === 0) {
    return (
      <div className="mb-6 text-gray-400 text-sm italic">
        Keine neuen Mentions
      </div>
    )
  }

  return (
    <div
  className="
    mb-6 bg-yellow-400 text-black p-4 rounded-xl
    transition-all duration-300 ease-out
    animate-notification
  "
    >
      <div className="font-bold mb-3 flex items-center justify-between">
        <span>🔔 Mentions</span>
        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => openNotification(n)}
            className="block w-full text-left px-2 py-1 rounded
                       hover:bg-black/10 transition"
          >
            <span className="underline">{n.message}</span>
            <span className="text-xs opacity-60 ml-2">
              · {timeAgo(n.created_at)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
