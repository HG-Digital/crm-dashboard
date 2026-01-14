'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/client'

type Finance = {
  id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  date: string
  category: string | null
  is_recurring: boolean
  document_url: string | null
}

type Period =
  | 'this_month'
  | 'last_month'
  | '3_months'
  | '6_months'
  | 'year'

const emptyForm = {
  id: null as string | null,
  title: '',
  amount: '',
  type: 'expense' as 'income' | 'expense',
  date: new Date().toISOString().slice(0, 10),
  category: '',
  isRecurring: false,
  document: null as File | null,
  documentUrl: null as string | null,
}

export default function FinanzenPage() {
  const [data, setData] = useState<Finance[]>([])
  const [period, setPeriod] = useState<Period>('this_month')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  /* ---------------- Zeitraum ---------------- */

  const fromDate = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)

    if (period === 'this_month') d.setDate(1)
    if (period === 'last_month') {
      d.setMonth(d.getMonth() - 1)
      d.setDate(1)
    }
    if (period === '3_months') d.setMonth(d.getMonth() - 3)
    if (period === '6_months') d.setMonth(d.getMonth() - 6)
    if (period === 'year') d.setFullYear(d.getFullYear() - 1)

    return d.toISOString().slice(0, 10)
  }, [period])

  /* ---------------- Laden ---------------- */

  const load = async () => {
    const { data } = await supabase
      .from('finances')
      .select('*')
      .gte('date', fromDate)
      .order('date', { ascending: false })

    setData(data || [])
  }

  useEffect(() => {
    load()
  }, [fromDate])

  /* ---------------- Upload ---------------- */

  const uploadFile = async (file: File) => {
    const path = `${crypto.randomUUID()}-${file.name}`
    await supabase.storage.from('finance-documents').upload(path, file)
    return supabase.storage.from('finance-documents').getPublicUrl(path).data.publicUrl
  }

  /* ---------------- Speichern ---------------- */

  const save = async () => {
    if (!form.title || !form.amount) return
    setSaving(true)

    let documentUrl = form.documentUrl
    if (form.document) documentUrl = await uploadFile(form.document)

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      date: form.date,
      category: form.category || null,
      is_recurring: form.isRecurring,
      document_url: documentUrl,
    }

    if (form.id) {
      await supabase.from('finances').update(payload).eq('id', form.id)
    } else {
      await supabase.from('finances').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    setForm({ ...emptyForm })
    load()
  }

  /* ---------------- Berechnung ---------------- */

  const income = data.filter(d => d.type === 'income').reduce((a, b) => a + b.amount, 0)
  const expense = data.filter(d => d.type === 'expense').reduce((a, b) => a + b.amount, 0)
  const saldo = income - expense

  /* ---------------- UI ---------------- */

  return (
    <div className="p-8 text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">💰 Finanzen</h1>

        <div className="flex gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="bg-gray-800 px-3 py-2 rounded"
          >
            <option value="this_month">Aktueller Monat</option>
            <option value="last_month">Letzter Monat</option>
            <option value="3_months">Letzte 3 Monate</option>
            <option value="6_months">Letzte 6 Monate</option>
            <option value="year">Letztes Jahr</option>
          </select>

          <button
            onClick={() => {
              setForm({ ...emptyForm })
              setModalOpen(true)
            }}
            className="bg-green-600 px-4 py-2 rounded font-semibold"
          >
            + Transaktion hinzufügen
          </button>
        </div>
      </div>

      {/* ÜBERSICHT */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-600/90 rounded-xl p-4">
          <div className="text-sm">Einnahmen</div>
          <div className="text-2xl font-bold">{income.toFixed(2)} €</div>
        </div>
        <div className="bg-red-600/90 rounded-xl p-4">
          <div className="text-sm">Ausgaben</div>
          <div className="text-2xl font-bold">{expense.toFixed(2)} €</div>
        </div>
        <div className="bg-blue-600/90 rounded-xl p-4">
          <div className="text-sm">Saldo</div>
          <div className="text-2xl font-bold">{saldo.toFixed(2)} €</div>
        </div>
      </div>

      {/* TABELLE */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 text-sm">
            <tr>
              <th className="p-3 text-left">Datum</th>
              <th className="p-3 text-left">Titel</th>
              <th className="p-3">Dokument</th>
              <th className="p-3 text-right">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr
                key={d.id}
                onClick={() => {
                  setForm({
                    id: d.id,
                    title: d.title,
                    amount: String(d.amount),
                    type: d.type,
                    date: d.date,
                    category: d.category || '',
                    isRecurring: d.is_recurring,
                    document: null,
                    documentUrl: d.document_url,
                  })
                  setModalOpen(true)
                }}
                className="border-t border-gray-800 hover:bg-gray-800 cursor-pointer"
              >
                <td className="p-3">{d.date}</td>
                <td className="p-3">{d.title}</td>
                <td className="p-3 text-center">
                  {d.document_url && (
                    <a
                      href={d.document_url}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                    >
                      📄
                    </a>
                  )}
                </td>
                <td
                  className={`p-3 text-right font-semibold ${
                    d.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {d.type === 'income' ? '+' : '-'}
                  {d.amount.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-[520px]">
            <h2 className="text-xl font-bold mb-4">
              {form.id ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <input className="input col-span-2" placeholder="Titel"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />

              <input className="input" type="number" placeholder="Betrag"
                value={form.amount}
                onChange={e =>
                  setForm({ ...form, amount: e.target.value.replace(/^0+/, '') })
                }
              />

              <select className="input"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
              >
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>

              <input type="date" className="input"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />

              <input className="input col-span-2" placeholder="Kategorie"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              />

              <input type="file" className="col-span-2"
                onChange={e =>
                  setForm({ ...form, document: e.target.files?.[0] || null })
                }
              />

              <label className="flex items-center gap-2 col-span-2 text-sm">
                <input type="checkbox"
                  checked={form.isRecurring}
                  onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
                />
                Monatliche Kosten
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded">
                Abbrechen
              </button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 rounded">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
