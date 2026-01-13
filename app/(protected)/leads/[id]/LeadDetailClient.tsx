'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Comments from '@/app/components/Comments'
import Skeleton from '@/app/components/Skeleton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LeadDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [lead, setLead] = useState<any>(null)
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLead = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (!error) setLead(data)
      setLoading(false)
    }

    loadLead()
  }, [id])

  const saveLead = async () => {
    let notes = lead.notes || ''

    if (newNote.trim()) {
      const ts = new Date().toLocaleString('de-DE')
      notes = `[${ts}]\n${newNote}\n\n${notes}`
    }

    await supabase
      .from('leads')
      .update({
        company: lead.company,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        notes,
        last_contact: new Date().toISOString(),
      })
      .eq('id', id)

    setLead({ ...lead, notes })
    setNewNote('')
    alert('Gespeichert ✅')
  }

  if (loading) {
  return (
    <div className="p-10 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

  if (!lead) {
    return <div className="p-10 text-white">Lead nicht gefunden</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 p-10 text-white">
      <button
        onClick={() => router.push('/leads')}
        className="mb-6 text-blue-400 underline"
      >
        ← Zurück
      </button>

      <div className="max-w-3xl bg-white rounded-xl p-8 text-black">
        <h1 className="text-2xl font-bold mb-6">Lead bearbeiten</h1>

        {/* Stammdaten */}
        <div className="grid grid-cols-2 gap-4">
          <input
            className="border p-3 rounded"
            placeholder="Firma"
            value={lead.company || ''}
            onChange={(e) =>
              setLead({ ...lead, company: e.target.value })
            }
          />

          <select
            className="border p-3 rounded"
            value={lead.status || ''}
            onChange={(e) =>
              setLead({ ...lead, status: e.target.value })
            }
          >
            <option>Neu</option>
            <option>Kontaktiert</option>
            <option>Interesse</option>
            <option>Angebot gesendet</option>
            <option>Gewonnen</option>
            <option>Abgelehnt</option>
          </select>

          <input
            className="border p-3 rounded"
            placeholder="Ansprechpartner"
            value={lead.contact_name || ''}
            onChange={(e) =>
              setLead({
                ...lead,
                contact_name: e.target.value,
              })
            }
          />

          <input
            className="border p-3 rounded"
            placeholder="Telefon"
            value={lead.phone || ''}
            onChange={(e) =>
              setLead({ ...lead, phone: e.target.value })
            }
          />

          <input
            className="border p-3 rounded col-span-2"
            placeholder="E-Mail"
            value={lead.email || ''}
            onChange={(e) =>
              setLead({ ...lead, email: e.target.value })
            }
          />
        </div>

        {/* Notizen */}
        <div className="mt-6">
          <label className="font-semibold block mb-2">
            Neue Notiz
          </label>
          <textarea
            className="border p-3 rounded w-full min-h-[100px]"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="font-semibold block mb-2">
            Notizen-Verlauf
          </label>
          <div className="border rounded p-4 bg-gray-50 whitespace-pre-wrap text-sm max-h-[250px] overflow-y-auto">
            {lead.notes || 'Noch keine Notizen'}
          </div>
        </div>

        {/* 💬 COMMENTS – NEU */}
        <Comments entityType="lead" entityId={lead.id} />

        <button
          onClick={saveLead}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold"
        >
          Speichern
        </button>
      </div>
    </div>
  )
}
