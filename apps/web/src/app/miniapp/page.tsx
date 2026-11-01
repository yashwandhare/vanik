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
        <div className="bg-[#fef3c7] border-[1.5px] border-[#b45309] p-3 rounded-full flex items-center justify-between text-xs px-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#166534] inline-block animate-pulse" />
            <span className="font-mono font-bold text-[#92400e]">Telegram Mini App</span>
          </div>
          <span className="font-mono font-bold text-[#85290c]">@vanik_bot</span>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Mini App Views"
          className="grid grid-cols-5 gap-1 bg-[#ffffff] border-[1.5px] border-[#1c1917] p-1 rounded-[16px] text-center shadow-xs text-[11px] font-mono font-bold"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'mandate'}
            onClick={() => setActiveTab('mandate')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ${
              activeTab === 'mandate'
                ? 'bg-[#1c1917] text-white shadow-2xs'
                : 'text-[#665e55] hover:text-[#1c1917]'
            }`}
          >
            Mandate
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'passport'}
            onClick={() => setActiveTab('passport')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ${
              activeTab === 'passport'
                ? 'bg-[#1c1917] text-white shadow-2xs'
                : 'text-[#665e55] hover:text-[#1c1917]'
            }`}
          >
            Passport
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ${
              activeTab === 'timeline'
                ? 'bg-[#1c1917] text-white shadow-2xs'
                : 'text-[#665e55] hover:text-[#1c1917]'
            }`}
          >
            Rounds
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'comparison'}
            onClick={() => setActiveTab('comparison')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ${
              activeTab === 'comparison'
                ? 'bg-[#1c1917] text-white shadow-2xs'
                : 'text-[#665e55] hover:text-[#1c1917]'
            }`}
          >
            Offers
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'approval'}
            onClick={() => setActiveTab('approval')}
            className={`py-2 px-1 rounded-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ${
              activeTab === 'approval'
                ? 'bg-[#85290c] text-white shadow-2xs'
                : 'text-[#85290c] hover:bg-[#85290c]/10'
            }`}
          >
            Approve
          </button>
        </div>

        {/* VIEW 1: MANDATE */}
        {activeTab === 'mandate' && (
          <div className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="border-b border-[#d8cbbe] pb-3">
              <span className="text-[10px] font-mono text-[#85290c] uppercase tracking-wider font-bold block">
                [ PROCUREMENT SPECIFICATION ]
              </span>
              <h2 className="text-xl font-extrabold text-[#1c1917]">Diwali Restock Mandate</h2>
              <p className="text-xs text-[#665e55] font-mono">Task ID: {taskId}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 bg-[#fbf7ee] rounded-[12px] border border-[#d8cbbe]">
                <span className="text-[10px] text-[#877d73] uppercase font-bold block">Budget Ceiling</span>
                <span className="font-extrabold text-[#85290c]">₹85,000.00</span>
              </div>
              <div className="p-3 bg-[#fbf7ee] rounded-[12px] border border-[#d8cbbe]">
                <span className="text-[10px] text-[#877d73] uppercase font-bold block">Target Delivery</span>
                <span className="font-extrabold text-[#1c1917]">Within 3 Days</span>
              </div>
            </div>

            <div className="p-3 bg-[#fbf7ee] rounded-[12px] border border-[#d8cbbe] space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#877d73] font-bold block">
                Commodity Basket (40 SKUs Mandate):
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-[#1c1917]">
                <span>• Basmati Rice 5kg (20 bags)</span>
                <span>• Mustard Oil 1L (48 bottles)</span>
                <span>• Salem Turmeric (25 packs)</span>
                <span>• W320 Cashews (15 packs)</span>
              </div>
            </div>

            <div className="p-3 bg-[#fbf7ee] rounded-[12px] border border-[#d8cbbe] space-y-1 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#877d73] font-bold block">
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
          <div className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between border-b border-[#d8cbbe] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#85290c] uppercase tracking-wider font-bold block">
                  [ VERIFIED AGENT CREDENTIAL ]
                </span>
                <h2 className="text-xl font-extrabold text-[#1c1917]">Diwali Restock Agent</h2>
                <p className="text-xs text-[#665e55]">Kirana Autonomous Procurement Bot</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#14532d] border border-[#166534] font-mono font-bold text-[10px] uppercase">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2.5 bg-[#fbf7ee] rounded-[10px] border border-[#d8cbbe]">
                <span className="text-[#877d73]">Cryptographic Key:</span>
                <span className="text-[#1c1917] font-bold">Ed25519 (v1 Active)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#fbf7ee] rounded-[10px] border border-[#d8cbbe]">
                <span className="text-[#877d73]">Strategy Profile:</span>
                <span className="text-[#85290c] font-bold">Price & Speed Optimizer</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#fbf7ee] rounded-[10px] border border-[#d8cbbe]">
                <span className="text-[#877d73]">Tool Ceiling:</span>
                <span className="text-[#1c1917]">Marketplace Search, Benchmark</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#fbf7ee] rounded-[10px] border border-[#d8cbbe]">
                <span className="text-[#877d73]">Principal Verification:</span>
                <span className="text-[#14532d] font-bold">Demo Verified</span>
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
                className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[18px] p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#1c1917]">{s.name}</span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                      s.status === 'accepted'
                        ? 'bg-[#dcfce7] text-[#14532d] border-[#166534]'
                        : s.status === 'flagged'
                        ? 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]'
                        : 'bg-[#ffedd5] text-[#9a3412] border-[#b45309]'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#877d73]">
                    Round {s.round} • {s.strategy}
                  </span>
                  <span className="font-bold text-[#85290c]">{s.quote}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 4: COMPARISON */}
        {activeTab === 'comparison' && (
          <div className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[24px] p-5 shadow-sm space-y-4">
            <div className="border-b border-[#d8cbbe] pb-3">
              <span className="text-[10px] font-mono text-[#85290c] uppercase tracking-wider font-bold block">
                [ SIDE-BY-SIDE MATRIX ]
              </span>
              <h2 className="text-lg font-extrabold text-[#1c1917]">Ranked Offer Matrix</h2>
              <p className="text-xs text-[#665e55]">Objective backend deterministic ranking</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#dcfce7]/30 border border-[#166534] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-[#1c1917]">#1 Kisan Wholesale</span>
                  <span className="px-2 py-0.5 bg-[#dcfce7] text-[#14532d] font-mono font-bold text-[9px] rounded-full uppercase border border-[#166534]">
                    WINNER
                  </span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#85290c] font-bold text-sm">₹79,850.00</span>
                  <span className="text-[#14532d]">2 Days • Net 7</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#fbf7ee] border border-[#d8cbbe] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-[#1c1917]">#2 Mahalaxmi Agro</span>
                  <span className="text-[10px] font-mono text-[#877d73]">Competitive</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#292524]">₹84,200.00</span>
                  <span className="text-[#665e55]">3 Days • Net 15</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#fbf7ee] border border-[#d8cbbe] rounded-[14px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-[#1c1917]">#3 Vardhaman Bulk</span>
                  <span className="text-[10px] font-mono text-[#877d73]">High Friction</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#292524]">₹82,400.00</span>
                  <span className="text-[#665e55]">4 Days • Net 0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: DEAL APPROVAL & SETTLEMENT */}
        {activeTab === 'approval' && (
          <div className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#d8cbbe] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#877d73] uppercase tracking-wider block">
                  Recommended Counterparty
                </span>
                <h2 className="font-extrabold text-base text-[#1c1917]">Kisan Wholesale (Seller B)</h2>
              </div>
              <span className="px-2.5 py-0.5 bg-[#dcfce7] text-[#14532d] border border-[#166534] rounded-full text-[10px] font-mono font-bold uppercase">
                BEST OFFER
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#d8cbbe]/60">
                <span className="text-[#665e55]">Basket Quote Total:</span>
                <span className="font-mono text-[#85290c] font-extrabold text-sm">₹79,850.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#d8cbbe]/60">
                <span className="text-[#665e55]">Catalogue Items:</span>
                <span className="text-[#1c1917] font-bold">40 SKUs (Full Restock Basket)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#d8cbbe]/60">
                <span className="text-[#665e55]">Payment Terms:</span>
                <span className="text-[#1c1917] font-bold">Net 7 Days (10% Upfront)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#665e55]">Delivery Schedule:</span>
                <span className="text-[#85290c] font-bold">2 Days (Before Diwali)</span>
              </div>
            </div>

            {/* Cryptographic deal binding warning */}
            <div className="bg-[#fbf7ee] p-3.5 rounded-[14px] border border-[#d8cbbe] text-xs text-[#665e55] space-y-1">
              <div className="flex items-center gap-1.5 text-[#1c1917] font-bold font-mono text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#166534] inline-block" />
                <span>Cryptographic Deal Binding:</span>
              </div>
              <p className="text-[10px] font-mono leading-relaxed">
                Approving generates a single-use token bound to exact deal hash <code>sha256:7b2...9f4</code>. Counterparty modifications immediately invalidate this authorization.
              </p>
            </div>

            {/* Action button */}
            <div className="pt-2">
              {approved ? (
                <div className="p-4 bg-[#dcfce7] border-[1.5px] border-[#166534] rounded-[16px] text-center space-y-1.5">
                  <span className="text-xs font-mono font-extrabold text-[#14532d] block">
                    ✓ DEAL APPROVED & SETTLED (SIMULATED)
                  </span>
                  <div className="font-mono text-[11px] text-[#14532d] font-bold">
                    MOCK UPI: UPI-SIM-2026-9812487
                  </div>
                  <p className="text-[10px] text-[#14532d] font-mono">
                    Synthetic UPI settlement receipt transmitted to Telegram chat.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submittingApproval}
                  className="w-full py-3 bg-[#1c1917] hover:bg-[#85290c] text-white font-bold text-xs rounded-[12px] border border-[#1c1917] transition-all shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] disabled:opacity-50"
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
        <div className="vanik-container py-16 text-center font-mono text-xs text-[#665e55]">
          <span className="inline-block w-4 h-4 border-2 border-[#85290c] border-t-transparent rounded-full animate-spin mr-2" />
          Loading Telegram Mini App...
        </div>
      }
    >
      <MiniAppContent />
    </Suspense>
  );
}
