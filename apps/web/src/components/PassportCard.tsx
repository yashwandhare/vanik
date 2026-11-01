import React from 'react';
import type { AgentPassportResponse } from '../lib/types';

interface PassportCardProps {
  passport: AgentPassportResponse;
  isMock?: boolean;
  onPause?: (agentId: string) => Promise<void> | void;
  onResume?: (agentId: string) => Promise<void> | void;
  onRevoke?: (agentId: string) => Promise<void> | void;
  onRotateKey?: (agentId: string) => Promise<void> | void;
}

export const PassportCard: React.FC<PassportCardProps> = ({
  passport,
  isMock = false,
  onPause,
  onResume,
  onRevoke,
  onRotateKey,
}) => {
  const isBuyer = passport.role === 'buyer';
  const isRevoked = passport.agent_status === 'revoked';
  const isPaused = passport.agent_status === 'paused';

  return (
    <div className="bg-[#FFFDF9] border-[1.5px] border-[#DDD0B8] rounded-[22px] p-6 relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs">
      {/* Top Header with Category Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-[#1C181A] tracking-tight">{passport.name}</h3>
            {isMock && (
              <span className="text-[10px] bg-[#FAF5E8] text-[#262022] border border-[#DDD0B8] px-2 py-0.5 rounded-full font-mono font-semibold">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-[#5E4E40] mt-1 leading-relaxed">{passport.description || 'Autonomous commercial representative'}</p>
          {passport.strategy_profile && (
            <span className="inline-block mt-1 font-mono text-[10px] text-[#5E4E40] uppercase tracking-wider">
              Strategy: <strong className="text-[#1C181A] font-bold">{passport.strategy_profile}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              isBuyer
                ? 'bg-[#C5EDB1] text-[#0F5B57] border-[#0F5B57]'
                : 'bg-[#E2D5F2] text-[#D9381E] border-[#D9381E]'
            }`}
          >
            {passport.role}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              passport.agent_status === 'active'
                ? 'bg-[#1C181A] text-white border-[#1C181A]'
                : 'bg-[#F8CBD6] text-[#D9381E] border-[#D9381E]'
            }`}
          >
            {passport.agent_status === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5EDB1] inline-block animate-pulse" />
            )}
            {passport.agent_status}
          </span>
        </div>
      </div>

      {/* Identifiers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        <div className="bg-[#FAF5E8] p-3 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] block text-[10px] font-mono uppercase tracking-wider mb-1">Agent ID</span>
          <code className="text-[#1C181A] font-mono text-[11px] font-semibold select-all break-all">{passport.agent_id}</code>
        </div>

        <div className="bg-[#FAF5E8] p-3 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] block text-[10px] font-mono uppercase tracking-wider mb-1">Principal ID</span>
          <code className="text-[#1C181A] font-mono text-[11px] font-semibold select-all break-all">{passport.principal_id}</code>
        </div>
      </div>

      {/* Cryptographic Ed25519 Signing Identity Box */}
      <div className="bg-[#FAF5E8] p-4 rounded-[16px] border-[1.5px] border-[#DDD0B8] mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#0F5B57] flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F5B57] inline-block shadow-2xs" />
            Ed25519 Signing Identity
          </span>
          <span className="font-mono text-[10px] bg-[#FFFDF9] px-2 py-0.5 rounded border border-[#DDD0B8] text-[#262022] font-bold">
            KEY v{passport.signing_key.key_version}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#262022] break-all select-all pt-1 border-t border-[#DDD0B8]/60">
          <span className="text-[#7D6F61] select-none">Fingerprint: </span>
          <span className="text-[#0F5B57] font-bold">{passport.signing_key.fingerprint}</span>
        </div>
      </div>

      {/* Trust & Security Metrics Quad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs mb-4">
        <div className="bg-[#FFFDF9] p-2.5 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] text-[10px] font-mono uppercase block mb-1">Verification</span>
          <span className="text-[#0F5B57] font-bold capitalize text-xs">
            {passport.verification_status.replace('_', ' ')}
          </span>
        </div>
        <div className="bg-[#FFFDF9] p-2.5 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] text-[10px] font-mono uppercase block mb-1">Reputation</span>
          <span className="text-[#D9381E] font-bold text-xs flex items-center justify-center gap-1 font-mono">
            ★ {passport.market_rating.value ? `${passport.market_rating.value}/5.0` : 'Unrated'}
          </span>
        </div>
        <div className="bg-[#FFFDF9] p-2.5 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] text-[10px] font-mono uppercase block mb-1">Outcomes</span>
          <span className="text-[#0F5B57] font-bold font-mono text-xs">
            {passport.market_rating.verified_outcome_count > 0
              ? `${passport.market_rating.verified_outcome_count} Deals`
              : 'New Agent'}
          </span>
        </div>
        <div className="bg-[#FFFDF9] p-2.5 rounded-[13px] border border-[#DDD0B8]">
          <span className="text-[#7D6F61] text-[10px] font-mono uppercase block mb-1">Security Audit</span>
          <span className="text-[#0F5B57] font-bold text-xs">
            {passport.security.status === 'no_incidents_recorded' ? '✓ Clean Ledger' : '⚠ Review'}
          </span>
        </div>
      </div>

      {/* Operational Mandate & Authority Boundaries */}
      <div className="bg-[#FAF5E8] p-3.5 rounded-[14px] border border-[#DDD0B8] mb-4 text-xs space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#7D6F61] font-bold uppercase">Authority Scope:</span>
          <span className="text-[#0F5B57] font-bold">Max Limit: ₹1,00,000 / trade</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#DDD0B8]/60 pt-1.5">
          <span className="text-[#7D6F61]">Fulfillment Reliability:</span>
          <span className="text-[#1C181A] font-bold">99.4% On-Time Verified</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#DDD0B8]/60 pt-1.5">
          <span className="text-[#7D6F61]">Benchmark Fidelity:</span>
          <span className="text-[#0F5B57] font-bold">100% Price Honored</span>
        </div>
      </div>

      {/* Counterparty Reviews & Ratings */}
      <div className="bg-[#FFFDF9] p-3.5 rounded-[14px] border border-[#DDD0B8] mb-4 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[#7D6F61]">
            Recent Counterparty Reviews
          </span>
          <span className="text-[10px] font-mono text-[#0F5B57] font-bold">
            100% Positive Feedback
          </span>
        </div>
        <div className="p-2.5 bg-[#FAF5E8] rounded-[10px] border border-[#DDD0B8]/60 text-[11px] text-[#5E4E40] space-y-1">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-[#1C181A]">Buyer Agent (Diwali Kirana)</span>
            <span className="text-[#D9381E] font-bold">★★★★★ 5.0</span>
          </div>
          <p className="italic">
            &quot;Accurately honored 40-SKU Diwali restock benchmark, accepted Net-7 credit terms, 2-day delivery guaranteed. Cryptographic Ed25519 terms signed.&quot;
          </p>
        </div>
      </div>

      {/* Capabilities & Allowed Tools */}
      <div className="space-y-2.5 pt-3 border-t border-[#DDD0B8] text-xs">
        <div>
          <span className="text-[#7D6F61] text-[11px] font-mono uppercase block mb-1.5">Capabilities:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.capabilities.map((cap) => (
              <span key={cap} className="px-2.5 py-0.5 bg-[#FAF5E8] text-[#1C181A] border border-[#DDD0B8] rounded-full text-[11px] font-mono font-medium">
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[#7D6F61] text-[11px] font-mono uppercase block mb-1.5">Allowed Tools:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.allowed_tools.map((tool) => (
              <span key={tool} className="px-2.5 py-0.5 bg-[#FFFDF9] text-[#5E4E40] border border-[#DDD0B8] rounded-full text-[11px] font-mono">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Lifecycle Actions */}
      {(onPause || onResume || onRevoke || onRotateKey) && !isRevoked && (
        <div className="pt-3 mt-3 border-t border-[#DDD0B8] flex flex-wrap items-center gap-2">
          {isPaused ? (
            onResume && (
              <button
                type="button"
                onClick={() => onResume(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#C5EDB1] hover:brightness-105 active:scale-95 text-[#0F5B57] font-mono text-[11px] font-bold border border-[#0F5B57] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
              >
                Resume Agent
              </button>
            )
          ) : (
            onPause && (
              <button
                type="button"
                onClick={() => onPause(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#FAF5E8] hover:bg-[#F5EBD7] active:scale-95 text-[#262022] font-mono text-[11px] font-bold border border-[#DDD0B8] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
              >
                Pause
              </button>
            )
          )}

          {onRotateKey && (
            <button
              type="button"
              onClick={() => onRotateKey(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#F7CE58] hover:brightness-105 active:scale-95 text-[#1C181A] font-mono text-[11px] font-bold border border-[#EAA82C] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
            >
              Rotate Key
            </button>
          )}

          {onRevoke && (
            <button
              type="button"
              onClick={() => onRevoke(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#F8CBD6] hover:brightness-105 active:scale-95 text-[#D9381E] font-mono text-[11px] font-bold border border-[#D9381E] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ml-auto"
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
};
