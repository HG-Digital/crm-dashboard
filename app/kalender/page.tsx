"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ===================== KONFIG ===================== */

const PEOPLE = [
  "Richard Gumpinger",
  "Simon Höld",
  "Bennet Wylezol",
];

type Lead = {
  id: string;
  company: string;
};

type Entry = {
  id: string;
  person: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  lead_id?: string | null;
};

/* ===================== HELPERS ===================== */

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isToday = (date: Date) => {
  const t = new Date();
  return (
    date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
  );
};

const overlaps = (a: Entry, b: Entry) => {
  return (
    a.start_time < b.end_time &&
    b.start_time < a.end_time
  );
};

/* ===================== PAGE ===================== */

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [modalData, setModalData] = useState({
    person: PEOPLE[0],
    date: "",
    title: "",
    start: "09:00",
    end: "10:00",
    lead_id: null as string | null,
  });

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  /* ===================== LOAD ===================== */

  const loadEntries = async () => {
    const from = days[0].toISOString().split("T")[0];
    const to = days[6].toISOString().split("T")[0];

    const { data } = await supabase
      .from("calendar_entries")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("start_time");

    setEntries(data || []);
  };

  const loadLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("id, company")
      .order("company");

    setLeads(data || []);
  };

  useEffect(() => {
    loadEntries();
    loadLeads();
  }, [weekStart]);

  /* ===================== ACTIONS ===================== */

  const openCreate = (person: string, date: string) => {
    setEditingId(null);
    setModalData({
      person,
      date,
      title: "",
      start: "09:00",
      end: "10:00",
      lead_id: null,
    });
    setModalOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditingId(e.id);
    setModalData({
      person: e.person,
      date: e.date,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      lead_id: e.lead_id ?? null,
    });
    setModalOpen(true);
  };

  const saveEntry = async () => {
    const { person, date, title, start, end, lead_id } = modalData;
    if (!title) return;

    if (editingId) {
      await supabase
        .from("calendar_entries")
        .update({
          person,
          date,
          title,
          start_time: start,
          end_time: end,
          lead_id,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("calendar_entries").insert([
        {
          person,
          date,
          title,
          start_time: start,
          end_time: end,
          lead_id,
        },
      ]);
    }

    setModalOpen(false);
    loadEntries();
  };

  const deleteEntry = async () => {
    if (!editingId) return;
    await supabase
      .from("calendar_entries")
      .delete()
      .eq("id", editingId);

    setModalOpen(false);
    loadEntries();
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">📅 Wochenkalender</h1>

      {/* Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() =>
            setWeekStart(
              startOfWeek(
                new Date(weekStart.getTime() - 7 * 86400000)
              )
            )
          }
          className="px-4 py-2 bg-gray-700 rounded"
        >
          ← Vorherige Woche
        </button>
        <button
          onClick={() =>
            setWeekStart(
              startOfWeek(
                new Date(weekStart.getTime() + 7 * 86400000)
              )
            )
          }
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Nächste Woche →
        </button>
      </div>

      {/* Kalender */}
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
              const dateStr = d.toISOString().split("T")[0];
              const dayEntries = entries.filter(
                (e) =>
                  e.person === person && e.date === dateStr
              );

              return (
                <div
                  key={person + dateStr}
                  onClick={() => openCreate(person, dateStr)}
                  className={`border border-gray-700 min-h-[120px] p-1 cursor-pointer ${
                    isToday(d) ? "bg-gray-800" : ""
                  }`}
                >
                  {dayEntries.map((e) => {
                    const conflict = dayEntries.some(
                      (o) =>
                        o.id !== e.id &&
                        overlaps(e, o)
                    );

                    return (
                      <div
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(e);
                        }}
                        className={`rounded px-2 py-1 mb-1 text-sm ${
                          conflict
                            ? "bg-red-600"
                            : "bg-blue-600"
                        }`}
                      >
                        <div className="font-semibold">
                          {e.title}
                        </div>
                        <div className="text-xs opacity-80">
                          {e.start_time} – {e.end_time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-96">
            <h2 className="text-xl font-bold mb-4">
              {editingId
                ? "Termin bearbeiten"
                : "Termin anlegen"}
            </h2>

            <select
              value={modalData.person}
              onChange={(e) =>
                setModalData({
                  ...modalData,
                  person: e.target.value,
                })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            >
              {PEOPLE.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select
              value={modalData.lead_id ?? ""}
              onChange={(e) =>
                setModalData({
                  ...modalData,
                  lead_id:
                    e.target.value || null,
                })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            >
              <option value="">
                Kein Lead
              </option>
              {leads.map((l) => (
                <option
                  key={l.id}
                  value={l.id}
                >
                  {l.company}
                </option>
              ))}
            </select>

            <input
              placeholder="Titel"
              value={modalData.title}
              onChange={(e) =>
                setModalData({
                  ...modalData,
                  title: e.target.value,
                })
              }
              className="w-full mb-3 px-3 py-2 rounded bg-white text-black"
            />

            <div className="flex gap-3 mb-4">
              <input
                type="time"
                value={modalData.start}
                onChange={(e) =>
                  setModalData({
                    ...modalData,
                    start: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
              <input
                type="time"
                value={modalData.end}
                onChange={(e) =>
                  setModalData({
                    ...modalData,
                    end: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
            </div>

            <div className="flex justify-between">
              {editingId && (
                <button
                  onClick={deleteEntry}
                  className="text-red-400"
                >
                  ❌ Löschen
                </button>
              )}

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="px-4 py-2 bg-gray-700 rounded"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveEntry}
                  className="px-4 py-2 bg-blue-600 rounded font-semibold"
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
