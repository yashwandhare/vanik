'use client';

import React, { useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { PassportCard } from '../../components/PassportCard';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { AgentPassportResponse, BusinessRole, ErrorEnvelope } from '../../lib/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentPassportResponse[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);

  // New agent modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('Diwali Staples Buyer');
  const [role, setRole] = useState<BusinessRole>('buyer');
  const [description, setDescription] = useState('Procurement agent for 40-SKU Diwali restock basket');
  const [creating, setCreating] = useState(false);

  const principalId = '20000000-0000-4000-8000-000000000001';

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await apiClient.listAgents(principalId);
        setAgents(res.data.items);
        setIsMock(res.isMock);
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
            request_id: err.requestId || 'client-error',
          });
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load agent roster');
        }
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, [principalId]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await apiClient.createAgent(principalId, {
        name,
        role,
        description,
        capabilities: role === 'buyer' ? ['request_quote', 'evaluate_offers'] : ['receive_rfq', 'generate_offer'],
        allowed_tools: ['marketplace_search', 'benchmark_compare'],
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

  return (
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#c0c2a9] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
              [ AGENT REGISTRY & IDENTITY ]
            </span>
            {isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#edeee1] text-[#202020] border border-[#c0c2a9] font-bold">
                FIXTURE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">
            Agent Passports Roster
          </h1>
          <p className="text-xs sm:text-sm text-[#5a5a4f]">
            Persistent autonomous representatives with verifiable Ed25519 signing keys, tool permissions, and trust profiles.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#202020] hover:bg-[#000000] text-white rounded-[11px] text-xs font-bold border border-[#000000] transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="font-bold text-sm">+</span>
          <span>Spawn New Agent</span>
        </button>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {/* Agents Grid */}
      {loading ? (
        <div className="text-center py-20 text-[#7c7d76] text-sm font-mono animate-pulse">
          Loading cryptographic Agent Passports...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-12 text-center space-y-4">
          <p className="text-[#000000] font-bold text-base">No agent representatives spawned yet.</p>
          <p className="text-xs text-[#5a5a4f] max-w-md mx-auto">
            Spawn your first buyer or seller representative to begin autonomous counterparty discovery.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-[#202020] text-white text-xs font-bold rounded-[11px] border border-[#000000]"
          >
            Spawn Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <PassportCard key={agent.agent_id} passport={agent} isMock={isMock} />
          ))}
        </div>
      )}

      {/* Spawn Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#c0c2a9] pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
                  [ PROVISION PASSPORT ]
                </span>
                <h2 className="text-xl font-extrabold text-[#000000] mt-0.5">Spawn AI Representative</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#7c7d76] hover:text-[#000000] font-mono font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Agent Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Marketplace Role</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border ${
                      role === 'buyer'
                        ? 'bg-[#aafdc0] text-[#003d21] border-[#000000]'
                        : 'bg-[#f8f9eb] text-[#5a5a4f] border-[#c0c2a9]'
                    }`}
                  >
                    Buyer Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border ${
                      role === 'seller'
                        ? 'bg-[#b0f4ff] text-[#041668] border-[#000000]'
                        : 'bg-[#f8f9eb] text-[#5a5a4f] border-[#c0c2a9]'
                    }`}
                  >
                    Seller Agent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Description / Directive</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="p-3.5 bg-[#f8f9eb] rounded-[13px] border border-[#c0c2a9] text-xs text-[#5a5a4f] space-y-1">
                <span className="font-mono font-bold text-[#003d21] text-[11px] uppercase tracking-wider block">
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
                  className="px-4 py-2 bg-[#ffffff] hover:bg-[#edeee1] text-[#202020] rounded-[9px] border border-[#c0c2a9] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 px-4 bg-[#202020] hover:bg-[#000000] disabled:bg-[#7c7d76] text-white rounded-[11px] text-xs font-bold border border-[#000000] transition-all shadow-sm"
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
