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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Agent Passports Roster</h1>
            {isMock && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Persistent AI agent representatives with verified Ed25519 signing identities and trust profiles.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Spawn New Agent</span>
        </button>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {/* Agents Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm animate-pulse">
          Loading Agent Passports...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-slate-300 font-medium">No agents spawned for this principal yet.</p>
          <p className="text-xs text-slate-500">
            Create your first buyer or seller agent to begin autonomous negotiations.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
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

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Spawn AI Agent Representative</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Marketplace Role</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                      role === 'buyer'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Buyer Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                      role === 'seller'
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Seller Agent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Objective</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Cryptographic Identity:</span>
                <span>An Ed25519 keypair will be generated server-side. Public key fingerprint is automatically published to its Agent Passport.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-medium shadow"
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
