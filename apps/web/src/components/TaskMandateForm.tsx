'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { AgentPassportResponse, ProductResponse, TaskLineItemRequest, TaskPriority, TaskResponse, TaskTool } from '../lib/types';
import { ErrorAlert } from './ErrorAlert';

const inputClass = 'w-full px-3 py-2.5 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]';
const factors: TaskPriority[] = ['price', 'reliability', 'delivery', 'credit'];

// Integer hundredths avoid accepting rounded sums that the Decimal backend rejects.
export function validPriorities(weights: Record<TaskPriority, string>): boolean {
  return factors.every((factor) => /^(?:0(?:\.\d{1,2})?|1(?:\.0{1,2})?)$/.test(weights[factor]))
    && factors.reduce((sum, factor) => sum + Math.round(Number(weights[factor]) * 100), 0) === 100;
}

export function TaskMandateForm({ principalId, initialAgentId, onCreated }: {
  principalId: string;
  initialAgentId?: string;
  onCreated: (task: TaskResponse) => void;
}) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [agents, setAgents] = useState<AgentPassportResponse[]>([]);
  const [agentId, setAgentId] = useState(initialAgentId || '');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lines, setLines] = useState<TaskLineItemRequest[]>([]);
  const [objective, setObjective] = useState('Kirana restock procurement');
  const [budget, setBudget] = useState('85000.00');
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 10 * 86400000).toISOString());
  const [expiry, setExpiry] = useState(() => new Date(Date.now() + 86400000).toISOString());
  const [rounds, setRounds] = useState(3);
  const [creditDays, setCreditDays] = useState(0);
  const [upfront, setUpfront] = useState('100');
  const [weights, setWeights] = useState<Record<TaskPriority, string>>({ price: '0.45', reliability: '0.25', delivery: '0.20', credit: '0.10' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catalogue, roster] = await Promise.all([
          apiClient.listCatalogueProducts({ limit: 100 }), apiClient.listAgents(principalId),
        ]);
        if (!active) return;
        const buyers = roster.data.items.filter((agent) => agent.role === 'buyer' && agent.agent_status === 'active');
        setProducts(catalogue.data.items.filter((product) => product.active));
        setSku(catalogue.data.items.find((product) => product.active)?.sku || '');
        setAgents(buyers);
        setAgentId(buyers.some((agent) => agent.agent_id === initialAgentId) ? initialAgentId! : buyers[0]?.agent_id || '');
        if (!buyers.length) setError('This business has no active buyer agent. Create or resume one in Agents.');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load catalogue and authorized buyer agents.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [principalId, initialAgentId]);

  function addLine() {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    if (!/^\d+(?:\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) {
      setError('Quantity must be positive with at most three decimal places.');
      return;
    }
    if (lines.some((line) => line.sku === sku)) {
      setError('Each SKU can appear only once in the basket.');
      return;
    }
    setError(null);
    setLines([...lines, { sku, quantity, unit: product.unit }]);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    const agent = agents.find((item) => item.agent_id === agentId);
    if (!agent || !agent.capabilities.includes('request_quote') || !agent.capabilities.includes('evaluate_offers') || !agent.allowed_tools.includes('marketplace_search')) {
      setError('Select an active buyer agent permitted to request quotes, evaluate offers and search the marketplace.');
      return;
    }
    if (!lines.length) { setError('Add at least one catalogue SKU.'); return; }
    if (!validPriorities(weights)) { setError('Four priority weights must be between 0 and 1 and sum exactly to 1.00 (at most two decimal places).'); return; }
    const due = Date.parse(deadline);
    const expires = Date.parse(expiry);
    if (!Number.isFinite(due) || !Number.isFinite(expires) || due <= Date.now() || expires <= Date.now() || expires > due) {
      setError('Enter future ISO dates with a time zone. Mandate expiry must not exceed the delivery deadline.');
      return;
    }
    const tools: TaskTool[] = ['marketplace_search'];
    if (agent.allowed_tools.includes('benchmark_compare')) tools.push('benchmark_compare');
    setSubmitting(true);
    try {
      // Restore the authenticated CSRF context immediately before mutation.
      await apiClient.getSession();
      const result = await apiClient.createTask({
        principal_id: principalId, agent_id: agent.agent_id, objective: objective.trim(),
        category: 'procurement', lines, budget, currency: 'INR',
        delivery_deadline: new Date(due).toISOString(), expires_at: new Date(expires).toISOString(),
        priorities: weights, allowed_tools: tools, permitted_actions: ['request_quote', 'evaluate_offers'],
        max_rounds: rounds, min_credit_days: creditDays, max_upfront_pct: upfront, requires_human_approval: true,
      });
      onCreated(result.data);
    } catch (err) {
      setError(`Task creation failed: ${err instanceof Error ? err.message : 'API request failed'}. No launch was confirmed.`);
    } finally { setSubmitting(false); }
  }

  return <form onSubmit={create} className="bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[24px] p-6 sm:p-8 space-y-5 shadow-sm">
    <h2 className="text-2xl font-extrabold">Configure Procurement Task Mandate</h2>
    <p className="text-sm text-[#5E4E40]">Business: <span className="font-mono break-all">{principalId}</span>. Creation saves a mandate. Launch is a separate authenticated action.</p>
    {loading && <p role="status">Loading live catalogue and buyer agents…</p>}
    {error && <ErrorAlert error={error} />}
    <label className="block">Buyer agent<select aria-label="Buyer agent" className={inputClass} value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={loading || submitting}>
      <option value="">Select an active buyer agent</option>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.name}</option>)}
    </select></label>
    <div className="grid sm:grid-cols-2 gap-4">
      <label>Procurement Objective<input className={inputClass} required maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} /></label>
      <label>Maximum Reservation Budget (INR)<input className={inputClass} type="number" required min="0.01" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
      <label>Delivery Deadline (ISO with timezone)<input className={inputClass} required value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      <label>Mandate Expiry (ISO with timezone)<input className={inputClass} required value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
      <label>Max Negotiation Rounds<select className={inputClass} value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Minimum Credit Days<input className={inputClass} type="number" min="0" max="90" value={creditDays} onChange={(e) => setCreditDays(Number(e.target.value))} /></label>
      <label>Maximum Upfront Percent<input className={inputClass} type="number" min="0" max="100" step="0.01" value={upfront} onChange={(e) => setUpfront(e.target.value)} /></label>
    </div>
    <fieldset className="space-y-3"><legend className="font-bold">Procurement Commodity Basket ({lines.length} SKUs)</legend>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-40">Select Catalogue Product<select className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} disabled={loading}>
          <option value="">Select product</option>{products.map((product) => <option value={product.sku} key={product.id}>{product.sku} — {product.name} ({product.unit})</option>)}
        </select></label>
        <label>Quantity<input className={inputClass} type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <button className="px-4 py-3 bg-[#1C181A] text-white rounded-[9px] disabled:opacity-50" type="button" onClick={addLine} disabled={loading || !sku || submitting}>Add SKU</button>
      </div>
      <button type="button" className="px-4 py-2 border rounded-lg" disabled={loading || submitting || !products.length} onClick={() => setLines(products.map((product) => ({ sku: product.sku, quantity: '1.000', unit: product.unit })))}>Load Full Catalogue Basket ({products.length} SKUs)</button>
      {!lines.length && <p className="text-sm">No items selected. Add SKUs from the live catalogue.</p>}
      {lines.map((line) => <div key={line.sku} className="flex justify-between gap-2 text-sm border-b border-[#DDD0B8] py-2"><span>{line.sku}: {line.quantity} {line.unit}</span><button type="button" disabled={submitting} onClick={() => setLines(lines.filter((item) => item.sku !== line.sku))} aria-label={`Remove ${line.sku}`}>Remove</button></div>)}
    </fieldset>
    <fieldset><legend className="font-bold">Deterministic Ranking Priority Weights</legend>
      <p className="text-sm text-[#5E4E40] mb-3">Four weights must sum exactly to 1.00.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{factors.map((factor) => <label key={factor} className="capitalize">{factor} Weight<input className={inputClass} type="number" min="0" max="1" step="0.01" required value={weights[factor]} onChange={(e) => setWeights({ ...weights, [factor]: e.target.value })} /></label>)}</div>
    </fieldset>
    <button type="submit" disabled={loading || submitting || !agentId} className="px-6 py-3 bg-[#0F5B57] text-white rounded-[12px] font-bold disabled:opacity-50">{submitting ? 'Creating mandate…' : 'Create Task Mandate'}</button>
  </form>;
}
