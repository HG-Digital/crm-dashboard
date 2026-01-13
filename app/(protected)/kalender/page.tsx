"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* ===================== SUPABASE ===================== */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ===================== CONFIG ===================== */

const PEOPLE = [
  "Richard Gumpinger",
  "Simon Höld",
  "Bennet Wylezol",
];

/* ===================== TYPES ===================== */

type Lead = {
  id: string;
  company: string;
};

type CalendarEntry = {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  lead_id: string | null;
  calendar_entry_participants: {
    person: string;
  }[];
};

/* ===================== HELPERS ===================== */

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDate = (d: Date) =>
  d.toISOString().split("T")[0];

const isToday = (d: Date) =>
  toDate(d) === toDate(new Date());

/* ===================== PAGE ===================== */

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEntry | null>(null);

  const [form, setForm] = useState({
    date: "",
    title: "",
    start_time: "09:00",
    end_time: "10:00",
    lead_id: "",
    persons: [] as string[],
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  /* ===================== LOAD ===================== */

  useEffect(() => {
    const load = async () => {
      const from = toDate(days[0]);
      const to = toDate(days[6]);

      const { data: entriesData } = await supabase
        .from("calendar_entries")
        .select(`
          *,
          calendar_entry_participants (
            person
          )
        `)
        .gte("date", from)
        .lte("date", to)
        .order("start_time");

      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, company")
        .order("company");

      setEntries(entriesData ?? []);
      setLeads(leadsData ?? []);
    };

    load();
  }, [weekStart]);

  /* ===================== ACTIONS ===================== */

  const openCreate = (date: string) => {
    setEditing(null);
    setForm({
      date,
      title: "",
      start_time: "09:00",
      end_time: "10:00",
      lead_id: "",
      persons: [],
    });
    setModalOpen(true);
  };

  const openEdit = (e: CalendarEntry) => {
    setEditing(e);
    setForm({
      date: e.date,
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time,
      lead_id: e.lead_id ?? "",
      persons: e.calendar_entry_participants.map(
        (p) => p.person
      ),
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title || form.persons.length === 0) return;

    let entryId = editing?.id;

    if (editing) {
      await supabase
        .from("calendar_entries")
        .update({
          date: form.date,
          title: form.title,
          start_time: form.start_time,
          end_time: form.end_time,
          lead_id: form.lead_id || null,
        })
        .eq("id", editing.id);

      await supabase
        .from("calendar_entry_participants")
        .delete()
        .eq("calendar_entry_id", editing.id);
    } else {
      const { data } = await supabase
        .from("calendar_entries")
        .insert({
          date: form.date,
          title: form.title,
          start_time: form.start_time,
          end_time: form.end_time,
          lead_id: form.lead_id || null,
        })
        .select()
        .single();

      entryId = data?.id;
    }

    if (entryId) {
      await supabase
        .from("calendar_entry_participants")
        .insert(
          form.persons.map((p) => ({
            calendar_entry_id: entryId!,
            person: p,
          }))
        );
    }

    setModalOpen(false);
    setEditing(null);
    setWeekStart(new Date(weekStart)); // reload
  };

  const remove = async () => {
    if (!editing) return;
    await supabase
      .from("calendar_entries")
      .delete()
      .eq("id", editing.id);

    setModalOpen(false);
    setEditing(null);
    setWeekStart(new Date(weekStart));
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">📅 Kalender</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() =>
            setWeekStart(
              getMonday(
                new Date(weekStart.getTime() - 7 * 86400000)
              )
            )
          }
          className="px-4 py-2 bg-gray-700 rounded"
        >
          ← Woche
        </button>
        <button
          onClick={() =>
            setWeekStart(
              getMonday(
                new Date(weekStart.getTime() + 7 * 86400000)
              )
            )
          }
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Woche →
        </button>
      </div>

      <div className="grid grid-cols-8 border border-gray-700">
        <div className="bg-gray-800 p-2 font-bold">Person</div>

        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`p-2 text-center font-semibold ${
              isToday(d) ? "bg-blue-700" : "bg-gray-800"
            }`}
          >
            {d.toLocaleDateString("de-DE", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        ))}

        {PEOPLE.map((person) => (
          <>
            <div className="bg-gray-900 p-2 font-semibold">
              {person}
            </div>

            {days.map((d) => {
              const date = toDate(d);
              const dayEntries = entries.filter(
                (e) =>
                  e.date === date &&
                  e.calendar_entry_participants.some(
                    (p) => p.person === person
                  )
              );

              return (
                <div
                  key={person + date}
                  onClick={() => openCreate(date)}
                  className="border border-gray-700 min-h-[120px] p-1 cursor-pointer"
                >
                  {dayEntries.map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openEdit(e);
                      }}
                      className="bg-blue-600 rounded px-2 py-1 mb-1 text-sm"
                    >
                      <div className="font-semibold">
                        {e.title}
                      </div>
                      <div className="text-xs">
                        {e.start_time} – {e.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-96">
            <h2 className="text-xl font-bold mb-4">
              Termin
            </h2>

            <select
              multiple
              value={form.persons}
              onChange={(e) =>
                setForm({
                  ...form,
                  persons: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value
                  ),
                })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            >
              {PEOPLE.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select
              value={form.lead_id}
              onChange={(e) =>
                setForm({ ...form, lead_id: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            >
              <option value="">Kein Lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company}
                </option>
              ))}
            </select>

            <input
              placeholder="Titel"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            />

            <div className="flex gap-2 mb-4">
              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_time: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
              <input
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    end_time: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
            </div>

            <div className="flex justify-between">
              {editing && (
                <button
                  onClick={remove}
                  className="text-red-400"
                >
                  Löschen
                </button>
              )}

              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 rounded"
                >
                  Abbrechen
                </button>
                <button
                  onClick={save}
                  className="px-4 py-2 bg-blue-600 rounded"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
