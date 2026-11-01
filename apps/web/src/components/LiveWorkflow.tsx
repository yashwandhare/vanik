'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '../lib/api-client';
import type {
  AgentPassportResponse, ApprovalChallengeResponse, DealResponse, NegotiationListResponse,
  ReceiptResponse, TaskResponse,
} from '../lib/types';
import { ErrorAlert } from './ErrorAlert';
import { PassportCard } from './PassportCard';
import { TaskMandateForm } from './TaskMandateForm';

const panel = 'bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[24px] p-5 sm:p-7 space-y-4 shadow-sm';
const button = 'px-4 py-3 bg-[#0F5B57] text-white rounded-[12px] text-sm font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAA82C]';
const views = [
  ['mandate', 'Mandate Form'], ['passport', 'Passport'], ['timeline', 'Parallel Rounds'],
  ['comparison', 'Offer Comparison'], ['approval', 'Approval & Receipt'], ['security', 'Adversarial Audit'],
  ['replay', 'Decision Replay'], ['memory', 'Supplier Memory'], ['notifications', 'Notifications'],
] as const;
type View = typeof views[number][0];

function failure(err: unknown): string {
  if (err instanceof ApiClientError) {
    const detail = err.details?.map((item) => `${item.field || item.code}: ${item.message}`).join('; ');
    return `${err.message} (HTTP ${err.status}, ${err.code})${detail ? ` — ${detail}` : ''}`;
  }
  return err instanceof Error ? err.message : 'API request failed';
}

export function challengeMatches(deal: DealResponse, challenge: ApprovalChallengeResponse, now = Date.now()): boolean {
  return deal.status === 'locked' && deal.id === challenge.deal_id
    && deal.version === challenge.deal_version && deal.terms_hash === challenge.terms_hash
    && Date.parse(deal.expires_at) > now && Date.parse(challenge.expires_at) > now;
}

