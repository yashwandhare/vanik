'use client';

import React, { useState } from 'react';

export default function MiniAppPage() {
  const [approved, setApproved] = useState(false);

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      {/* Telegram Mobile Header */}
      <div className="bg-sky-950/40 border border-sky-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-sky-200">Telegram Mini App Context</span>
        </div>
        <span className="text-[10px] font-mono text-sky-400">@vanik_bot</span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-white tracking-tight">Deal Approval Challenge</h1>
        <p className="text-xs text-slate-400">
          Diwali Procurement Task #70000000-0001
        </p>
      </div>

      {/* Mini App Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Recommended Counterparty</span>
            <span className="font-semibold text-sm text-slate-100">Kisan Wholesale (Seller B)</span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase">
            BEST OFFER
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Amount:</span>
            <span className="font-mono text-emerald-400 font-bold">₹79,850.00</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Items:</span>
            <span className="text-slate-200">40 SKUs (Full Restock Basket)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Payment Terms:</span>
            <span className="text-slate-200">Net 7 Days (10% Upfront)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Delivery Schedule:</span>
            <span className="text-slate-200 font-medium">Nov 03 (Guaranteed before Diwali)</span>
          </div>
        </div>

        {/* Cryptographic deal binding warning */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            <span>Cryptographic Binding</span>
          </div>
          <p className="text-[10px] leading-relaxed">
            Approving generates a single-use token tied to deal hash <code>sha256:7b2...9f4</code>. Any modification by the counterparty invalidates this authorization.
          </p>
        </div>

        {/* Action button */}
        <div className="pt-2">
          {approved ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-1">
              <span className="text-xs font-bold text-emerald-400 block">✓ Deal Approved & Settled</span>
              <p className="text-[11px] text-slate-400">
                Mock UPI receipt sent to your Telegram chat.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setApproved(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Approve & Authorize Mock Settlement</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
