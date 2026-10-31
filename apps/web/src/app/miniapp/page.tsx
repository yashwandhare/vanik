'use client';

import React, { useState } from 'react';

export default function MiniAppPage() {
  const [approved, setApproved] = useState(false);

  return (
    <div className="vanik-container py-10 sm:py-14">
      <div className="max-w-md mx-auto space-y-6">
        {/* Telegram Mobile Header */}
        <div className="bg-[#b0f4ff] border-[1.5px] border-[#000000] p-3 rounded-full flex items-center justify-between text-xs px-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#041668] inline-block animate-pulse" />
            <span className="font-mono font-bold text-[#041668]">Telegram Mini App Context</span>
          </div>
          <span className="font-mono font-bold text-[#041668]">@vanik_bot</span>
        </div>

        <div className="text-center space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#7c7d76] font-bold">
            [ MANDATE CHALLENGE ]
          </span>
          <h1 className="text-2xl font-extrabold text-[#000000] tracking-tight">Deal Approval Challenge</h1>
          <p className="text-xs text-[#5a5a4f] font-mono">
            Task Mandate #70000000-0001
          </p>
        </div>

        {/* Mini App Card */}
        <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#c0c2a9] pb-3">
            <div>
              <span className="text-[10px] font-mono text-[#7c7d76] uppercase tracking-wider block">Recommended Counterparty</span>
              <span className="font-extrabold text-sm text-[#000000]">Kisan Wholesale (Seller B)</span>
            </div>
            <span className="px-2.5 py-0.5 bg-[#aafdc0] text-[#003d21] border border-[#000000] rounded-full text-[10px] font-mono font-bold uppercase">
              BEST OFFER
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#c0c2a9]/60">
              <span className="text-[#5a5a4f]">Basket Quote Total:</span>
              <span className="font-mono text-[#003d21] font-extrabold text-sm">₹79,850.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#c0c2a9]/60">
              <span className="text-[#5a5a4f]">Catalogue Items:</span>
              <span className="text-[#000000] font-bold">40 SKUs (Full Restock Basket)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#c0c2a9]/60">
              <span className="text-[#5a5a4f]">Payment Terms:</span>
              <span className="text-[#000000] font-bold">Net 7 Days (10% Upfront)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5a5a4f]">Delivery Schedule:</span>
              <span className="text-[#003d21] font-bold">Nov 03 (Before Diwali)</span>
            </div>
          </div>

          {/* Cryptographic deal binding warning */}
          <div className="bg-[#f8f9eb] p-3.5 rounded-[14px] border border-[#c0c2a9] text-xs text-[#5a5a4f] space-y-1">
            <div className="flex items-center gap-1.5 text-[#000000] font-bold font-mono text-[11px] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#003d21] inline-block" />
              <span>Cryptographic Binding:</span>
            </div>
            <p className="text-[10px] font-mono leading-relaxed">
              Approving generates a single-use token bound to exact deal hash <code>sha256:7b2...9f4</code>. Counterparty modifications immediately invalidate this authorization.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2">
            {approved ? (
              <div className="p-4 bg-[#aafdc0]/40 border-[1.5px] border-[#000000] rounded-[16px] text-center space-y-1">
                <span className="text-xs font-mono font-extrabold text-[#003d21] block">
                  ✓ DEAL APPROVED & SETTLED (SIMULATED)
                </span>
                <p className="text-[11px] text-[#5a5a4f] font-mono">
                  Synthetic UPI receipt transmitted to Telegram chat.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setApproved(true)}
                className="w-full py-3 bg-[#202020] hover:bg-[#000000] text-white font-bold text-xs rounded-[12px] border border-[#000000] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Approve & Authorize Mock Settlement</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
