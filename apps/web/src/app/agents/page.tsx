'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ALL_DEMO_PASSPORTS, FIXTURE_AGENT_LIST } from '../../lib/fixtures';
import { PassportCard } from '../../components/PassportCard';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { AgentPassportResponse, BusinessRole, ErrorEnvelope } from '../../lib/types';

function AgentsContent() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<AgentPassportResponse[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);

  // New agent modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('Diwali Staples Buyer');
  const [role, setRole] = useState<BusinessRole>('buyer');
  const [strategyProfile, setStrategyProfile] = useState('default');
  const [description, setDescription] = useState('Procurement agent for 40-SKU Diwali restock basket');
  const [creating, setCreating] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const rawRequestedAgentId = searchParams.get('agentId');
  // Normalize legacy ID from earlier Telegram bot iterations
  const requestedAgentId =
    rawRequestedAgentId === '30000000-0000-4000-8000-000000000001'
      ? '7a1bd7b3-308a-5f49-ba8a-0dd1ec451c88'
      : rawRequestedAgentId;

  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  const principalId =
    searchParams.get('principalId') ||
    searchParams.get('id') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('vanik_principal_id') : null);

  const SEEDED_AGENT_IDS = [
    '7a1bd7b3-308a-5f49-ba8a-0dd1ec451c88', // Shree Ganesh Kirana Buyer Agent
    '1b100eef-7880-503f-b858-804b0c34696a', // Mangal Wholesale (Margin)
    '01b1b22a-c8d4-5f27-ad88-0da5fd25d4bb', // Utsav Distributors (Clearance)
    '6733f472-dffd-55ea-b7bb-413d560b8ecd', // Suraksha Trade Co (Payment Risk)
    '6322d654-4f96-5663-829b-9861df1b3aca', // Red Team Adversarial Seller
  ];

  // Restore session and load agent roster
  useEffect(() => {
    async function loadAgents() {
      setLoading(true);
      setError(null);

      // Restore session/CSRF state if active
      try {
        await apiClient.getSession();
      } catch {
        // Not logged in or expired session
      }

      // Priority 1: Direct Agent Passport Lookup (via Telegram link or deep-link)
      if (requestedAgentId) {
        try {
          const res = await apiClient.getAgentPassport(requestedAgentId);
          setAgents([res.data]);
          setIsMock(res.isMock);
          setLoading(false);
          return;
        } catch {
          // Fallback to demo fixture passport if specific agent is matched
          const fixture = ALL_DEMO_PASSPORTS[requestedAgentId] || ALL_DEMO_PASSPORTS['agent-kisan-01'];
          if (fixture) {
            setAgents([fixture]);
            setIsMock(true);
            setLoading(false);
            return;
          }
        }
      }

      // Priority 2: Authenticated Principal agent roster
      if (principalId) {
        try {
          const res = await apiClient.listAgents(principalId);
          if (res.data.items && res.data.items.length > 0) {
            setAgents(res.data.items);
            setIsMock(res.isMock);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through
        }
      }

      // If neither specific agent nor authenticated principal is selected
      if (!principalId && !requestedAgentId) {
        setAgents([]);
        setLoading(false);
        setError('Select or register a business principal before managing agents.');
        return;
      }

      // Priority 3: Fallback to fixtures if backend has no records
      setAgents(FIXTURE_AGENT_LIST.items);
      setIsMock(true);
      setLoading(false);
    }
    loadAgents();
  }, [principalId, requestedAgentId]);

  // Trap Escape key and manage focus for modal
  useEffect(() => {
    if (!showCreateModal) return;

    const previousFocus = document.activeElement;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
      }
      if (e.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
        );
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (e.shiftKey && first && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && last && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus initial field
    const timeout = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [showCreateModal]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId) {
      setError('Select a business principal before creating an agent.');
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await apiClient.createAgent(principalId, {
        name,
        role,
        description,
        capabilities: role === 'buyer' ? ['request_quote', 'evaluate_offers'] : ['receive_rfq', 'generate_offer'],
        allowed_tools: ['marketplace_search', 'benchmark_compare'],
        strategy_profile: role === 'buyer' ? 'default' : strategyProfile,
      });

      setAgents([res.data, ...agents]);
      setShowCreateModal(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Agent creation failed');
      }
    } finally {
      setCreating(false);
    }
  };

  const handlePauseAgent = async (agentId: string) => {
    setError(null);
    try {
      const res = await apiClient.pauseAgent(agentId);
      setAgents((prev) => prev.map((a) => (a.agent_id === agentId ? res.data : a)));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to pause agent');
      }
    }
  };

  const handleResumeAgent = async (agentId: string) => {
    setError(null);
    try {
      const res = await apiClient.resumeAgent(agentId);
      setAgents((prev) => prev.map((a) => (a.agent_id === agentId ? res.data : a)));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resume agent');
      }
    }
  };

  const handleRevokeAgent = async (agentId: string) => {
    setError(null);
    try {
      const res = await apiClient.revokeAgent(agentId);
      setAgents((prev) => prev.map((a) => (a.agent_id === agentId ? res.data : a)));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to revoke agent');
      }
    }
  };

  const handleRotateKey = async (agentId: string) => {
    setError(null);
    try {
      const res = await apiClient.rotateAgentKey(agentId);
      setAgents((prev) => prev.map((a) => (a.agent_id === agentId ? res.data : a)));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to rotate signing key');
      }
    }
  };

  return (
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#DDD0B8] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7D6F61] font-bold">
              [ AGENT REGISTRY & IDENTITY ]
            </span>
            {isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5EBD7] text-[#262022] border border-[#DDD0B8] font-bold">
                FIXTURE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C181A] tracking-tight">
            Agent Passports Roster
          </h1>
          <p className="text-xs sm:text-sm text-[#5E4E40]">
            Persistent autonomous representatives with verifiable Ed25519 signing keys, tool permissions, and trust profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#262022] hover:bg-[#1C181A] text-white rounded-[11px] text-xs font-bold border border-[#1C181A] transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
        >
          <span className="font-bold text-sm">+</span>
          <span>Spawn New Agent</span>
        </button>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {/* Telegram Deep Link Synced Notice */}
      {requestedAgentId && (
        <div className="bg-[#E7F6EC] border-[1.5px] border-[#0F5B57] p-3 rounded-[16px] flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F5B57] animate-pulse" />
            <span className="font-bold text-[#0F5B57]">Direct Agent Passport Sync:</span>
            <span className="text-[#1C181A] font-bold">`{requestedAgentId}`</span>
          </div>
          <a
            href="/agents"
            className="px-3 py-1 rounded-[9px] bg-[#0F5B57] hover:bg-[#1C181A] text-white transition-all font-bold text-[11px]"
          >
            Show All Network Passports →
          </a>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && agents.length > 0 && (
        <div className="flex items-center gap-2 bg-[#FFFDF9] border border-[#DDD0B8] p-1.5 rounded-[14px] w-fit font-mono text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-[9px] font-bold transition-all ${
              roleFilter === 'all'
                ? 'bg-[#1C181A] text-white shadow-2xs'
                : 'text-[#5E4E40] hover:text-[#1C181A]'
            }`}
          >
            All Passports ({agents.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('buyer')}
            className={`px-3 py-1.5 rounded-[9px] font-bold transition-all ${
              roleFilter === 'buyer'
                ? 'bg-[#1C181A] text-white shadow-2xs'
                : 'text-[#5E4E40] hover:text-[#1C181A]'
            }`}
          >
            Buyer Agents ({agents.filter((a) => a.role === 'buyer').length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('seller')}
            className={`px-3 py-1.5 rounded-[9px] font-bold transition-all ${
              roleFilter === 'seller'
                ? 'bg-[#1C181A] text-white shadow-2xs'
                : 'text-[#5E4E40] hover:text-[#1C181A]'
            }`}
          >
            Wholesale Sellers ({agents.filter((a) => a.role === 'seller').length})
          </button>
        </div>
      )}

      {/* Agents Grid */}
      {loading ? (
        <div className="text-center py-20 text-[#7D6F61] text-sm font-mono animate-pulse">
          Loading cryptographic Agent Passports...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[24px] p-12 text-center space-y-4">
          <p className="text-[#1C181A] font-bold text-base">No agent representatives spawned yet.</p>
          <p className="text-xs text-[#5E4E40] max-w-md mx-auto">
            Spawn your first buyer or seller representative to begin autonomous counterparty discovery.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-[#262022] text-white text-xs font-bold rounded-[11px] border border-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
          >
            Spawn Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents
            .filter((agent) => (roleFilter === 'all' ? true : agent.role === roleFilter))
            .map((agent) => (
              <PassportCard
                key={agent.agent_id}
                passport={agent}
                isMock={isMock}
                onPause={handlePauseAgent}
                onResume={handleResumeAgent}
                onRevoke={handleRevokeAgent}
                onRotateKey={handleRotateKey}
              />
            ))}
        </div>
      )}

      {/* Spawn Agent Modal with accessible dialog semantics */}
      {showCreateModal && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-spawn-title"
          className="fixed inset-0 z-50 bg-[#1C181A]/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[24px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DDD0B8] pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#7D6F61] font-bold">
                  [ PROVISION PASSPORT ]
                </span>
                <h2 id="modal-spawn-title" className="text-xl font-extrabold text-[#1C181A] mt-0.5">
                  Spawn AI Representative
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setShowCreateModal(false)}
                className="text-[#7D6F61] hover:text-[#1C181A] font-mono font-bold text-sm px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label
                  htmlFor="agent-name-input"
                  className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                >
                  Agent Name
                </label>
                <input
                  ref={nameInputRef}
                  id="agent-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-xs font-semibold text-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] focus-visible:border-transparent"
                />
              </div>

              <div>
                <span
                  id="agent-role-label"
                  className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                >
                  Marketplace Role
                </span>
                <div role="radiogroup" aria-labelledby="agent-role-label" className="flex gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'buyer'}
                    onClick={() => {
                      setRole('buyer');
                      setStrategyProfile('default');
                    }}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] ${
                      role === 'buyer'
                        ? 'bg-[#C5EDB1] text-[#0F5B57] border-[#1C181A]'
                        : 'bg-[#FAF5E8] text-[#5E4E40] border-[#DDD0B8]'
                    }`}
                  >
                    Buyer Agent
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'seller'}
                    onClick={() => setRole('seller')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] ${
                      role === 'seller'
                        ? 'bg-[#E2D5F2] text-[#D9381E] border-[#1C181A]'
                        : 'bg-[#FAF5E8] text-[#5E4E40] border-[#DDD0B8]'
                    }`}
                  >
                    Seller Agent
                  </button>
                </div>
              </div>

              {role === 'seller' && (
                <div>
                  <label
                    htmlFor="agent-strategy-select"
                    className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                  >
                    Strategy Profile
                  </label>
                  <select
                    id="agent-strategy-select"
                    value={strategyProfile}
                    onChange={(e) => setStrategyProfile(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-xs font-semibold text-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] focus-visible:border-transparent"
                  >
                    <option value="default">Default Balanced Seller</option>
                    <option value="margin">Margin Optimizer (Seller A)</option>
                    <option value="clearance">Inventory Clearance (Seller B)</option>
                    <option value="payment_risk">Payment-Risk Optimizer (Seller C)</option>
                    <option value="adversarial">Adversarial Red-Team Injection (Seller D)</option>
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="agent-description-input"
                  className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                >
                  Description / Directive
                </label>
                <textarea
                  id="agent-description-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-xs font-semibold text-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] focus-visible:border-transparent"
                />
              </div>

              <div className="p-3.5 bg-[#FAF5E8] rounded-[13px] border border-[#DDD0B8] text-xs text-[#5E4E40] space-y-1">
                <span className="font-mono font-bold text-[#0F5B57] text-[11px] uppercase tracking-wider block">
                  Cryptographic Protocol:
                </span>
                <p className="text-[11px] leading-relaxed">
                  An Ed25519 signing keypair will be created server-side. The public key fingerprint is permanently published to this Agent Passport.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#F5EBD7] text-[#262022] rounded-[9px] border border-[#DDD0B8] text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 px-4 bg-[#262022] hover:bg-[#1C181A] disabled:bg-[#7D6F61] text-white rounded-[11px] text-xs font-bold border border-[#1C181A] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
                >
                  {creating ? 'Spawning Agent...' : 'Spawn & Sign Passport'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="vanik-container py-16 text-center text-[#7D6F61] text-sm font-mono animate-pulse">
          Loading agent passports...
        </div>
      }
    >
      <AgentsContent />
    </Suspense>
  );
}
