'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
import type { PrincipalResponse } from '../../lib/types';

export default function PrincipalsPage() {
  const [principal, setPrincipal] = useState<PrincipalResponse | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrincipal() {
      try {
        const res = await apiClient.getPrincipal('20000000-0000-4000-8000-000000000001');
        setPrincipal(res.data);
        setIsMock(res.isMock);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchPrincipal();
  }, []);

  const generateTelegramCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setTelegramCode(`VANIK-LINK-${randomCode}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Business Principal Profile</h1>
            {isMock && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Legal principal identity owning agent representatives and commercial policies.
          </p>
        </div>

        <Link
          href="/agents"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow"
        >
          Manage Agent Passports →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm animate-pulse">
          Loading principal details...
        </div>
      ) : principal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{principal.legal_name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trade Name: <span className="text-slate-200 font-medium">{principal.trade_name}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full uppercase">
                  {principal.verification_status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Principal ID</span>
                  <code className="text-slate-300 font-mono text-[11px] select-all break-all">{principal.id}</code>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Business Type</span>
                  <span className="text-slate-200 font-medium capitalize">{principal.business_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Registered Address</span>
                  <span className="text-slate-300">{principal.address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Active Roles</span>
                  <div className="flex gap-1.5 mt-0.5">
                    {principal.roles.map((r) => (
                      <span
                        key={r}
                        className={`px-2 py-0.5 rounded text-[11px] uppercase font-semibold ${
                          r === 'buyer'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Compliance Banner */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-2 text-xs">
              <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Synthetic Verification & Compliance Audit
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Official PAN, GSTIN, and business registries are simulated via synthetic hash signatures for the AI-02 track. No government data is accessed or stored.
              </p>
            </div>
          </div>

          {/* Telegram Linking Card */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100 text-sm">Telegram Bot Integration</h3>
                <span className="text-sky-400 text-xs font-mono">FR-REG-04</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Link your Telegram account to receive instant deal approval challenges, proactive restock alerts, and conversation commands.
              </p>

              {telegramCode ? (
                <div className="p-3 bg-sky-950/40 border border-sky-500/40 rounded-lg space-y-2">
                  <span className="text-[11px] text-sky-300 block font-medium">Your Single-Use Linking Token:</span>
                  <div className="text-sm font-mono font-bold text-white select-all text-center bg-slate-950 py-1.5 rounded border border-sky-800">
                    {telegramCode}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Send <code className="text-sky-300">/link {telegramCode}</code> to <span className="text-white font-medium">@vanik_bot</span>. Valid for 10 minutes.
                  </p>
                </div>
              ) : (
                <button
                  onClick={generateTelegramCode}
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow"
                >
                  Generate Telegram Link Code
                </button>
              )}
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-300 text-xs">Principal Authority Guardrails</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Agents inherit maximum limits from this principal.</li>
                <li>Tasks narrow authority but can never exceed principal constraints.</li>
                <li>Deals require final cryptographic approval from human owner.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
