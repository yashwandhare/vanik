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
        setHealth({ status: 'offline', service: 'VANIK API', version: '0.4.0' });
        setIsHealthMock(true);
      } finally {
        setLoading(false);
      }
    }
    checkBackend();
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="vanik-container text-center space-y-6">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#d8cbbe] bg-[#ffffff] text-[#292524] text-xs font-mono font-semibold uppercase tracking-wider shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#85290c] inline-block" />
          <span>AI-02 Track • Autonomous B2B Marketplace</span>
        </div>

        {/* Monumental Headline */}
        <div className="space-y-2 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#1c1917] tracking-tight leading-[1.02] uppercase">
            Autonomous Commerce.
          </h1>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#85290c] tracking-tight leading-[1.02] uppercase flex items-center justify-center gap-3">
            <span>Verifiable Trust.</span>
            <span className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 border-[#1c1917] bg-[#fde68a] inline-block shadow-2xs" />
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#665e55] font-normal leading-relaxed max-w-2xl mx-auto">
          Verified businesses create persistent AI agents that discover wholesale suppliers, negotiate structured pricing and credit terms in parallel, and structure transactions for human cryptographic approval.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            href="/register"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#1c1917] hover:bg-[#85290c] text-white font-bold text-xs sm:text-sm border border-[#1c1917] transition-all shadow-sm"
          >
            Start Registration →
          </Link>
          <Link
            href="/agents"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#ffffff] hover:bg-[#f3ebe0] text-[#292524] border border-[#d8cbbe] hover:border-[#1c1917] font-bold text-xs sm:text-sm transition-all shadow-2xs"
          >
            Agent Passports
          </Link>
          <Link
            href="/negotiations"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-[#b45309] font-bold text-xs sm:text-sm transition-all shadow-2xs"
          >
            Negotiation Deck
          </Link>
        </div>

        {/* Status Pill */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-[#665e55]">
          <span>FastAPI Backend:</span>
          {loading ? (
            <span className="text-[#877d73] animate-pulse">Checking /health...</span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-[#ffffff] px-2.5 py-0.5 rounded-full border border-[#d8cbbe] shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'ok' ? 'bg-[#166534]' : 'bg-[#dc341e]'
                }`}
              />
              <span className="font-bold text-[#1c1917]">
                {health?.status || 'unknown'} {isHealthMock && '(fixture)'}
              </span>
              {readiness && (
                <span className="text-[#877d73]">
                  | DB: <code className="text-[#1c1917]">{readiness.database}</code>
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      {/* Architectural Terracotta Feature Panel */}
      <section className="vanik-container">
        <div className="bg-[#7c2d12] text-white rounded-[28px] sm:rounded-[36px] border-[1.5px] border-[#1c1917] p-6 sm:p-10 lg:p-12 space-y-8 shadow-sm">
          {/* Header */}
          <div className="max-w-2xl space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#fde68a] font-bold">
              [ DIWALI RESTOCK P0 DEMO SCENARIO ]
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-[#fef3c7] tracking-tight leading-tight">
              One Buyer Agent. Three Independent Sellers. 40 SKU Basket.
            </h3>
            <p className="text-xs sm:text-sm text-[#f3ebe0] leading-relaxed">
              Real-world wholesale kirana trade modeled with deterministic constraints, parallel round evaluations, and Ed25519 cryptographic signing.
            </p>
          </div>

          {/* 3 Contained Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#4a1909] border border-[#fde68a]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#fde68a]">
                  01 • Buyer Principal
                </div>
                <h4 className="text-lg font-bold text-white">Shree Ganesh Kirana</h4>
                <p className="text-xs text-[#f3ebe0] leading-relaxed">
                  Kirana owner creates a task mandate with a 40-SKU festival restock basket, budget constraints, and delivery deadline.
                </p>
              </div>
              <div className="pt-3 border-t border-[#fde68a]/10 text-xs font-mono text-[#fde68a]">
                Agent: Diwali Buyer (Ed25519)
              </div>
            </div>

            <div className="bg-[#4a1909] border border-[#fde68a]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#fde68a]">
                  02 • Parallel Sellers
                </div>
                <h4 className="text-lg font-bold text-white">3 Distinct Principals</h4>
                <p className="text-xs text-[#f3ebe0] leading-relaxed">
                  Concurrently negotiates against Margin, Inventory Clearance, and Risk sellers. Evaluates and mitigates 4th Adversarial Seller injection.
                </p>
              </div>
              <div className="pt-3 border-t border-[#fde68a]/10 text-xs font-mono text-[#fde68a]">
                State machine round rounds
              </div>
            </div>

            <div className="bg-[#4a1909] border border-[#fde68a]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#fde68a]">
                  03 • Cryptographic Lock
                </div>
                <h4 className="text-lg font-bold text-white">Human Approval Seal</h4>
                <p className="text-xs text-[#f3ebe0] leading-relaxed">
                  Line-item comparison matrix with explainable ranking. Exact final deal hash cryptographically signed by human owner before simulated UPI.
                </p>
              </div>
              <div className="pt-3 border-t border-[#fde68a]/10 text-xs font-mono text-[#fde68a]">
                Single-use challenge binding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tonal Indic Surface Cards for 3 Surfaces */}
      <section className="vanik-container space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#877d73] font-bold">
            [ UNIFIED BACKEND • THREE SURFACES ]
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1c1917] tracking-tight mt-1">
            First-Class Marketplace Interfaces
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Festive Marigold Gold */}
          <Link
            href="/catalogue"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#fde68a] border-[1.5px] border-[#1c1917] hover:-translate-y-1 transition-all group shadow-2xs"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#78350f]">
                SURFACE 01
              </span>
              <h4 className="text-xl font-extrabold text-[#1c1917] group-hover:underline">
                Marketplace Web App →
              </h4>
              <p className="text-xs text-[#292524] leading-relaxed">
                Visual command center for seller discovery, the 40-SKU Diwali catalogue, live parallel negotiation monitoring, and Decision Replay.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#78350f]">
              Browse 40 SKUs →
            </div>
          </Link>

          {/* Card 2: Warm Terracotta Wash */}
          <Link
            href="/agents"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#fed7aa] border-[1.5px] border-[#1c1917] hover:-translate-y-1 transition-all group shadow-2xs"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#85290c]">
                SURFACE 02
              </span>
              <h4 className="text-xl font-extrabold text-[#1c1917] group-hover:underline">
                Agent Passports →
              </h4>
              <p className="text-xs text-[#292524] leading-relaxed">
                Persistent AI credentials, verified Ed25519 public key fingerprints (`sha256:...`), tool permissions, and trust confidence metrics.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#85290c]">
              Inspect Passports →
            </div>
          </Link>

          {/* Card 3: Kesar Silk Wash */}
          <Link
            href="/miniapp"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#fef3c7] border-[1.5px] border-[#1c1917] hover:-translate-y-1 transition-all group shadow-2xs"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92400e]">
                SURFACE 03
              </span>
              <h4 className="text-xl font-extrabold text-[#1c1917] group-hover:underline">
                Telegram Mini App →
              </h4>
              <p className="text-xs text-[#292524] leading-relaxed">
                Focused mobile workflows on Telegram for task mandate reviews, side-by-side counterparty offer evaluations, and one-tap deal approval.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#92400e]">
              Open Mini App →
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
