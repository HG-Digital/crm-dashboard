'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

/* ================= TYPES ================= */

type Transaction = {
  id: string
  user_id: string
  title: string
  amount: number
  category: string | null
  date: string
  is_recurring: boolean
  file_urls: string[]
}

type FormState = {
  title: string
  amount: string
  type: 'income' | 'expense'
  category: string
  date: string
  is_recurring: boolean
  file_urls: string[]
}

type TimeFilter = 'this' | 'last' | '3m' | '6m' | 'all'
type TypeFilter = 'all' | 'income' | 'expense'

/* ================= CONST ================= */

const emptyForm: FormState = {
  title: '',
  amount: '',
  type: 'expense',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  is_recurring: false,
  file_urls: [],
}

/* ================= HELPERS ================= */

function getDateRange(filter: TimeFilter) {
  const now = new Date()
  let from = new Date(2000, 0, 1)
  let to = now

  if (filter === 'this') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  if (filter === 'last') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    to = new Date(now.getFullYear(), now.getMonth(), 0)
  }

  if (filter === '3m') {
    from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  }

  if (filter === '6m') {
    from = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

/* ================= PAGE ================= */

export default function FinanzenPage() {
  const supabase = getSupabaseBrowserClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Transaction[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [onlyRecurring, setOnlyRecurring] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ================= AUTH ================= */

 useEffect(() => {
  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Auth error:', error.message)
      setUserId(null)
      return
    }

    if (!user) {
      setUserId(null)
      return
    }

    setUserId(user.id)
  }

  loadUser()
}, [supabase])

  /* ================= LOAD ================= */

  async function load() {
    if (!userId) return

    let query = supabase
      .from('finances')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (timeFilter !== 'all') {
      const { from, to } = getDateRange(timeFilter)
      query = query.gte('date', from).lte('date', to)
    }

    if (onlyRecurring) query = query.eq('is_recurring', true)

    if (typeFilter === 'income') query = query.gt('amount', 0)
    if (typeFilter === 'expense') query = query.lt('amount', 0)

    const { data, error } = await query
    if (error) {
      console.error(error)
      return
    }

    setItems((data as Transaction[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [userId, timeFilter, typeFilter, onlyRecurring])

  /* ================= TOTALS ================= */

  const totals = useMemo(() => {
    const income = items.filter(i => i.amount > 0).reduce((a, b) => a + b.amount, 0)
    const expense = items.filter(i => i.amount < 0).reduce((a, b) => a + b.amount, 0)
    return {
      income,
      expense,
      balance: income + expense,
    }
  }, [items])

  /* ================= FILE UPLOAD ================= */

async function handleFileUpload(files: FileList | null) {
  if (!files || !userId) return

  setUploading(true)
  const urls: string[] = []

  for (const file of Array.from(files)) {
    const ext = file.name.split('.').pop()
    const fileName = `${userId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('finance-files')
      .upload(fileName, file, { upsert: false })

    if (uploadError) {
      console.error(uploadError)
      setError('Datei Upload fehlgeschlagen')
      continue
    }

    const { data } = supabase.storage
      .from('finance-files')
      .getPublicUrl(fileName)

    urls.push(data.publicUrl)
  }

  setForm(f => ({
    ...f,
    file_urls: [...f.file_urls, ...urls],
  }))

  setUploading(false)
}

  /* ================= SAVE ================= */

  async function save() {
    setError(null)
    if (!userId) return setError('Nicht eingeloggt')
    if (!form.title.trim()) return setError('Titel fehlt')
    if (!form.amount || isNaN(Number(form.amount))) return setError('Ungültiger Betrag')

    const signedAmount =
      form.type === 'expense'
        ? -Math.abs(Number(form.amount))
        : Math.abs(Number(form.amount))

    const payload = {
  user_id: userId,
  title: form.title,
  amount: signedAmount,
  category: form.category,
  date: form.date,
  is_recurring: form.is_recurring,
  file_urls: form.file_urls.length ? form.file_urls : [],
}

    if (editing) {
      await supabase.from('finances').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('finances').insert(payload)
    }

    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    load()
  }

  async function remove() {
    if (!editing) return
    if (!confirm('Transaktion wirklich löschen?')) return

    await supabase.from('finances').delete().eq('id', editing.id)
    setModalOpen(false)
    setEditing(null)
    load()
  }

  /* ================= UI ================= */

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">Finanzen</h1>

        <div className="flex gap-2 flex-wrap">
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as TimeFilter)}>
            <option value="this">Dieser Monat</option>
            <option value="last">Letzter Monat</option>
            <option value="3m">Letzte 3 Monate</option>
            <option value="6m">Letzte 6 Monate</option>
            <option value="all">Alle</option>
          </select>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">Alle</option>
            <option value="income">Einnahmen</option>
            <option value="expense">Ausgaben</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyRecurring}
              onChange={e => setOnlyRecurring(e.target.checked)}
            />
            Wiederkehrend
          </label>

          <button
            onClick={() => {
              setEditing(null)
              setForm(emptyForm)
              setModalOpen(true)
            }}
            className="bg-blue-600 px-5 py-2 rounded-lg"
          >
            + Neue Transaktion
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-6">
        <Summary label="Einnahmen" value={totals.income} color="text-green-400" />
        <Summary label="Ausgaben" value={totals.expense} color="text-red-400" />
        <Summary
          label="Saldo"
          value={totals.balance}
          color={totals.balance < 0 ? 'text-red-400' : 'text-green-400'}
        />
      </div>

      {/* LIST */}
      <div className="bg-neutral-900 rounded-2xl overflow-hidden">
        {items.map(t => (
          <div
            key={t.id}
            onClick={() => {
              setEditing(t)
              setForm({
                title: t.title,
                amount: String(Math.abs(t.amount)),
                type: t.amount < 0 ? 'expense' : 'income',
                category: t.category ?? '',
                date: t.date,
                is_recurring: t.is_recurring,
                file_urls: t.file_urls ?? [],
              })
              setModalOpen(true)
            }}
            className="flex justify-between p-4 hover:bg-white/5 cursor-pointer border-b border-white/5"
          >
            <div>
              <div className="font-medium">{t.title}</div>
             <div className="text-sm opacity-60">
  {t.category} · {t.date}
  {t.file_urls && t.file_urls.length > 0 && (
    <span className="ml-2">📎 {t.file_urls.length}</span>
  )}
</div>
            </div>

            <div className={t.amount < 0 ? 'text-red-400' : 'text-green-400'}>
              {t.amount.toFixed(2)} €
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center z-50">
          <div className="bg-neutral-900 p-6 rounded-2xl w-full max-w-lg space-y-4">
            <h2 className="text-xl font-semibold">
              {editing ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
            </h2>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <input
              placeholder="Titel"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
              >
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>

              <input
                type="number"
                placeholder="Betrag"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <input
              placeholder="Kategorie"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />

            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />

            <label className="flex gap-2 items-center text-sm">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
              />
              Monatlich wiederkehrend
            </label>

            <input type="file" multiple onChange={e => handleFileUpload(e.target.files)} />

            {form.file_urls.length > 0 && (
  <div className="text-sm space-y-1">
    <div className="opacity-60">Dokumente:</div>
    {form.file_urls.map((url, i) => (
      <a
        key={i}
        href={url}
        target="_blank"
        className="block underline text-blue-400"
      >
        Datei {i + 1}
      </a>
    ))}
  </div>
)}

            <div className="flex justify-between pt-2">
              {editing && (
                <button onClick={remove} className="text-red-500">
                  Löschen
                </button>
              )}

              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)}>Abbrechen</button>
                <button onClick={save} disabled={uploading} className="bg-blue-600 px-4 py-2 rounded">
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

/* ================= SUMMARY ================= */

function Summary({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
      <div className="text-sm opacity-60">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>
        {value.toFixed(2)} €
      </div>
    </div>
  )
}