function JsonEvidence({ value }: { value: unknown }) {
  return <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-[#FAF5E8] border border-[#DDD0B8] rounded-[12px] p-3 max-h-96 overflow-auto">{JSON.stringify(value, null, 2)}</pre>;
}

export function LiveWorkflow({ miniapp = false }: { miniapp?: boolean }) {
  const params = useSearchParams();
  const urlTask = params.get('taskId') || params.get('task_id') || '';
  const urlDeal = params.get('dealId') || params.get('deal_id') || '';
  const urlPrincipal = params.get('principalId') || params.get('id') || '';
  const viewParam = params.get('view');
  // Remount on external navigation so in-flight responses and approval challenges cannot cross contexts.
  return <Workflow key={`${urlTask}/${urlDeal}/${urlPrincipal}/${params.get('agentId') || ''}`} miniapp={miniapp} initialTaskId={urlTask} initialDealId={urlDeal} initialPrincipalId={urlPrincipal} initialAgentId={params.get('agentId') || ''} initialView={viewParam} />;
}

function Workflow({ miniapp, initialTaskId, initialDealId, initialPrincipalId, initialAgentId, initialView }: {
  miniapp: boolean; initialTaskId: string; initialDealId: string; initialPrincipalId: string; initialAgentId: string; initialView: string | null;
}) {
  const [view, setView] = useState<View>(views.some(([id]) => id === initialView) ? initialView as View : initialDealId ? 'approval' : initialTaskId ? 'timeline' : 'mandate');
  const [taskId, setTaskId] = useState(initialTaskId);
  const [dealId, setDealId] = useState(initialDealId);
  const [principalId, setPrincipalId] = useState(initialPrincipalId);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [deals, setDeals] = useState<DealResponse[]>([]);
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [deal, setDeal] = useState<DealResponse | null>(null);
  const [rounds, setRounds] = useState<NegotiationListResponse | null>(null);
  const [passport, setPassport] = useState<AgentPassportResponse | null>(null);
  const [challenge, setChallenge] = useState<ApprovalChallengeResponse | null>(null);
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [evidence, setEvidence] = useState<unknown>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const alive = useRef(true);
  const mutating = useRef(false);
  const userId = useRef('');

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const persist = useCallback((selectedTask: string, selectedDeal: string, selectedView: View) => {
    const url = new URL(window.location.href);
    ['task_id', 'deal_id'].forEach((key) => url.searchParams.delete(key));
    if (selectedTask) url.searchParams.set('taskId', selectedTask); else url.searchParams.delete('taskId');
    if (selectedDeal) url.searchParams.set('dealId', selectedDeal); else url.searchParams.delete('dealId');
    url.searchParams.set('view', selectedView);
    if (principalId) url.searchParams.set('principalId', principalId);
    window.history.replaceState(null, '', url);
  }, [principalId]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      setChallenge(null);
      setTask(null); setDeal(null); setRounds(null); setReceipt(null); setPassport(null);
      try {
        try {
          const session = await apiClient.getSession();
          if (!active) return;
          userId.current = session.data.user.id;
          setAuthenticated(true);
          if (!initialPrincipalId) setPrincipalId(sessionStorage.getItem('vanik_principal_id') || '');
        } catch (err) {
          if (active) setAuthenticated(false);
          throw new Error(`Sign in with your linked VANIK account to use this workflow. Session could not be restored: ${failure(err)}`);
        }
        const [taskList, dealList] = await Promise.all([apiClient.listTasks({ limit: 100 }), apiClient.listDeals()]);
        if (!active) return;
        setTasks(taskList.data.items); setDeals(dealList.data.items);
        const selectedDealId = dealId || dealList.data.items.find((item) => item.task_id === taskId)?.id;
        const selectedDeal = selectedDealId ? (await apiClient.getDeal(selectedDealId)).data : null;
        const selectedTaskId = taskId || selectedDeal?.task_id;
        if (selectedDeal && selectedTaskId !== selectedDeal.task_id) throw new Error('The selected deal does not belong to this task. Open a matching task/deal link.');
        const selectedTask = selectedTaskId ? (await apiClient.getTask(selectedTaskId)).data : null;
        const negotiations = selectedTask ? (await apiClient.taskNegotiations(selectedTask.id)).data : null;
        const settledReceipt = selectedDeal?.status === 'settled' ? (await apiClient.receipt(selectedDeal.id)).data : null;
        if (!active) return;
        setTask(selectedTask); setDeal(selectedDeal); setRounds(negotiations); setReceipt(settledReceipt);
      } catch (err) {
        if (active) setError(`Workflow load failed: ${failure(err)}. No outcome is assumed. Retry or sign in.`);
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [taskId, dealId, initialPrincipalId, revision]);

  useEffect(() => {
    let active = true;
    setEvidence(null); setEvidenceError(null); setPassport(null);
    if (!authenticated || loading) return;
    async function loadEvidence() {
      setEvidenceLoading(true);
      try {
        let value: unknown;
        if (view === 'passport' && (task || initialAgentId)) {
          const result = await apiClient.getAgentPassport(task?.agent_id || initialAgentId);
          if (active) setPassport(result.data);
        } else if (view === 'replay' && task) value = (await apiClient.replay(task.id)).data;
        else if (view === 'security' && task) value = (await apiClient.security(task.id)).data;
        else if (view === 'memory' && (task?.principal_id || principalId)) value = (await apiClient.memory(task?.principal_id || principalId)).data;
        else if (view === 'notifications') value = (await apiClient.notifications()).data;
        if (active && value !== undefined) setEvidence(value);
      } catch (err) { if (active) setEvidenceError(failure(err)); }
      finally { if (active) setEvidenceLoading(false); }
    }
    void loadEvidence();
    return () => { active = false; };
  }, [view, task, principalId, initialAgentId, authenticated, loading, revision]);

  async function mutate(operation: () => Promise<void>) {
    if (mutating.current || loading || !authenticated) return;
    mutating.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      const session = await apiClient.getSession();
      if (session.data.user.id !== userId.current) throw new Error('The signed-in account changed. Reload this workflow before acting.');
      await operation();
    } catch (err) {
      if (alive.current) {
        setChallenge(null);
        setError(`Action failed or outcome could not be confirmed: ${failure(err)}. Reload backend state before retrying.`);
      }
    } finally {
      mutating.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const disabled = busy || loading || !authenticated;
  const shownTaskId = task?.id || taskId;
  const shownDealId = deal?.id || dealId;
  const latestOffers = rounds?.items.flatMap((negotiation) => {
    const latest = negotiation.offers.reduce<typeof negotiation.offers[number] | null>((best, offer) => !best || offer.version > best.version ? offer : best, null);
    return latest?.valid && negotiation.state === 'evaluating' && Date.parse(latest.terms.expires_at) > Date.now() ? [{ negotiation, offer: latest }] : [];
  }) || [];

  return <div className={`vanik-container py-6 sm:py-10 space-y-6 ${miniapp ? 'max-w-3xl' : ''}`}>
    <header className="border-b-[1.5px] border-[#DDD0B8] pb-5 space-y-2">
      {miniapp && <div className="bg-[#F7CE58] border border-[#EAA82C] rounded-full px-4 py-3 text-sm font-mono">Telegram Mini App · linked account session required</div>}
      <p className="font-mono text-xs uppercase tracking-widest text-[#0F5B57]">[ LIVE MULTI-PARTY WORKFLOW ]</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C181A]">{miniapp ? 'Procurement Mini App' : 'Autonomous Negotiation Workspace'}</h1>
      <p className="text-sm text-[#5E4E40]">Create → launch → compare → lock exact terms → human approval → mock settlement. No real payment.</p>
    </header>
    {loading && <p role="status">Loading authorized backend workflow…</p>}
    {error && <ErrorAlert error={error} />}
    {notice && <p role="status" className="bg-[#C5EDB1] text-[#0F5B57] border border-[#0F5B57] p-4 rounded-[14px]">{notice}</p>}
    {!authenticated && !loading && <a className="underline font-bold text-[#0F5B57]" href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/negotiations')}`}>Sign in to VANIK</a>}
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">Saved Task<select aria-label="Saved Task" className="block bg-[#FFFDF9] border border-[#DDD0B8] p-3 rounded-[9px] max-w-full" value={shownTaskId} disabled={disabled} onChange={(e) => {
        setChallenge(null); setReceipt(null); setDeal(null); setTask(null); setRounds(null); setNotice(null);
        setTaskId(e.target.value); setDealId(''); persist(e.target.value, '', 'timeline'); setView('timeline');
      }}><option value="">Select a task</option>{shownTaskId && !tasks.some((item) => item.id === shownTaskId) && <option value={shownTaskId}>{shownTaskId}</option>}{tasks.map((item) => <option value={item.id} key={item.id}>{item.mandate.objective} · {item.status}</option>)}</select></label>
      <label className="text-sm">Saved Deal<select aria-label="Saved Deal" className="block bg-[#FFFDF9] border border-[#DDD0B8] p-3 rounded-[9px] max-w-full" value={shownDealId} disabled={disabled} onChange={(e) => {
        const selected = deals.find((item) => item.id === e.target.value);
        setChallenge(null); setReceipt(null); setDeal(null); setTask(null); setRounds(null); setNotice(null);
        setDealId(e.target.value); setTaskId(selected?.task_id || taskId); persist(selected?.task_id || taskId, e.target.value, 'approval'); setView('approval');
      }}><option value="">Select a deal</option>{shownDealId && !deals.some((item) => item.id === shownDealId) && <option value={shownDealId}>{shownDealId}</option>}{deals.map((item) => <option value={item.id} key={item.id}>{item.id} · {item.status}</option>)}</select></label>
      <button className={button} disabled={busy || loading} onClick={() => { setChallenge(null); setNotice(null); setRevision((n) => n + 1); }}>Reload Backend State</button>
    </div>
    {task && <div className="bg-[#FAF5E8] border border-[#DDD0B8] p-4 rounded-[14px] text-sm space-y-2">
      <p className="break-all">Task ID: {task.id} · v{task.version} · Status: <strong>{task.status}</strong></p>
      <p>{task.mandate.objective}</p>
      {task.status === 'created' && <><p>Mandate created. Negotiations have not been launched.</p><button className={button} disabled={disabled} onClick={() => void mutate(async () => {
        const result = await apiClient.launchTask(task.id);
        if (!alive.current) return;
        setRounds(result.data); setNotice('Launch confirmed by backend. Reloading persisted negotiation state.'); setView('timeline'); persist(task.id, '', 'timeline'); setRevision((n) => n + 1);
      })}>Launch Negotiations</button></>}
    </div>}
    <nav role="tablist" aria-label={miniapp ? 'Mini App Views' : 'Negotiation workspace views'} className="flex flex-wrap gap-2 font-mono text-xs">
      {views.map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className={`px-4 py-3 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] ${view === id ? 'bg-[#1C181A] text-white border-[#1C181A]' : 'bg-[#FFFDF9] text-[#5E4E40] border-[#DDD0B8]'}`} onClick={() => { setView(id); persist(shownTaskId, shownDealId, id); }}>{label}</button>)}
    </nav>
    {view === 'mandate' && authenticated && !loading && <>
      <section className={panel}><label className="block font-bold">Buyer Business Principal ID<input aria-label="Buyer Business Principal ID" className="block w-full p-3 border rounded-xl" value={principalId} disabled={busy} onChange={(event) => setPrincipalId(event.target.value)} placeholder="Authorized principal UUID from Business Profile" /></label><p className="text-sm">No demo identity is assumed. Backend membership checks apply.</p></section>
      {principalId ? <TaskMandateForm key={principalId} principalId={principalId} initialAgentId={initialAgentId} onCreated={(created) => {
        setChallenge(null); setReceipt(null); setDeal(null); setTask(created); setTaskId(created.id); setDealId('');
        setNotice('Mandate created by backend. Launch Negotiations is a separate action.'); setView('timeline'); persist(created.id, '', 'timeline');
      }} /> : <section className={panel}><h2 className="text-xl font-bold">Select a business first</h2><p>Open this workspace with your business principal from Principals or Agents. No demo identity is assumed.</p><a href="/principals" className="underline text-[#0F5B57]">Business Principals</a></section>}
      {task && <section className={panel}><h2 className="text-xl font-bold">Saved Mandate</h2><JsonEvidence value={task.mandate} /></section>}
    </>}
    {view === 'timeline' && <section className="space-y-4"><h2 className="text-xl font-bold">Parallel A2A Negotiation Rounds</h2>
      {!rounds?.items.length && <p>No negotiations loaded. Select and launch a created task, or reload backend state.</p>}
      {rounds?.items.map((negotiation) => <article key={negotiation.id} className={panel}>
        <h3 className="font-bold break-all">Seller principal: {negotiation.seller_principal_id}</h3>
        <p className="text-sm break-all">Seller agent: {negotiation.seller_agent_id} · {negotiation.state} · Round {negotiation.round_no}</p>
        {negotiation.offers.map((offer) => <details key={offer.id}><summary className="cursor-pointer text-sm">Offer v{offer.version} · INR {offer.terms.total} · {offer.valid ? 'Backend valid' : 'Backend invalid'}</summary><JsonEvidence value={{ terms: offer.terms, terms_hash: offer.terms_hash, validation: offer.validation, ranking: offer.ranking }} /></details>)}
        <details><summary className="cursor-pointer font-bold">Backend protocol messages & signatures ({negotiation.messages.length})</summary>
          <p className="text-xs">Signatures below come from backend envelopes. This browser does not independently verify them.</p>
          {negotiation.messages.map((message) => <div key={message.message_id} className="py-3 text-xs space-y-2"><p>{message.message_type} · key version {message.key_version} · {message.created_at}</p><p className="font-mono break-all">Signature: {message.signature}</p><p className="font-mono break-all">Payload SHA256: {message.payload_hash}</p></div>)}
        </details>
      </article>)}
    </section>}
    {view === 'comparison' && <section className={panel}><h2 className="text-2xl font-bold">Backend Valid Offer Matrix</h2><p className="text-sm">Latest offer per seller only. Recommendation and scores come from the backend; no local winner is invented.</p>
      {!latestOffers.length && <p>No current backend-valid offers loaded.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[#DDD0B8]"><th className="p-3">Seller / Offer</th><th className="p-3">Total</th><th className="p-3">Payment / Delivery</th><th className="p-3">Backend Ranking</th><th className="p-3">Decision</th></tr></thead><tbody>
        {latestOffers.map(({ negotiation, offer }) => <tr key={offer.id} className="border-b border-[#DDD0B8]"><td className="p-3 break-all">{offer.seller_principal_id}<br />Offer v{offer.version}</td><td className="p-3 font-mono">INR {offer.terms.total}</td><td className="p-3">{offer.terms.payment_terms.type} · {offer.terms.payment_terms.upfront_pct}% upfront · {offer.terms.payment_terms.credit_days} credit days<br />{offer.terms.delivery_at}</td><td className="p-3"><JsonEvidence value={offer.ranking} />{rounds?.recommendation_offer_id === offer.id && <strong className="text-[#0F5B57]">RECOMMENDED</strong>}</td><td className="p-3"><button className={button} disabled={disabled || !!deal || task?.status !== 'running' || negotiation.state !== 'evaluating' || Date.parse(offer.terms.expires_at) <= Date.now()} onClick={() => void mutate(async () => {
          const result = await apiClient.acceptOffer(negotiation.id, { offer_id: offer.id });
          if (!alive.current) return;
          setChallenge(null); setReceipt(null); setDeal(result.data); setDealId(result.data.id); setView('approval'); persist(result.data.task_id, result.data.id, 'approval');
        })}>Lock Offer v{offer.version}</button><details><summary>Line items</summary><JsonEvidence value={offer.terms.lines} /></details></td></tr>)}
      </tbody></table></div>
    </section>}
    {view === 'approval' && <section className={panel}><h2 className="text-2xl font-bold">Deal Lock & Approval Challenge</h2>
      {!deal && <p>No authorized deal loaded. Lock a current valid offer or select a saved deal.</p>}
      {deal && <><p className="font-bold text-[#D9381E]">{deal.label}</p><p className="break-all text-sm">Deal ID: {deal.id} · Version: {deal.version} · Status: <strong>{deal.status}</strong></p><p className="font-mono break-all text-sm">Terms SHA256: {deal.terms_hash}</p><p>Contracted total: INR {deal.amount} · Expires: {deal.expires_at}</p><h3 className="font-bold">Exact locked terms</h3><JsonEvidence value={deal.snapshot} />
        <div className="flex flex-wrap gap-3">
          {deal.status === 'locked' && <button className={button} disabled={disabled} onClick={() => void mutate(async () => {
            setChallenge(null);
            const current = (await apiClient.getDeal(deal.id)).data;
            if (!alive.current) return;
            setDeal(current);
            const result = await apiClient.challenge(current.id);
            if (!alive.current) return;
            if (!challengeMatches(current, result.data)) throw new Error('Challenge does not match current locked terms or has expired. Reload and request a new challenge.');
            setChallenge(result.data);
          })}>Request Approval Challenge</button>}
          {challenge && deal.status === 'locked' && <button className={button} disabled={disabled || !challengeMatches(deal, challenge)} onClick={() => void mutate(async () => {
            const authorized = challenge;
            setChallenge(null);
            const current = (await apiClient.getDeal(deal.id)).data;
            if (!alive.current) return;
            setDeal(current);
            if (!challengeMatches(current, authorized)) throw new Error('Deal terms/version changed or challenge expired. Review the new terms and request a new challenge.');
            const result = await apiClient.approve(current.id, { challenge_id: authorized.challenge_id, deal_version: authorized.deal_version, terms_hash: authorized.terms_hash, nonce: authorized.nonce });
            if (alive.current) { setDeal(result.data); setNotice('Approval confirmed by backend. Settlement has not been performed.'); }
          })}>Approve Exact Deal Terms</button>}
          {['locked', 'approved'].includes(deal.status) && <button className={`${button} bg-[#D9381E]`} disabled={disabled} onClick={() => void mutate(async () => {
            setChallenge(null);
            const result = await apiClient.reject(deal.id);
            if (alive.current) { setDeal(result.data); setReceipt(null); setNotice('Rejection confirmed by backend.'); setRevision((n) => n + 1); }
          })}>Reject Deal</button>}
          {deal.status === 'approved' && <button className={button} disabled={disabled} onClick={() => void mutate(async () => {
            // Retain the same key across network failures and page reloads for this account/deal.
            const storageKey = `vanik_settlement:${userId.current}:${deal.id}`;
            let key = sessionStorage.getItem(storageKey);
            if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
            const result = await apiClient.settle(deal.id, key);
            if (alive.current) { setReceipt(result.data); setChallenge(null); setNotice('Mock settlement confirmed by backend.'); setRevision((n) => n + 1); }
          })}>Settle Mock Payment</button>}
        </div>
        {challenge && <p className="text-sm break-all">Single-use challenge: {challenge.challenge_id} · version {challenge.deal_version} · expires {challenge.expires_at}. Review the exact locked terms before approval.</p>}
      </>}
      {receipt && <div className="bg-[#C5EDB1] border border-[#0F5B57] p-4 rounded-[14px] space-y-2"><h3 className="font-bold">{receipt.label}</h3><p className="font-mono break-all">Reference: {receipt.reference}</p><p>Paid now: INR {receipt.amount} · Contracted total: INR {receipt.contracted_total} · Balance due: INR {receipt.balance_due}</p><p className="text-sm">Status: {receipt.status} · {receipt.created_at}</p></div>}
    </section>}
    {view === 'passport' && <section className={panel}><h2 className="text-xl font-bold">Task Agent Passport</h2>{passport ? <PassportCard passport={passport} /> : <p>Select a task to load its backend agent passport.</p>}</section>}
    {['security', 'replay', 'memory', 'notifications'].includes(view) && <section className={panel}><h2 className="text-xl font-bold">{views.find(([id]) => id === view)?.[1]}</h2><p className="text-sm">Authorized backend records and evidence only. Empty lists mean no records returned.</p>{evidence ? <JsonEvidence value={evidence} /> : !evidenceLoading && <p>No records loaded. Select a task/business where required.</p>}</section>}
    {evidenceLoading && <p role="status">Loading backend evidence…</p>}{evidenceError && <ErrorAlert error={`Evidence load failed: ${evidenceError}`} />}
  </div>;
}
