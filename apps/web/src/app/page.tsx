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
    <div className="space-y-12 sm:space-y-16 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="vanik-container text-center space-y-6">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#c0c2a9] bg-[#ffffff] text-[#202020] text-xs font-mono font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#003d21] inline-block" />
          <span>AI-02 Track • Autonomous B2B Marketplace</span>
        </div>

        {/* Monumental Headline */}
        <div className="space-y-2 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#000000] tracking-tight leading-[1.02] uppercase">
            Autonomous Commerce.
          </h1>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#003d21] tracking-tight leading-[1.02] uppercase flex items-center justify-center gap-3">
            <span>Verifiable Trust.</span>
            <span className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 border-[#000000] bg-[#aafdc0] inline-block" />
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#5a5a4f] font-normal leading-relaxed max-w-2xl mx-auto">
          Verified businesses create persistent AI agents that discover wholesale suppliers, negotiate structured pricing and credit terms in parallel, and structure transactions for human cryptographic approval.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            href="/register"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#202020] hover:bg-[#000000] text-white font-bold text-xs sm:text-sm border border-[#000000] transition-all shadow-sm"
          >
            Start Registration →
          </Link>
          <Link
            href="/agents"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#ffffff] hover:bg-[#edeee1] text-[#202020] border border-[#c0c2a9] hover:border-[#000000] font-bold text-xs sm:text-sm transition-all"
          >
            Agent Passports
          </Link>
          <Link
            href="/negotiations"
            className="px-5 sm:px-6 py-3 rounded-[12px] bg-[#b0f4ff] hover:brightness-95 text-[#041668] border border-[#000000] font-bold text-xs sm:text-sm transition-all"
          >
            Negotiation Deck
          </Link>
        </div>

        {/* Status Pill */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-[#5a5a4f]">
          <span>FastAPI Backend:</span>
          {loading ? (
            <span className="text-[#7c7d76] animate-pulse">Checking /health...</span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-[#ffffff] px-2.5 py-0.5 rounded-full border border-[#c0c2a9]">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy' ? 'bg-[#003d21]' : 'bg-[#dc341e]'
                }`}
              />
              <span className="font-bold text-[#000000]">
                {health?.status || 'unknown'} {isHealthMock && '(fixture)'}
              </span>
              {readiness && (
                <span className="text-[#7c7d76]">
                  | DB: <code className="text-[#000000]">{readiness.database}</code>
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      {/* Architectural Forest Feature Panel */}
      <section className="vanik-container">
        <div className="bg-[#003d21] text-white rounded-[28px] sm:rounded-[36px] border-[1.5px] border-[#000000] p-6 sm:p-10 lg:p-12 space-y-8 shadow-sm">
          {/* Header */}
          <div className="max-w-2xl space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#aafdc0] font-bold">
              [ DIWALI RESTOCK P0 DEMO SCENARIO ]
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-[#aafdc0] tracking-tight leading-tight">
              One Buyer Agent. Three Independent Sellers. 40 SKU Basket.
            </h3>
            <p className="text-xs sm:text-sm text-[#c0c2a9] leading-relaxed">
              Real-world wholesale kirana trade modeled with deterministic constraints, parallel round evaluations, and Ed25519 cryptographic signing.
            </p>
          </div>

          {/* 3 Contained Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#002715] border border-[#aafdc0]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                  01 • Buyer Principal
                </div>
                <h4 className="text-lg font-bold text-white">Shree Ganesh Kirana</h4>
                <p className="text-xs text-[#c0c2a9] leading-relaxed">
                  Kirana owner creates a task mandate with a 40-SKU festival restock basket, budget constraints, and delivery deadline.
                </p>
              </div>
              <div className="pt-3 border-t border-[#aafdc0]/10 text-xs font-mono text-[#aafdc0]">
                Agent: Diwali Buyer (Ed25519)
              </div>
            </div>

            <div className="bg-[#002715] border border-[#aafdc0]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                  02 • Parallel Sellers
                </div>
                <h4 className="text-lg font-bold text-white">3 Distinct Principals</h4>
                <p className="text-xs text-[#c0c2a9] leading-relaxed">
                  Concurrently negotiates against Margin, Inventory Clearance, and Risk sellers. Evaluates and mitigates 4th Adversarial Seller injection.
                </p>
              </div>
              <div className="pt-3 border-t border-[#aafdc0]/10 text-xs font-mono text-[#aafdc0]">
                State machine round rounds
              </div>
            </div>

            <div className="bg-[#002715] border border-[#aafdc0]/20 rounded-[20px] p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                  03 • Cryptographic Lock
                </div>
                <h4 className="text-lg font-bold text-white">Human Approval Seal</h4>
                <p className="text-xs text-[#c0c2a9] leading-relaxed">
                  Line-item comparison matrix with explainable ranking. Exact final deal hash cryptographically signed by human owner before simulated UPI.
                </p>
              </div>
              <div className="pt-3 border-t border-[#aafdc0]/10 text-xs font-mono text-[#aafdc0]">
                Single-use challenge binding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tonal Pastel Surface Cards for 3 Surfaces */}
      <section className="vanik-container space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
            [ UNIFIED BACKEND • THREE SURFACES ]
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#000000] tracking-tight mt-1">
            First-Class Marketplace Interfaces
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Mint Sprout */}
          <Link
            href="/catalogue"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#aafdc0] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#003d21]">
                SURFACE 01
              </span>
              <h4 className="text-xl font-extrabold text-[#000000] group-hover:underline">
                Marketplace Web App →
              </h4>
              <p className="text-xs text-[#202020] leading-relaxed">
                Visual command center for seller discovery, the 40-SKU Diwali catalogue, live parallel negotiation monitoring, and Decision Replay.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#003d21]">
              Browse 40 SKUs →
            </div>
          </Link>

          {/* Card 2: Lilac Wash */}
          <Link
            href="/agents"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#d3beff] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2d0078]">
                SURFACE 02
              </span>
              <h4 className="text-xl font-extrabold text-[#000000] group-hover:underline">
                Agent Passports →
              </h4>
              <p className="text-xs text-[#202020] leading-relaxed">
                Persistent AI credentials, verified Ed25519 public key fingerprints (`sha256:...`), tool permissions, and trust confidence metrics.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#2d0078]">
              Inspect Passports →
            </div>
          </Link>

          {/* Card 3: Sky Wash */}
          <Link
            href="/miniapp"
            className="flex flex-col justify-between p-6 sm:p-7 rounded-[22px] bg-[#b0f4ff] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#041668]">
                SURFACE 03
              </span>
              <h4 className="text-xl font-extrabold text-[#000000] group-hover:underline">
                Telegram Mini App →
              </h4>
              <p className="text-xs text-[#202020] leading-relaxed">
                Focused mobile workflows on Telegram for task mandate reviews, side-by-side counterparty offer evaluations, and one-tap deal approval.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono font-bold text-[#041668]">
              Open Mini App →
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
