"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationPanel from "@/app/components/NotificationPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ================= TYPES ================= */

type Lead = {
  id: string;
  status: string;
  created_at: string;
  last_contact?: string | null;
};

type CalendarEntry = {
  id: string;
  person: string;
  title: string;
  start_time: string;
  end_time: string;
};

/* ================= CONSTS ================= */

const PEOPLE = [
  "Richard Gumpinger",
  "Simon Höld",
  "Bennet Wylezol",
];

/* ================= PAGE ================= */

export default function DashboardPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [todayEntries, setTodayEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ LOKALES DATUM (kein UTC-Bug)
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const now = new Date();

  useEffect(() => {
    const loadDashboard = async () => {
      /* 🔐 AUTH CHECK */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      /* 📊 LEADS */
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, status, created_at, last_contact");

      /* 📅 HEUTIGE TERMINE */
      const { data: calendarData } = await supabase
        .from("calendar_entries")
        .select("id, person, title, start_time, end_time")
        .eq("date", today)
        .order("start_time", { ascending: true });

      setLeads(leadsData ?? []);
      setTodayEntries(calendarData ?? []);
      setLoading(false);
    };

    loadDashboard();
  }, [router, today]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">
        Lade Dashboard…
      </div>
    );
  }

  /* ================= KPIs ================= */

  const leadsThisMonth = leads.filter((l) => {
    const d = new Date(l.created_at);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const gewonnen = leads.filter((l) => l.status === "Gewonnen");
  const verloren = leads.filter((l) => l.status === "Abgelehnt");

  const followUps = leads.filter((l) => {
    if (!l.last_contact) return true;
    const diffDays =
      (now.getTime() - new Date(l.last_contact).getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays > 14;
  });

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gray-900 p-10 text-white">
      <NotificationPanel />

      <h1 className="text-3xl font-bold mb-8">📊 Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card title="Leads diesen Monat" value={leadsThisMonth.length} />
        <Card title="Gewonnen" value={gewonnen.length} color="green" />
        <Card title="Abgelehnt" value={verloren.length} color="red" />
        <Card title="Follow-ups nötig" value={followUps.length} color="yellow" />
      </div>

      {/* HEUTIGE TERMINE */}
      <h2 className="text-2xl font-bold mb-4">📅 Termine heute</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PEOPLE.map((person) => {
          const entries = todayEntries.filter((e) => e.person === person);

          return (
            <div key={person} className="bg-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-3">{person}</h3>

              {entries.length === 0 ? (
                <div className="text-gray-400 text-sm">
                  Keine Termine heute
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((e) => (
                    <div key={e.id} className="bg-blue-600 rounded p-2">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm opacity-80">
                        {e.start_time} – {e.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LINKS */}
      <div className="flex gap-4">
        <Link
          href="/leads"
          className="px-6 py-3 bg-blue-600 rounded font-semibold"
        >
          📞 Zu den Leads
        </Link>

        {/* ✅ FIX: Router statt Link */}
        <button
  onClick={() => router.push("/kalender")}
  className="px-6 py-3 bg-gray-700 rounded font-semibold"
>
  📅 Zum Kalender
</button>
      </div>
    </div>
  );
}

/* ================= CARD ================= */

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color?: "green" | "red" | "yellow";
}) {
  const colors: Record<string, string> = {
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500 text-black",
  };

  return (
    <div className={`rounded-xl p-6 ${colors[color ?? ""] || "bg-gray-800"}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
