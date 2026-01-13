"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Finance = {
  id: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  date: string;
};

export default function FinanzenPage() {
  const [items, setItems] = useState<Finance[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  // 🔹 Laden
  const loadItems = async () => {
    const { data, error } = await supabase
      .from("finances")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      alert("Fehler beim Laden: " + error.message);
      return;
    }

    setItems(data || []);
  };

  // 🔹 Hinzufügen (JETZT MIT FEHLERHANDLING)
  const addItem = async () => {
    if (!title.trim() || !amount) {
      alert("Bitte alle Felder ausfüllen");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("finances").insert([
      {
        title: title.trim(),
        amount: Number(amount),
        type,
        date,
      },
    ]);

    setLoading(false);

    if (error) {
      alert("Speichern fehlgeschlagen: " + error.message);
      return;
    }

    // Reset
    setTitle("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);

    loadItems();
  };

  useEffect(() => {
    loadItems();
  }, []);

  // 🔹 Auswertung
  const income = items
    .filter((i) => i.type === "income")
    .reduce((a, b) => a + b.amount, 0);

  const expense = items
    .filter((i) => i.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  const balance = income - expense;

  return (
    <div className="min-h-screen bg-gray-900 p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">💰 Finanzen</h1>

      {/* Eingabe */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          placeholder="Beschreibung"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black"
        />

        <input
          placeholder="Betrag €"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black w-32"
        />

        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as "income" | "expense")
          }
          className="px-3 py-2 rounded bg-white text-black"
        >
          <option value="income">Einnahme</option>
          <option value="expense">Ausgabe</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black"
        />

        <button
          onClick={addItem}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Hinzufügen"}
        </button>
      </div>

      {/* Übersicht */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Stat title="Einnahmen" value={income} color="green" />
        <Stat title="Ausgaben" value={expense} color="red" />
        <Stat title="Saldo" value={balance} color="blue" />
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded text-black overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Datum</th>
              <th className="p-3 text-left">Beschreibung</th>
              <th className="p-3 text-right">Betrag €</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3">{i.date}</td>
                <td className="p-3">{i.title}</td>
                <td
                  className={`p-3 text-right font-semibold ${
                    i.type === "income"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {i.type === "income" ? "+" : "-"}
                  {i.amount.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Noch keine Einträge
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "green" | "red" | "blue";
}) {
  const colors = {
    green: "bg-green-600",
    red: "bg-red-600",
    blue: "bg-blue-600",
  };

  return (
    <div className={`p-6 rounded-xl ${colors[color]}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-2xl font-bold">
        {value.toFixed(2)} €
      </div>
    </div>
  );
}
