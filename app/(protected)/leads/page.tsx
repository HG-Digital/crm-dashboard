"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ================= TYPES ================= */

type Lead = {
  id: string;
  company: string;
  status: string;
  last_contact: string | null;
  follow_up_date: string | null;
  created_at: string;
  owner_id: string;
};

/* ================= UI HELPERS ================= */

const statusColors: Record<string, string> = {
  Neu: "bg-gray-300 text-black",
  Kontaktiert: "bg-yellow-400 text-black",
  Interesse: "bg-blue-400 text-black",
  "Angebot gesendet": "bg-purple-500 text-white",
  Gewonnen: "bg-green-500 text-white",
  Abgelehnt: "bg-red-500 text-white",
};

const getRowHighlight = (lastContact?: string | null) => {
  if (!lastContact) return "";

  const diffDays =
    (Date.now() - new Date(lastContact).getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays > 30) return "bg-red-100";
  if (diffDays > 14) return "bg-yellow-100";

  return "";
};

/* ================= PAGE ================= */

export default function LeadsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [company, setCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [loading, setLoading] = useState(true);

  /* 🔐 USER LADEN */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        alert("Nicht eingeloggt");
        return;
      }
      setUser(data.user);
    });
  }, []);

  /* 📥 LEADS LADEN */
  const loadLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load leads error:", error);
      alert(error.message);
      return;
    }

    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  /* ➕ LEAD ANLEGEN */
  const addLead = async () => {
    if (!company.trim() || !user) return;

    const { error } = await supabase.from("leads").insert({
      company,
      status: "Neu",
      owner_id: user.id,
    });

    if (error) {
      console.error("Insert lead error:", error);
      alert(error.message);
      return;
    }

    setCompany("");
    loadLeads();
  };

  /* 🔄 STATUS UPDATE */
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("leads")
      .update({
        status,
        last_contact: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Update status error:", error);
      alert(error.message);
      return;
    }

    loadLeads();
  };

  /* 📅 FOLLOW-UP UPDATE */
  const updateFollowUp = async (id: string, date: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ follow_up_date: date || null })
      .eq("id", id);

    if (error) {
      console.error("Update follow-up error:", error);
      alert(error.message);
      return;
    }

    loadLeads();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Lädt…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-10 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">📞 Lead-Übersicht</h1>

      {/* ➕ EINGABE */}
      <div className="mb-6 flex gap-3">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Firmenname"
          className="px-4 py-2 rounded bg-white text-black w-72"
        />
        <button
          onClick={addLead}
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          Hinzufügen
        </button>
      </div>

      {/* 🔍 FILTER */}
      <div className="mb-4 flex gap-3 items-center">
        <span>Status filtern:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black"
        >
          <option>Alle</option>
          {Object.keys(statusColors).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 📋 TABELLE */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-4 text-left text-white">Firma</th>
              <th className="p-4 text-left text-white">Status</th>
              <th className="p-4 text-left text-white">Follow-up</th>
            </tr>
          </thead>

          <tbody>
            {leads
              .filter(
                (l) =>
                  statusFilter === "Alle" || l.status === statusFilter
              )
              .map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className={`cursor-pointer ${
                    getRowHighlight(lead.last_contact) ||
                    (i % 2 === 0 ? "bg-gray-100" : "bg-gray-200")
                  } hover:bg-blue-100`}
                >
                  <td className="p-4 text-black font-medium">
                    {lead.company}
                  </td>

                  <td
                    className="p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value)
                      }
                      className={`px-3 py-1 rounded font-semibold ${statusColors[lead.status]}`}
                    >
                      {Object.keys(statusColors).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  <td
                    className="p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="date"
                      value={lead.follow_up_date || ""}
                      onChange={(e) =>
                        updateFollowUp(lead.id, e.target.value)
                      }
                      className="px-2 py-1 rounded border bg-white text-black"
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
