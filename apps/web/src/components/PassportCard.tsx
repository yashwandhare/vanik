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
    <div className="bg-[#ffffff] border-[1.5px] border-[#1c1917] rounded-[22px] p-6 relative transition-all hover:-translate-y-0.5 shadow-xs">
      {/* Top Header with Category Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-[#1c1917] tracking-tight">{passport.name}</h3>
            {isMock && (
              <span className="text-[10px] bg-[#fbf7ee] text-[#292524] border border-[#d8cbbe] px-2 py-0.5 rounded-full font-mono font-semibold">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-[#665e55] mt-1">{passport.description || 'Autonomous commercial representative'}</p>
          {passport.strategy_profile && (
            <span className="inline-block mt-1 font-mono text-[10px] text-[#665e55] uppercase tracking-wider">
              Strategy: <strong className="text-[#1c1917] font-bold">{passport.strategy_profile}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              isBuyer
                ? 'bg-[#dcfce7] text-[#14532d] border-[#166534]'
                : 'bg-[#ffedd5] text-[#9a3412] border-[#c2410c]'
            }`}
          >
            {passport.role}
          </span>
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              passport.agent_status === 'active'
                ? 'bg-[#1c1917] text-white border-[#1c1917]'
                : 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]'
            }`}
          >
            {passport.agent_status}
          </span>
        </div>
      </div>

      {/* Identifiers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        <div className="bg-[#fbf7ee] p-3 rounded-[13px] border border-[#d8cbbe]">
          <span className="text-[#877d73] block text-[10px] font-mono uppercase tracking-wider mb-1">Agent ID</span>
          <code className="text-[#1c1917] font-mono text-[11px] font-semibold select-all break-all">{passport.agent_id}</code>
        </div>

        <div className="bg-[#fbf7ee] p-3 rounded-[13px] border border-[#d8cbbe]">
          <span className="text-[#877d73] block text-[10px] font-mono uppercase tracking-wider mb-1">Principal ID</span>
          <code className="text-[#1c1917] font-mono text-[11px] font-semibold select-all break-all">{passport.principal_id}</code>
        </div>
      </div>

      {/* Cryptographic Ed25519 Signing Identity Box */}
      <div className="bg-[#fbf7ee] p-4 rounded-[16px] border-[1.5px] border-[#1c1917] mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#85290c] flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-[#85290c] inline-block" />
            Ed25519 Signing Identity
          </span>
          <span className="font-mono text-[10px] bg-[#ffffff] px-2 py-0.5 rounded border border-[#d8cbbe] text-[#292524] font-bold">
            KEY v{passport.signing_key.key_version}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#292524] break-all select-all pt-1 border-t border-[#d8cbbe]/60">
          <span className="text-[#877d73] select-none">Fingerprint: </span>
          <span className="text-[#7c2d12] font-bold">{passport.signing_key.fingerprint}</span>
        </div>
      </div>

      {/* Trust & Security Metrics Trio */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs mb-4">
        <div className="bg-[#ffffff] p-2.5 rounded-[13px] border border-[#d8cbbe]">
          <span className="text-[#877d73] text-[10px] font-mono uppercase block mb-1">Verification</span>
          <span className="text-[#166534] font-bold capitalize text-xs">
            {passport.verification_status.replace('_', ' ')}
          </span>
        </div>
        <div className="bg-[#ffffff] p-2.5 rounded-[13px] border border-[#d8cbbe]">
          <span className="text-[#877d73] text-[10px] font-mono uppercase block mb-1">Trust Conf.</span>
          <span className="text-[#292524] font-bold capitalize text-xs">{passport.trust_confidence.level}</span>
        </div>
        <div className="bg-[#ffffff] p-2.5 rounded-[13px] border border-[#d8cbbe]">
          <span className="text-[#877d73] text-[10px] font-mono uppercase block mb-1">Security</span>
          <span className="text-[#292524] font-bold text-xs">
            {passport.security.status === 'no_incidents_recorded' ? 'Clean' : 'Review'}
          </span>
        </div>
      </div>

      {/* Capabilities & Allowed Tools */}
      <div className="space-y-2.5 pt-3 border-t border-[#d8cbbe] text-xs">
        <div>
          <span className="text-[#877d73] text-[11px] font-mono uppercase block mb-1.5">Capabilities:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.capabilities.map((cap) => (
              <span key={cap} className="px-2.5 py-0.5 bg-[#fbf7ee] text-[#1c1917] border border-[#1c1917] rounded-full text-[11px] font-mono font-medium">
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[#877d73] text-[11px] font-mono uppercase block mb-1.5">Allowed Tools:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.allowed_tools.map((tool) => (
              <span key={tool} className="px-2.5 py-0.5 bg-[#ffffff] text-[#665e55] border border-[#d8cbbe] rounded-full text-[11px] font-mono">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Lifecycle Actions */}
      {(onPause || onResume || onRevoke || onRotateKey) && !isRevoked && (
        <div className="pt-3 mt-3 border-t border-[#d8cbbe] flex flex-wrap items-center gap-2">
          {isPaused ? (
            onResume && (
              <button
                type="button"
                onClick={() => onResume(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#14532d] font-mono text-[11px] font-bold border border-[#166534] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
              >
                Resume Agent
              </button>
            )
          ) : (
            onPause && (
              <button
                type="button"
                onClick={() => onPause(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#fbf7ee] hover:bg-[#f3ebe0] text-[#292524] font-mono text-[11px] font-bold border border-[#d8cbbe] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
              >
                Pause
              </button>
            )
          )}

          {onRotateKey && (
            <button
              type="button"
              onClick={() => onRotateKey(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] font-mono text-[11px] font-bold border border-[#b45309] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
            >
              Rotate Key
            </button>
          )}

          {onRevoke && (
            <button
              type="button"
              onClick={() => onRevoke(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] font-mono text-[11px] font-bold border border-[#991b1b] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] ml-auto"
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
};
