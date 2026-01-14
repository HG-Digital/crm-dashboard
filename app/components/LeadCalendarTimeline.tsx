"use client";

import { useEffect, useState } from "react";
import { supabase } from '@/lib/client'

type Entry = {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  participants: {
    person: string;
  }[];
};

export default function LeadCalendarTimeline({
  leadId,
}: {
  leadId: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("calendar_entries")
        .select(
          `
          id,
          date,
          title,
          start_time,
          end_time,
          calendar_entry_participants (
            person
          )
        `
        )
        .eq("lead_id", leadId)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });

      if (!error) {
        setEntries(
          (data ?? []).map((e: any) => ({
            ...e,
            participants: e.calendar_entry_participants ?? [],
          }))
        );
      }
    };

    load();
  }, [leadId]);

  if (entries.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 text-gray-400 text-sm">
        Keine Termine mit diesem Lead
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="font-bold mb-3 text-white">
        📅 Termine mit diesem Lead
      </h3>

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {entries.map((e) => (
          <div
            key={e.id}
            className="bg-gray-800 rounded-lg p-3 text-sm text-white"
          >
            <div className="font-semibold">{e.title}</div>

            <div className="text-xs opacity-80">
              {new Date(e.date).toLocaleDateString("de-DE")} ·{" "}
              {e.start_time} – {e.end_time}
            </div>

            <div className="text-xs mt-1 opacity-70">
              👥 {e.participants.map((p) => p.person).join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
