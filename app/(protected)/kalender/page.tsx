'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import dayjs from 'dayjs'
import 'dayjs/locale/de'

dayjs.locale('de')

const EMPLOYEES = [
  'Richard Gumpinger',
  'Simon Höld',
  'Bennet Wylezol',
]

export default function KalenderPage() {
  const [weekStart, setWeekStart] = useState(
  dayjs().locale('de').startOf('week')
)

  const [entries, setEntries] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any | null>(null)

  const [form, setForm] = useState({
    title: '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    lead_id: '',
    persons: [] as string[],
  })

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day')),
    [weekStart]
  )

  useEffect(() => {
    loadData()
  }, [weekStart])

  async function loadData() {
    setLoading(true)

    const from = weekStart.format('YYYY-MM-DD')
    const to = weekStart.add(6, 'day').format('YYYY-MM-DD')

    const { data: entriesData } = await supabase
      .from('calendar_entries')
      .select('*, leads(company)')
      .gte('date', from)
      .lte('date', to)

    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, company')

    setEntries(entriesData ?? [])
    setLeads(leadsData ?? [])
    setLoading(false)
  }

  function openNew(date: string, person?: string) {
    setEditingEntry(null)
    setForm({
      title: '',
      date,
      start_time: '09:00',
      end_time: '10:00',
      lead_id: '',
      persons: person ? [person] : [],
    })
    setModalOpen(true)
  }

  function openEdit(entry: any) {
    setEditingEntry(entry)
    setForm({
      title: entry.title,
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      lead_id: entry.lead_id ?? '',
      persons: [entry.person],
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.title || !form.date || form.persons.length === 0) return

    if (editingEntry) {
      await supabase
        .from('calendar_entries')
        .update({
          title: form.title,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          lead_id: form.lead_id || null,
        })
        .eq('id', editingEntry.id)
    } else {
      const rows = form.persons.map(person => ({
        title: form.title,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        lead_id: form.lead_id || null,
        person,
      }))

      await supabase.from('calendar_entries').insert(rows)
    }

    setModalOpen(false)
    loadData()
  }

  async function remove() {
    if (!editingEntry) return
    await supabase.from('calendar_entries').delete().eq('id', editingEntry.id)
    setModalOpen(false)
    loadData()
  }

  return (
    <div className="p-6 min-h-screen bg-[#0f1115] text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
  <button
    onClick={() => setWeekStart(weekStart.subtract(1, 'week'))}
    className="px-3 py-1 bg-gray-800 rounded"
  >
    ←
  </button>

  <h1 className="text-xl font-semibold">
    Woche {weekStart.format('DD.MM')} –{' '}
    {weekStart.add(6, 'day').format('DD.MM.YYYY')}
  </h1>

  <div className="flex gap-2">
    <button
      onClick={() => {
        setEditingEntry(null)
        setForm({
          title: '',
          date: dayjs().format('YYYY-MM-DD'),
          start_time: '09:00',
          end_time: '10:00',
          lead_id: '',
          persons: [],
        })
        setModalOpen(true)
      }}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
    >
      + Termin hinzufügen
    </button>

    <button
      onClick={() => setWeekStart(weekStart.add(1, 'week'))}
      className="px-3 py-1 bg-gray-800 rounded"
    >
      →
    </button>
  </div>
</div>

      {/* Kalender */}
      <div className="grid grid-cols-[200px_repeat(3,1fr)] gap-px bg-gray-800 rounded overflow-hidden">
        <div />

        {EMPLOYEES.map(p => (
          <div key={p} className="bg-[#151922] p-3 font-medium text-center">
            {p}
          </div>
        ))}

        {weekDays.map(day => (
          <div key={day.format('YYYY-MM-DD')} className="contents">
            <div className="bg-[#151922] p-3 font-medium">
              {day.format('dddd')}
              <div className="text-xs text-gray-400">
                {day.format('DD.MM')}
              </div>
            </div>

            {EMPLOYEES.map(person => {
              const dayEntries = entries.filter(
                e =>
                  e.date === day.format('YYYY-MM-DD') &&
                  e.person === person
              )

              return (
                <div
                  key={person}
                  onClick={() =>
                    openNew(day.format('YYYY-MM-DD'), person)
                  }
                  className="bg-[#0f1115] min-h-[120px] p-2 space-y-2 cursor-pointer hover:bg-[#131722]"
                >
                  {dayEntries.map(e => (
                    <div
                      key={e.id}
                      onClick={ev => {
                        ev.stopPropagation()
                        openEdit(e)
                      }}
                      className="bg-indigo-600/20 border border-indigo-500/40 rounded p-2 text-sm"
                    >
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-gray-300">
                        {e.start_time} – {e.end_time}
                      </div>
                      {e.leads?.company && (
                        <div className="text-xs text-indigo-300">
                          Lead: {e.leads.company}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#151922] p-6 rounded w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">
              {editingEntry ? 'Termin bearbeiten' : 'Neuer Termin'}
            </h2>

            <input
              placeholder="Titel"
              value={form.title}
              onChange={e =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full bg-[#0f1115] border border-gray-700 rounded px-3 py-2"
            />

            <input
  type="date"
  value={form.date}
  onChange={e =>
    setForm({ ...form, date: e.target.value })
  }
  className="w-full bg-[#0f1115] border border-gray-700 rounded px-3 py-2"
/>

            <select
              value={form.lead_id}
              onChange={e =>
                setForm({ ...form, lead_id: e.target.value })
              }
              className="w-full bg-[#0f1115] border border-gray-700 rounded px-3 py-2"
            >
              <option value="">Kein Lead</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={form.start_time}
                onChange={e =>
                  setForm({ ...form, start_time: e.target.value })
                }
                className="bg-[#0f1115] border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="time"
                value={form.end_time}
                onChange={e =>
                  setForm({ ...form, end_time: e.target.value })
                }
                className="bg-[#0f1115] border border-gray-700 rounded px-3 py-2"
              />
            </div>

            {!editingEntry && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400">
                  Mitarbeiter
                </div>
                {EMPLOYEES.map(p => (
                  <label key={p} className="flex gap-2 items-center text-sm">
                    <input
                      type="checkbox"
                      checked={form.persons.includes(p)}
                      onChange={() =>
                        setForm({
                          ...form,
                          persons: form.persons.includes(p)
                            ? form.persons.filter(x => x !== p)
                            : [...form.persons, p],
                        })
                      }
                    />
                    {p}
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Abbrechen
              </button>

              <div className="flex gap-2">
                {editingEntry && (
                  <button
                    onClick={remove}
                    className="px-4 py-2 bg-red-600 rounded"
                  >
                    Löschen
                  </button>
                )}
                <button
                  onClick={save}
                  className="px-4 py-2 bg-indigo-600 rounded"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
