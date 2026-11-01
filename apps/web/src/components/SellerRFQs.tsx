'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { NegotiationResponse } from '../lib/types';
import { ErrorAlert } from './ErrorAlert';

export function SellerRFQs({ principalId }: { principalId: string | null }) {
  const [items, setItems] = useState<NegotiationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]); setError(null);
    if (!principalId) return;
    async function load() {
      setLoading(true);
      try {
        await apiClient.getSession();
        const result = await apiClient.sellerRFQs(principalId!);
        if (active) setItems(result.data.items);
      } catch (err) {
        if (active) setError(`Authorized RFQ read failed: ${err instanceof Error ? err.message : 'API request failed'}. Sign in as a member of this seller business, then retry. No sample RFQs are shown.`);
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [principalId, revision]);

  return <section className="space-y-5">
    <div className="bg-[#F7CE58] border border-[#EAA82C] rounded-[18px] p-4 text-sm space-y-2">
      <h2 className="font-bold text-[#0F5B57]">BUYER BUDGET PRIVACY</h2>
      <p>Buyer reservation budgets are confidential and absent from RFQ views. Quotes are produced by the backend deterministic seller strategy during buyer launch. This API has no manual quote submission route.</p>
    </div>
    <button disabled={loading || !principalId} className="px-4 py-3 bg-[#0F5B57] text-white rounded-[10px] disabled:opacity-50" onClick={() => setRevision((n) => n + 1)}>Reload Authorized RFQs</button>
    {loading && <p role="status">Loading authorized seller RFQs…</p>}
    {error && <ErrorAlert error={error} />}
    {!principalId && <p>Select your seller principal first.</p>}
    {!loading && !error && principalId && !items.length && <p>No RFQs returned for this authorized seller.</p>}
    {items.map((negotiation) => {
      const rfq = negotiation.messages.find((message) => message.message_type === 'REQUEST_FOR_QUOTE');
      return <article key={negotiation.id} className="bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[22px] p-5 space-y-4">
        <h3 className="font-bold break-all">RFQ / Negotiation: {negotiation.id}</h3>
        <p className="text-sm break-all">Task: {negotiation.task_id} · {negotiation.state} · Round {negotiation.round_no}</p>
        {rfq ? <>
          <p className="text-sm break-all">Buyer principal: {rfq.sender_principal_id} · Buyer agent: {rfq.sender_agent_id}</p>
          <p className="font-mono text-sm">[CONFIDENTIAL • MASKED] Buyer budget</p>
          <pre className="bg-[#FAF5E8] border border-[#DDD0B8] rounded-[12px] p-3 text-xs whitespace-pre-wrap break-all">{JSON.stringify({ lines: rfq.payload.lines, delivery_deadline: rfq.payload.delivery_deadline, requested_credit_days: rfq.payload.requested_credit_days, currency: rfq.payload.currency }, null, 2)}</pre>
          <details><summary className="cursor-pointer font-bold">Backend RFQ signature</summary><p className="text-xs break-all font-mono py-2">Key version {rfq.key_version} · {rfq.signature}</p></details>
        </> : <p>No RFQ envelope returned by backend.</p>}
        {negotiation.offers.map((offer) => <details key={offer.id}><summary className="cursor-pointer font-bold text-sm">Backend Offer v{offer.version} · INR {offer.terms.total} · {offer.valid ? 'valid' : 'invalid'}</summary><pre className="bg-[#FAF5E8] border border-[#DDD0B8] rounded-[12px] p-3 text-xs whitespace-pre-wrap break-all">{JSON.stringify({ terms: offer.terms, terms_hash: offer.terms_hash, validation: offer.validation }, null, 2)}</pre></details>)}
        <details><summary className="cursor-pointer font-bold">Backend offer signatures</summary>{negotiation.messages.filter((message) => ['OFFER', 'COUNTER_OFFER', 'FINAL_OFFER'].includes(message.message_type)).map((message) => <p key={message.message_id} className="text-xs break-all font-mono py-2">{message.message_type} · key version {message.key_version} · {message.signature}</p>)}</details>
      </article>;
    })}
  </section>;
}
