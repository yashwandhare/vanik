'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../lib/api-client';
import type { HealthResponse, ReadinessResponse } from '../lib/types';

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [isHealthMock, setIsHealthMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkBackend() {
      try {
        const [hRes, rRes] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getReadiness().catch(() => ({ data: { status: 'unreachable', database: 'disconnected' }, isMock: true })),
        ]);
        setHealth(hRes.data);
        setIsHealthMock(hRes.isMock);
        setReadiness(rRes.data);
      } catch {
        setHealth({ status: 'offline' });
        setIsHealthMock(true);
      } finally {
        setLoading(false);
      }
    }
    checkBackend();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-950/30 to-slate-900 border border-slate-800 p-8 sm:p-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <span>AI-02 Hackathon Track</span>
            <span>•</span>
            <span>Autonomous Commerce</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Autonomous Commerce.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              Verifiable Trust.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            VANIK is an agentic B2B marketplace where verified businesses create persistent AI agents to discover counterparties, negotiate commercial terms across parallel rounds, and prepare deals for human approval.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md hover:shadow-indigo-500/20"
            >
              Start Simulated Registration
            </Link>
            <Link
              href="/agents"
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all"
            >
              Inspect Agent Passports
            </Link>
            <Link
              href="/negotiations"
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-900/60 font-medium text-sm transition-all"
            >
              Negotiation Workspace
            </Link>
          </div>
        </div>

        {/* Backend Live Status Badge */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-4 text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-300">FastAPI Backend Status:</span>
            {loading ? (
              <span className="text-slate-500 animate-pulse">Checking /health...</span>
            ) : (
              <span className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="font-mono text-slate-200">
                  {health?.status || 'unknown'} {isHealthMock && '(fixture fallback)'}
                </span>
                {readiness && (
                  <span className="text-slate-500">
                    | DB: <code className="text-slate-400">{readiness.database}</code>
                  </span>
                )}
              </span>
            )}
          </div>
          <span className="font-mono text-slate-500 text-[11px]">Next.js 16.4.3 • React 19 • Tailwind 4</span>
        </div>
      </div>

      {/* Demo Scenario Architecture */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>Diwali Restock Demo Architecture</span>
          <span className="text-xs font-normal text-slate-500 font-mono">P0 Target</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-400">1. Buyer Principal</div>
            <h3 className="text-base font-semibold text-white">Shree Ganesh Kirana</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kirana owner creates a Diwali procurement task mandate with a 40-SKU basket, budget constraints, and delivery deadline.
            </p>
            <div className="pt-2 text-xs text-indigo-300 font-mono">
              Agent: Diwali Buyer (Ed25519 Signed)
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">2. Parallel Sellers</div>
            <h3 className="text-base font-semibold text-white">3 Distinct Principals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Negotiates in parallel with Margin Optimizer, Inventory Clearance, and Payment-Risk Optimizer. Detects 4th Adversarial Seller injection.
            </p>
            <div className="pt-2 text-xs text-emerald-300 font-mono">
              Deterministic state machine rounds
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs uppercase font-bold tracking-wider text-sky-400">3. Human Control</div>
            <h3 className="text-base font-semibold text-white">Verifiable Lock & Settle</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Side-by-side offer comparison and recommendation explanation. Exact deal version signed by human before mock UPI settlement.
            </p>
            <div className="pt-2 text-xs text-sky-300 font-mono">
              Single-use cryptographic challenge
            </div>
          </div>
        </div>
      </div>

      {/* Product Surfaces Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Three First-Class Surfaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/catalogue"
            className="block p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="text-indigo-400 font-bold text-sm mb-1 group-hover:text-indigo-300">
              Marketplace Web App →
            </div>
            <p className="text-xs text-slate-400">
              Visual command center for seller discovery, the 40-SKU Diwali catalogue, live negotiation monitoring, and Decision Replay.
            </p>
          </Link>

          <Link
            href="/agents"
            className="block p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="text-emerald-400 font-bold text-sm mb-1 group-hover:text-emerald-300">
              Agent Passports →
            </div>
            <p className="text-xs text-slate-400">
              Inspect persistent agent identities, capabilities, permitted tools, trust confidence ratings, and Ed25519 public key fingerprints.
            </p>
          </Link>

          <Link
            href="/miniapp"
            className="block p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="text-sky-400 font-bold text-sm mb-1 group-hover:text-sky-300">
              Telegram Mini App →
            </div>
            <p className="text-xs text-slate-400">
              Focused mobile-first workflows for reviewing task mandates, comparing supplier offers, and approving locked deals on Telegram.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
