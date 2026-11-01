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
    <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[22px] p-6 relative transition-all hover:-translate-y-0.5 shadow-xs">
      {/* Top Header with Category Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-[#1E1A1C] tracking-tight">{passport.name}</h3>
            {isMock && (
              <span className="text-[10px] bg-[#F6EDD9] text-[#2A2224] border border-[#CDBB98] px-2 py-0.5 rounded-full font-mono font-semibold">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B5A4B] mt-1">{passport.description || 'Autonomous commercial representative'}</p>
          {passport.strategy_profile && (
            <span className="inline-block mt-1 font-mono text-[10px] text-[#6B5A4B] uppercase tracking-wider">
              Strategy: <strong className="text-[#1E1A1C] font-bold">{passport.strategy_profile}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              isBuyer
                ? 'bg-[#BCDFB0] text-[#0E4A47] border-[#0E4A47]'
                : 'bg-[#D4C2E6] text-[#C8472F] border-[#C8472F]'
            }`}
          >
            {passport.role}
          </span>
          <span
            className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
              passport.agent_status === 'active'
                ? 'bg-[#1E1A1C] text-white border-[#1E1A1C]'
                : 'bg-[#F2B6C4] text-[#C8472F] border-[#C8472F]'
            }`}
          >
            {passport.agent_status}
          </span>
        </div>
      </div>

      {/* Identifiers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        <div className="bg-[#F6EDD9] p-3 rounded-[13px] border border-[#CDBB98]">
          <span className="text-[#8C7E70] block text-[10px] font-mono uppercase tracking-wider mb-1">Agent ID</span>
          <code className="text-[#1E1A1C] font-mono text-[11px] font-semibold select-all break-all">{passport.agent_id}</code>
        </div>

        <div className="bg-[#F6EDD9] p-3 rounded-[13px] border border-[#CDBB98]">
          <span className="text-[#8C7E70] block text-[10px] font-mono uppercase tracking-wider mb-1">Principal ID</span>
          <code className="text-[#1E1A1C] font-mono text-[11px] font-semibold select-all break-all">{passport.principal_id}</code>
        </div>
      </div>

      {/* Cryptographic Ed25519 Signing Identity Box */}
      <div className="bg-[#F6EDD9] p-4 rounded-[16px] border-[1.5px] border-[#1E1A1C] mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#0E4A47] flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E4A47] inline-block" />
            Ed25519 Signing Identity
          </span>
          <span className="font-mono text-[10px] bg-[#FFFAF0] px-2 py-0.5 rounded border border-[#CDBB98] text-[#2A2224] font-bold">
            KEY v{passport.signing_key.key_version}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#2A2224] break-all select-all pt-1 border-t border-[#CDBB98]/60">
          <span className="text-[#8C7E70] select-none">Fingerprint: </span>
          <span className="text-[#0E4A47] font-bold">{passport.signing_key.fingerprint}</span>
        </div>
      </div>

      {/* Trust & Security Metrics Trio */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs mb-4">
        <div className="bg-[#FFFAF0] p-2.5 rounded-[13px] border border-[#CDBB98]">
          <span className="text-[#8C7E70] text-[10px] font-mono uppercase block mb-1">Verification</span>
          <span className="text-[#0E4A47] font-bold capitalize text-xs">
            {passport.verification_status.replace('_', ' ')}
          </span>
        </div>
        <div className="bg-[#FFFAF0] p-2.5 rounded-[13px] border border-[#CDBB98]">
          <span className="text-[#8C7E70] text-[10px] font-mono uppercase block mb-1">Trust Conf.</span>
          <span className="text-[#2A2224] font-bold capitalize text-xs">{passport.trust_confidence.level}</span>
        </div>
        <div className="bg-[#FFFAF0] p-2.5 rounded-[13px] border border-[#CDBB98]">
          <span className="text-[#8C7E70] text-[10px] font-mono uppercase block mb-1">Security</span>
          <span className="text-[#2A2224] font-bold text-xs">
            {passport.security.status === 'no_incidents_recorded' ? 'Clean' : 'Review'}
          </span>
        </div>
      </div>

      {/* Capabilities & Allowed Tools */}
      <div className="space-y-2.5 pt-3 border-t border-[#CDBB98] text-xs">
        <div>
          <span className="text-[#8C7E70] text-[11px] font-mono uppercase block mb-1.5">Capabilities:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.capabilities.map((cap) => (
              <span key={cap} className="px-2.5 py-0.5 bg-[#F6EDD9] text-[#1E1A1C] border border-[#1E1A1C] rounded-full text-[11px] font-mono font-medium">
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[#8C7E70] text-[11px] font-mono uppercase block mb-1.5">Allowed Tools:</span>
          <div className="flex flex-wrap gap-1.5">
            {passport.allowed_tools.map((tool) => (
              <span key={tool} className="px-2.5 py-0.5 bg-[#FFFAF0] text-[#6B5A4B] border border-[#CDBB98] rounded-full text-[11px] font-mono">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Lifecycle Actions */}
      {(onPause || onResume || onRevoke || onRotateKey) && !isRevoked && (
        <div className="pt-3 mt-3 border-t border-[#CDBB98] flex flex-wrap items-center gap-2">
          {isPaused ? (
            onResume && (
              <button
                type="button"
                onClick={() => onResume(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#BCDFB0] hover:bg-[#BCDFB0] text-[#0E4A47] font-mono text-[11px] font-bold border border-[#0E4A47] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              >
                Resume Agent
              </button>
            )
          ) : (
            onPause && (
              <button
                type="button"
                onClick={() => onPause(passport.agent_id)}
                className="px-3 py-1 rounded-[8px] bg-[#F6EDD9] hover:bg-[#EDE0C4] text-[#2A2224] font-mono text-[11px] font-bold border border-[#CDBB98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              >
                Pause
              </button>
            )
          )}

          {onRotateKey && (
            <button
              type="button"
              onClick={() => onRotateKey(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#F2C85B] hover:bg-[#F2C85B] text-[#1E1A1C] font-mono text-[11px] font-bold border border-[#E2A93B] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
            >
              Rotate Key
            </button>
          )}

          {onRevoke && (
            <button
              type="button"
              onClick={() => onRevoke(passport.agent_id)}
              className="px-3 py-1 rounded-[8px] bg-[#F2B6C4] hover:bg-[#F2B6C4] text-[#C8472F] font-mono text-[11px] font-bold border border-[#C8472F] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ml-auto"
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
};
