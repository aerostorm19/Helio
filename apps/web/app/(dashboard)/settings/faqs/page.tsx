"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { api } from "@/lib/api";
import type { FAQ } from "@/lib/supabase/types";

export default function FAQsPage() {
  const { data: business } = useBusiness();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    api.listFaqs(business.id).then((data) => setFaqs(data ?? []));
  }, [business?.id]);

  async function add() {
    if (!business || faqs.length >= 10) return;
    const created = await api.addFaq(business.id, { question: "", answer: "", sort_order: faqs.length });
    setFaqs([...faqs, created]);
  }

  async function update(faq: FAQ, patch: Partial<FAQ>) {
    setFaqs(faqs.map((f) => f.id === faq.id ? { ...f, ...patch } : f));
  }

  async function save(faq: FAQ) {
    if (!business) return;
    setSaving(true);
    try {
      await api.updateFaq(business.id, faq.id, { question: faq.question, answer: faq.answer });
    } finally { setSaving(false); }
  }

  async function remove(faq: FAQ) {
    if (!business) return;
    await api.deleteFaq(business.id, faq.id);
    setFaqs(faqs.filter((f) => f.id !== faq.id));
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium">FAQs</h1>
          <p className="text-helio-mute text-sm">Up to 10 FAQs. Semantic search auto-enabled.</p>
        </div>
        <button className="btn-primary" disabled={faqs.length >= 10} onClick={add}>+ Add FAQ</button>
      </div>

      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f.id} className="panel p-4">
            <input value={f.question} onChange={(e) => update(f, { question: e.target.value })} placeholder="Question"
              className="w-full bg-transparent border-b border-helio-edge pb-2 text-sm font-medium focus:outline-none" />
            <textarea value={f.answer} onChange={(e) => update(f, { answer: e.target.value })} placeholder="Answer"
              className="w-full bg-transparent text-sm mt-2 min-h-[60px] focus:outline-none" />
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn-ghost py-1.5 px-3 text-xs" onClick={() => remove(f)}>Delete</button>
              <button className="btn-primary py-1.5 px-3 text-xs" disabled={saving} onClick={() => save(f)}>Save</button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <div className="panel p-6 text-sm text-helio-mute">No FAQs yet.</div>}
      </div>
    </div>
  );
}
