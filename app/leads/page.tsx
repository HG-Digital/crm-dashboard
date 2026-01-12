"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Lead = {
  id: string;
  company: string;
  status: string;
  last_contact?: string;
  follow_up_date?: string;
};

const statusColors: Record<string, string> = {
  Neu: "bg-gray-300 text-black",
  Kontaktiert: "bg-yellow-400 text-black",
  Interesse: "bg-blue-400 text-black",
  "Angebot gesendet": "bg-purple-500 text-white",
  Gewonnen: "bg-green-500 text-white",
  Abgelehnt: "bg-red-500 text-white",
};

const getRowHighlight = (lastContact?: string) => {
  if (!lastContact) return "";

  const diffDays =
    (Date.now() - new Date(lastContact).getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays > 30) return "bg-red-100";
  if (diffDays > 14) return "bg-yellow-100";

  return "";
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [company, setCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");

  const loadLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setLeads(data);
  };

  const addLead = async () => {
    if (!company.trim()) return;

    await supabase.from("leads").insert([
      { company, status: "Neu" },
    ]);

    setCompany("");
    loadLeads();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("leads")
      .update({
        status,
        last_contact: new Date().toISOString(),
      })
      .eq("id", id);

    loadLeads();
  };

  const updateFollowUp = async (id: string, date: string) => {
    await supabase
      .from("leads")
      .update({ follow_up_date: date })
      .eq("id", id);

    loadLeads();
  };

  useEffect(() => {
    loadLeads();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-10 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">📞 Lead-Übersicht</h1>

      {/* Eingabe */}
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

      {/* Filter */}
      <div className="mb-4 flex gap-3 items-center">
        <span>Status filtern:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black"
        >
          <option>Alle</option>
          <option>Neu</option>
          <option>Kontaktiert</option>
          <option>Interesse</option>
          <option>Angebot gesendet</option>
          <option>Gewonnen</option>
          <option>Abgelehnt</option>
        </select>
      </div>

      {/* Tabelle */}
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
                  statusFilter === "Alle" ||
                  l.status === statusFilter
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
                      className={`px-3 py-1 rounded font-semibold ${
                        statusColors[lead.status]
                      }`}
                    >
                      <option>Neu</option>
                      <option>Kontaktiert</option>
                      <option>Interesse</option>
                      <option>Angebot gesendet</option>
                      <option>Gewonnen</option>
                      <option>Abgelehnt</option>
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
