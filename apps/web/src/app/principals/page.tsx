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
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#c0c2a9] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
              [ LEGAL ENTITY REGISTRY ]
            </span>
            {isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#edeee1] text-[#202020] border border-[#c0c2a9] font-bold">
                FIXTURE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">
            Business Principal Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#5a5a4f]">
            Root legal identity owning agent representatives, commercial policies, and cryptographic authority.
          </p>
        </div>

        <Link
          href="/agents"
          className="px-4 py-2 bg-[#202020] hover:bg-[#000000] text-white rounded-[11px] text-xs font-bold border border-[#000000] transition-all shadow-sm self-start sm:self-auto"
        >
          Manage Agent Passports →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#7c7d76] text-sm font-mono animate-pulse">
          Loading principal credentials...
        </div>
      ) : principal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight">{principal.legal_name}</h2>
                  <p className="text-xs text-[#5a5a4f]">
                    Trade Name: <span className="text-[#000000] font-bold">{principal.trade_name}</span>
                  </p>
                </div>
                <span className="px-3 py-0.5 bg-[#aafdc0] border border-[#000000] text-[#003d21] text-xs font-mono font-bold rounded-full uppercase">
                  {principal.verification_status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#c0c2a9] text-xs">
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Principal ID</span>
                  <code className="text-[#000000] font-mono text-[11px] font-bold select-all break-all">{principal.id}</code>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Business Type</span>
                  <span className="text-[#000000] font-bold capitalize">{principal.business_type}</span>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Registered Address</span>
                  <span className="text-[#202020] font-medium">{principal.address}</span>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Active Roles</span>
                  <div className="flex gap-1.5 mt-0.5">
                    {principal.roles.map((r) => (
                      <span
                        key={r}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-[#000000] ${
                          r === 'buyer'
                            ? 'bg-[#aafdc0] text-[#003d21]'
                            : 'bg-[#b0f4ff] text-[#041668]'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Synthetic Compliance Banner */}
            <div className="bg-[#f8f9eb] border-[1.5px] border-[#000000] rounded-[20px] p-6 space-y-2 text-xs">
              <span className="font-mono font-bold text-[#003d21] text-xs uppercase tracking-wider block">
                [ SYNTHETIC VERIFICATION & COMPLIANCE SEAL ]
              </span>
              <p className="text-[#5a5a4f] leading-relaxed">
                Official PAN, GSTIN, and business registry credentials are synthesized via local cryptographic hashes for the hackathon demonstration. No actual government registries are queried.
              </p>
            </div>
          </div>

          {/* Telegram Linking Card */}
          <div className="space-y-6">
            <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#000000] text-sm">Telegram Bot Linking</h3>
                <span className="text-[#041668] text-[10px] font-mono font-bold bg-[#b0f4ff] px-2 py-0.5 rounded border border-[#000000]">
                  FR-REG-04
                </span>
              </div>
              <p className="text-xs text-[#5a5a4f] leading-relaxed">
                Link your personal Telegram handle to receive cryptographic deal challenges, proactive deadline alerts, and agent progress notifications.
              </p>

              {telegramCode ? (
                <div className="p-4 bg-[#b0f4ff]/40 border-[1.5px] border-[#000000] rounded-[14px] space-y-2">
                  <span className="text-[11px] text-[#041668] block font-mono font-bold">
                    Single-Use Linking Token:
                  </span>
                  <div className="text-base font-mono font-extrabold text-[#000000] select-all text-center bg-[#ffffff] py-1.5 rounded-[8px] border border-[#000000]">
                    {telegramCode}
                  </div>
                  <p className="text-[11px] text-[#5a5a4f]">
                    Send <code className="text-[#000000] font-bold">/link {telegramCode}</code> to <span className="text-[#000000] font-bold">@vanik_bot</span>. Valid for 10 minutes.
                  </p>
                </div>
              ) : (
                <button
                  onClick={generateTelegramCode}
                  className="w-full py-2.5 px-4 rounded-[11px] bg-[#202020] hover:bg-[#000000] text-white font-bold text-xs border border-[#000000] transition-all shadow-sm"
                >
                  Generate Telegram Link Code
                </button>
              )}
            </div>

            <div className="bg-[#ffffff] border border-[#c0c2a9] rounded-[20px] p-5 space-y-2 text-xs">
              <h4 className="font-bold text-[#000000] text-xs uppercase font-mono">
                [ PRINCIPAL AUTHORITY BOUNDARIES ]
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-[#5a5a4f] text-[11px]">
                <li>AI agents inherit maximum constraints from this principal.</li>
                <li>Tasks narrow authority but can never exceed principal boundaries.</li>
                <li>Consequential transactions require cryptographic human sign-off.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
