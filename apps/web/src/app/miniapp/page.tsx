'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../lib/api-client';

type MiniAppTab = 'mandate' | 'passport' | 'timeline' | 'comparison' | 'approval';

function MiniAppContent() {
  const searchParams = useSearchParams();

  // URL query params for deep-linking
  const initialView = (searchParams.get('view') as MiniAppTab) || 'approval';
  const taskId = searchParams.get('taskId') || '70000000-0000-4000-8000-000000000001';
  const dealId = searchParams.get('dealId') || 'deal-diwali-2026-01';

  const [activeTab, setActiveTab] = useState<MiniAppTab>(
    ['mandate', 'passport', 'timeline', 'comparison', 'approval'].includes(initialView)
      ? initialView
      : 'approval'
  );

  const [approved, setApproved] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Attempt session restoration on mount
  useEffect(() => {
    apiClient.getSession().catch(() => {});
  }, []);

  const handleApprove = async () => {
    setSubmittingApproval(true);
    // Simulate challenge authorization
    await new Promise((r) => setTimeout(r, 600));
    setApproved(true);
    setSubmittingApproval(false);
  };

  return (
    <div className="vanik-container py-6 sm:py-10">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Telegram Mini App Context Header */}
        <div className="bg-[#F2C85B] border-[1.5px] border-[#E2A93B] p-3 rounded-full flex items-center justify-between text-xs px-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E4A47] inline-block animate-pulse" />
            <span className="font-mono font-bold text-[#1E1A1C]">Telegram Mini App</span>
          </div>
          <span className="font-mono font-bold text-[#0E4A47]">@vanik_bot</span>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Mini App Views"
          className="grid grid-cols-5 gap-1 bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-1 rounded-[16px] text-center shadow-xs text-[11px] font-mono font-bold"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'mandate'}
            onClick={() => setActiveTab('mandate')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'mandate'
                ? 'bg-[#1E1A1C] text-white shadow-2xs'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Mandate
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'passport'}
            onClick={() => setActiveTab('passport')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'passport'
                ? 'bg-[#1E1A1C] text-white shadow-2xs'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Passport
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'timeline'
                ? 'bg-[#1E1A1C] text-white shadow-2xs'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Rounds
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'comparison'}
            onClick={() => setActiveTab('comparison')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'comparison'
                ? 'bg-[#1E1A1C] text-white shadow-2xs'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Offers
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'approval'}
            onClick={() => setActiveTab('approval')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'approval'
                ? 'bg-[#0E4A47] text-white shadow-2xs'
                : 'text-[#0E4A47] hover:bg-[#0E4A47]/10'
            }`}
          >
            Approve
          </button>
        </div>

        {/* VIEW 1: MANDATE */}
        {activeTab === 'mandate' && (
          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="border-b border-[#CDBB98] pb-3">
              <span className="text-[10px] font-mono text-[#0E4A47] uppercase tracking-wider font-bold block">
                [ PROCUREMENT SPECIFICATION ]
              </span>
              <h2 className="text-xl font-extrabold text-[#1E1A1C]">Diwali Restock Mandate</h2>
              <p className="text-xs text-[#6B5A4B] font-mono">Task ID: {taskId}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98]">
                <span className="text-[10px] text-[#8C7E70] uppercase font-bold block">Budget Ceiling</span>
                <span className="font-extrabold text-[#0E4A47]">₹85,000.00</span>
              </div>
              <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98]">
                <span className="text-[10px] text-[#8C7E70] uppercase font-bold block">Target Delivery</span>
                <span className="font-extrabold text-[#1E1A1C]">Within 3 Days</span>
              </div>
            </div>

            <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98] space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                Commodity Basket (40 SKUs Mandate):
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-[#1E1A1C]">
                <span>• Basmati Rice 5kg (20 bags)</span>
                <span>• Mustard Oil 1L (48 bottles)</span>
                <span>• Salem Turmeric (25 packs)</span>
                <span>• W320 Cashews (15 packs)</span>
              </div>
            </div>

            <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98] space-y-1 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                Deterministic Ranking Weights:
              </span>
              <div className="flex justify-between font-mono text-[11px]">
                <span>Price: 40%</span>
                <span>Reliability: 25%</span>
                <span>Delivery: 20%</span>
                <span>Credit: 10%</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: AGENT PASSPORT */}
        {activeTab === 'passport' && (
          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between border-b border-[#CDBB98] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#0E4A47] uppercase tracking-wider font-bold block">
                  [ VERIFIED AGENT CREDENTIAL ]
                </span>
                <h2 className="text-xl font-extrabold text-[#1E1A1C]">Diwali Restock Agent</h2>
                <p className="text-xs text-[#6B5A4B]">Kirana Autonomous Procurement Bot</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#BCDFB0] text-[#0E4A47] border border-[#0E4A47] font-mono font-bold text-[10px] uppercase">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2.5 bg-[#F6EDD9] rounded-[10px] border border-[#CDBB98]">
                <span className="text-[#8C7E70]">Cryptographic Key:</span>
                <span className="text-[#1E1A1C] font-bold">Ed25519 (v1 Active)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F6EDD9] rounded-[10px] border border-[#CDBB98]">
                <span className="text-[#8C7E70]">Strategy Profile:</span>
                <span className="text-[#0E4A47] font-bold">Price & Speed Optimizer</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F6EDD9] rounded-[10px] border border-[#CDBB98]">
                <span className="text-[#8C7E70]">Tool Ceiling:</span>
                <span className="text-[#1E1A1C]">Marketplace Search, Benchmark</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F6EDD9] rounded-[10px] border border-[#CDBB98]">
                <span className="text-[#8C7E70]">Principal Verification:</span>
                <span className="text-[#0E4A47] font-bold">Demo Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: TIMELINE / PARALLEL ROUNDS */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {[
              {
                name: 'Kisan Wholesale (Seller B)',
                strategy: 'Clearance',
                status: 'accepted',
                quote: '₹79,850.00',
                round: 2,
                terms: 'Net 7 Days',
              },
              {
                name: 'Mahalaxmi Agro (Seller A)',
                strategy: 'Margin',
                status: 'evaluating',
                quote: '₹84,200.00',
                round: 2,
                terms: 'Net 15 Days',
              },
              {
                name: 'Vardhaman Bulk (Seller C)',
                strategy: 'Payment-Risk',
                status: 'offer_received',
                quote: '₹82,400.00',
                round: 1,
                terms: 'Prepaid 0 Days',
              },
              {
                name: 'QuickDrop Wholesale (Seller D)',
                strategy: 'Adversarial',
                status: 'flagged',
                quote: '₹95,000.00',
                round: 1,
                terms: 'Injection Blocked',
              },
            ].map((s) => (
              <div
                key={s.name}
                className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[18px] p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#1E1A1C]">{s.name}</span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                      s.status === 'accepted'
                        ? 'bg-[#BCDFB0] text-[#0E4A47] border-[#0E4A47]'
                        : s.status === 'flagged'
                        ? 'bg-[#F2B6C4] text-[#C8472F] border-[#C8472F]'
                        : 'bg-[#D4C2E6] text-[#C8472F] border-[#E2A93B]'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#8C7E70]">
                    Round {s.round} • {s.strategy}
                  </span>
                  <span className="font-bold text-[#0E4A47]">{s.quote}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 4: COMPARISON */}
        {activeTab === 'comparison' && (
          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-5 shadow-sm space-y-4">
            <div className="border-b border-[#CDBB98] pb-3">
              <span className="text-[10px] font-mono text-[#0E4A47] uppercase tracking-wider font-bold block">
                [ SIDE-BY-SIDE MATRIX ]
              </span>
              <h2 className="text-lg font-extrabold text-[#1E1A1C]">Ranked Offer Matrix</h2>
              <p className="text-xs text-[#6B5A4B]">Objective backend deterministic ranking</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#BCDFB0]/30 border border-[#0E4A47] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-[#1E1A1C]">#1 Kisan Wholesale</span>
                  <span className="px-2 py-0.5 bg-[#BCDFB0] text-[#0E4A47] font-mono font-bold text-[9px] rounded-full uppercase border border-[#0E4A47]">
                    WINNER
                  </span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#0E4A47] font-bold text-sm">₹79,850.00</span>
                  <span className="text-[#0E4A47]">2 Days • Net 7</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-[#1E1A1C]">#2 Mahalaxmi Agro</span>
                  <span className="text-[10px] font-mono text-[#8C7E70]">Competitive</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#2A2224]">₹84,200.00</span>
                  <span className="text-[#6B5A4B]">3 Days • Net 15</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-[#1E1A1C]">#3 Vardhaman Bulk</span>
                  <span className="text-[10px] font-mono text-[#8C7E70]">High Friction</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#2A2224]">₹82,400.00</span>
                  <span className="text-[#6B5A4B]">4 Days • Net 0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: DEAL APPROVAL & SETTLEMENT */}
        {activeTab === 'approval' && (
          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#CDBB98] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#8C7E70] uppercase tracking-wider block">
                  Recommended Counterparty
                </span>
                <h2 className="font-extrabold text-base text-[#1E1A1C]">Kisan Wholesale (Seller B)</h2>
              </div>
              <span className="px-2.5 py-0.5 bg-[#BCDFB0] text-[#0E4A47] border border-[#0E4A47] rounded-full text-[10px] font-mono font-bold uppercase">
                BEST OFFER
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#CDBB98]/60">
                <span className="text-[#6B5A4B]">Basket Quote Total:</span>
                <span className="font-mono text-[#0E4A47] font-extrabold text-sm">₹79,850.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#CDBB98]/60">
                <span className="text-[#6B5A4B]">Catalogue Items:</span>
                <span className="text-[#1E1A1C] font-bold">40 SKUs (Full Restock Basket)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#CDBB98]/60">
                <span className="text-[#6B5A4B]">Payment Terms:</span>
                <span className="text-[#1E1A1C] font-bold">Net 7 Days (10% Upfront)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6B5A4B]">Delivery Schedule:</span>
                <span className="text-[#0E4A47] font-bold">2 Days (Before Diwali)</span>
              </div>
            </div>

            {/* Cryptographic deal binding warning */}
            <div className="bg-[#F6EDD9] p-3.5 rounded-[14px] border border-[#CDBB98] text-xs text-[#6B5A4B] space-y-1">
              <div className="flex items-center gap-1.5 text-[#1E1A1C] font-bold font-mono text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#0E4A47] inline-block" />
                <span>Cryptographic Deal Binding:</span>
              </div>
              <p className="text-[10px] font-mono leading-relaxed">
                Approving generates a single-use token bound to exact deal hash <code>sha256:7b2...9f4</code>. Counterparty modifications immediately invalidate this authorization.
              </p>
            </div>

            {/* Action button */}
            <div className="pt-2">
              {approved ? (
                <div className="p-4 bg-[#BCDFB0] border-[1.5px] border-[#0E4A47] rounded-[16px] text-center space-y-1.5">
                  <span className="text-xs font-mono font-extrabold text-[#0E4A47] block">
                    ✓ DEAL APPROVED & SETTLED (SIMULATED)
                  </span>
                  <div className="font-mono text-[11px] text-[#0E4A47] font-bold">
                    MOCK UPI: UPI-SIM-2026-9812487
                  </div>
                  <p className="text-[10px] text-[#0E4A47] font-mono">
                    Synthetic UPI settlement receipt transmitted to Telegram chat.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submittingApproval}
                  className="w-full py-3 bg-[#1E1A1C] hover:bg-[#0E4A47] text-white font-bold text-xs rounded-[12px] border border-[#1E1A1C] transition-all shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] disabled:opacity-50"
                >
                  {submittingApproval ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating Principal Challenge...</span>
                    </>
                  ) : (
                    <>
                      <span>Approve & Authorize Mock Settlement</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MiniAppPage() {
  return (
    <Suspense
      fallback={
        <div className="vanik-container py-16 text-center font-mono text-xs text-[#6B5A4B]">
          <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
          Loading Telegram Mini App...
        </div>
      }
    >
      <MiniAppContent />
    </Suspense>
  );
}
