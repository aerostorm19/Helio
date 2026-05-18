"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";

type Item = { question: string; answer: string };

export default function OnboardFaqs() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([{ question: "", answer: "" }]);

  function add() { if (items.length < 10) setItems([...items, { question: "", answer: "" }]); }
  function update(i: number, k: keyof Item, v: string) {
    setItems(items.map((x, j) => j === i ? { ...x, [k]: v } : x));
  }
  function next() {
    sessionStorage.setItem("helio.onboard.faqs", JSON.stringify(items));
    router.push("/onboard/number");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Add a few FAQs</h1>
      <p className="text-helio-mute mt-1">Helio will answer these without needing you. 3-10 is ideal.</p>

      <div className="panel p-6 mt-6 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="panel-soft p-3">
            <input placeholder="Question" value={it.question} onChange={(e) => update(i, "question", e.target.value)}
              className="w-full bg-transparent border-b border-helio-edge pb-2 text-sm font-medium focus:outline-none" />
            <textarea placeholder="Answer" value={it.answer} onChange={(e) => update(i, "answer", e.target.value)}
              className="w-full bg-transparent text-sm mt-2 focus:outline-none min-h-[60px]" />
          </div>
        ))}
        <button className="btn-ghost" disabled={items.length >= 10} onClick={add}>+ Add FAQ</button>
      </div>

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" onClick={() => router.push("/onboard/calendar")}>← Back</button>
        <button className="btn-primary" onClick={next}>Continue</button>
      </div>
    </div>
  );
}
