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
    <div className="space-y-16 pb-20">
      {/* Hero Section on Cream Parchment */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 sm:pt-24 text-center space-y-6">
        {/* Pill Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[1.5px] border-[#c0c2a9] bg-transparent text-[#202020] text-xs font-mono font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#003d21] inline-block" />
          <span>AI-02 Hackathon Track • Autonomous B2B Commerce</span>
        </div>

        {/* Monumental Display Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold text-[#000000] tracking-tighter leading-[0.92] max-w-5xl mx-auto uppercase">
          Autonomous Commerce.{' '}
          <span className="inline-flex items-center gap-2 text-[#003d21]">
            Verifiable Trust.
            <span className="inline-block w-6 h-6 sm:w-10 sm:h-10 rounded-full border-2 border-[#000000] bg-[#aafdc0]" />
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-[#202020] font-normal leading-relaxed max-w-2xl mx-auto pt-2">
          An agentic B2B marketplace where verified businesses create persistent AI representatives to discover suppliers, negotiate structured price and credit terms across parallel rounds, and structure transactions for human approval.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-[13px] bg-[#202020] hover:bg-[#000000] text-white font-semibold text-sm transition-all border border-[#000000]"
          >
            Start Simulated Registration →
          </Link>
          <Link
            href="/agents"
            className="px-6 py-3.5 rounded-[9px] bg-transparent hover:bg-[#edeee1] text-[#202020] border-[1.5px] border-[#c0c2a9] hover:border-[#000000] font-semibold text-sm transition-all"
          >
            Inspect Agent Passports
          </Link>
          <Link
            href="/negotiations"
            className="px-6 py-3.5 rounded-[9px] bg-[#b0f4ff] hover:brightness-95 text-[#000000] border-[1.5px] border-[#000000] font-semibold text-sm transition-all"
          >
            Negotiation Deck
          </Link>
        </div>

        {/* Backend Live Status Pill */}
        <div className="pt-6 flex items-center justify-center gap-3 text-xs font-mono text-[#5a5a4f]">
          <span>FastAPI Backend Status:</span>
          {loading ? (
            <span className="text-[#7c7d76] animate-pulse">Checking /health...</span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-[#ffffff] px-3 py-1 rounded-full border border-[#c0c2a9]">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy' ? 'bg-[#003d21]' : 'bg-[#dc341e]'
                }`}
              />
              <span className="font-bold text-[#000000]">
                {health?.status || 'unknown'} {isHealthMock && '(fixture fallback)'}
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

      {/* Full-Bleed Forest Depths Feature Section */}
      <section className="bg-[#003d21] text-white rounded-t-[40px] sm:rounded-t-[48px] pt-16 sm:pt-20 pb-20 px-4 sm:px-6 mt-12">
        <div className="max-w-[1200px] mx-auto space-y-12">
          {/* Section Header */}
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#aafdc0] font-bold">
              [ DIWALI RESTOCK P0 SCENARIO ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#aafdc0] tracking-tight leading-tight">
              One Buyer Agent. Three Independent Sellers. 40 SKU Basket.
            </h2>
            <p className="text-sm sm:text-base text-[#c0c2a9] leading-relaxed">
              Real-world wholesale kirana trade modeled with deterministic constraints, parallel round evaluations, and cryptographic message signing.
            </p>
          </div>

          {/* Three Architectural Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#00311a] border border-[#aafdc0]/30 rounded-[22px] p-6 space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                01 • Buyer Principal
              </div>
              <h3 className="text-xl font-extrabold text-white">Shree Ganesh Kirana</h3>
              <p className="text-xs text-[#c0c2a9] leading-relaxed">
                Kirana owner publishes a task mandate with 40 distinct festival SKUs, total budget ceilings, delivery deadlines, and permitted tools.
              </p>
              <div className="pt-2 text-xs font-mono text-[#aafdc0]">
                Agent: Diwali Buyer (Ed25519 Signed)
              </div>
            </div>

            <div className="bg-[#00311a] border border-[#aafdc0]/30 rounded-[22px] p-6 space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                02 • Parallel Sellers
              </div>
              <h3 className="text-xl font-extrabold text-white">3 Distinct Principals</h3>
              <p className="text-xs text-[#c0c2a9] leading-relaxed">
                Autonomous negotiations concurrently run against Margin Optimizer, Inventory Clearance, and Risk Optimizer sellers. Catches 4th Adversarial Seller injection.
              </p>
              <div className="pt-2 text-xs font-mono text-[#aafdc0]">
                State machine round progression
              </div>
            </div>

            <div className="bg-[#00311a] border border-[#aafdc0]/30 rounded-[22px] p-6 space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#aafdc0]">
                03 • Cryptographic Lock
              </div>
              <h3 className="text-xl font-extrabold text-white">Human Single-Use Seal</h3>
              <p className="text-xs text-[#c0c2a9] leading-relaxed">
                Explainable recommendation and side-by-side term comparison. Exact final deal hash signed by human owner before simulated UPI settlement.
              </p>
              <div className="pt-2 text-xs font-mono text-[#aafdc0]">
                One-time challenge hash binding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tonal Pastel Surface Cards for 3 First-Class Surfaces */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-6 pt-6">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
            [ UNIFIED BACKEND • THREE SURFACES ]
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#000000] tracking-tight">
            First-Class Marketplace Interfaces
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Mint Sprout */}
          <Link
            href="/catalogue"
            className="block p-8 rounded-[24px] bg-[#aafdc0] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#003d21] mb-2">
              SURFACE 01
            </div>
            <h3 className="text-2xl font-extrabold text-[#000000] mb-2 group-hover:underline decoration-2">
              Marketplace Web App →
            </h3>
            <p className="text-xs text-[#202020] leading-relaxed">
              Visual command center for seller discovery, the 40-SKU Diwali catalogue, live parallel negotiation monitoring, and Decision Replay audit trails.
            </p>
          </Link>

          {/* Card 2: Lilac Wash */}
          <Link
            href="/agents"
            className="block p-8 rounded-[24px] bg-[#d3beff] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d0078] mb-2">
              SURFACE 02
            </div>
            <h3 className="text-2xl font-extrabold text-[#000000] mb-2 group-hover:underline decoration-2">
              Agent Passports →
            </h3>
            <p className="text-xs text-[#202020] leading-relaxed">
              Persistent AI representative credentials, verified Ed25519 public key fingerprints (`sha256:...`), tool permissions, and trust confidence metrics.
            </p>
          </Link>

          {/* Card 3: Sky Wash */}
          <Link
            href="/miniapp"
            className="block p-8 rounded-[24px] bg-[#b0f4ff] border-[1.5px] border-[#000000] hover:-translate-y-1 transition-all group"
          >
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#041668] mb-2">
              SURFACE 03
            </div>
            <h3 className="text-2xl font-extrabold text-[#000000] mb-2 group-hover:underline decoration-2">
              Telegram Mini App →
            </h3>
            <p className="text-xs text-[#202020] leading-relaxed">
              Focused mobile-first workflows on Telegram for task mandate reviews, side-by-side counterparty offer evaluations, and one-tap cryptographic deal approval.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
