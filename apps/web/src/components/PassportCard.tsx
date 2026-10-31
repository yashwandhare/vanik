import React from 'react';
import type { AgentPassportResponse } from '../lib/types';

interface PassportCardProps {
  passport: AgentPassportResponse;
  isMock?: boolean;
}

export const PassportCard: React.FC<PassportCardProps> = ({ passport, isMock = false }) => {
  const isBuyer = passport.role === 'buyer';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden transition-all hover:border-slate-700">
      {/* Decorative top bar */}
      <div className={`h-1.5 w-full absolute top-0 left-0 ${isBuyer ? 'bg-indigo-500' : 'bg-emerald-500'}`} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{passport.name}</h3>
            {isMock && (
              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{passport.description || 'No description provided'}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
              isBuyer
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {passport.role}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              passport.agent_status === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {passport.agent_status}
          </span>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-slate-500 block text-[11px] uppercase tracking-wider mb-1">Agent ID</span>
          <code className="text-slate-300 font-mono text-[11px] select-all break-all">{passport.agent_id}</code>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-slate-500 block text-[11px] uppercase tracking-wider mb-1">Principal ID</span>
          <code className="text-slate-300 font-mono text-[11px] select-all break-all">{passport.principal_id}</code>
        </div>
      </div>

      {/* Signing Key & Cryptographic Fingerprint */}
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 mb-4">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Ed25519 Signing Identity
          </span>
          <span className="font-mono text-[10px] text-slate-500">v{passport.signing_key.key_version}</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 break-all select-all">
          <span className="text-slate-500 select-none">Fingerprint: </span>
          <span className="text-indigo-300">{passport.signing_key.fingerprint}</span>
        </div>
      </div>

      {/* Trust & Security Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase block mb-1">Verification</span>
          <span className="text-emerald-400 font-medium capitalize">
            {passport.verification_status.replace('_', ' ')}
          </span>
        </div>
        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase block mb-1">Trust Conf.</span>
          <span className="text-indigo-400 font-medium capitalize">{passport.trust_confidence.level}</span>
        </div>
        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase block mb-1">Security</span>
          <span className="text-slate-300 font-medium">
            {passport.security.status === 'no_incidents_recorded' ? 'Clean' : 'Review'}
          </span>
        </div>
      </div>

      {/* Capabilities & Allowed Tools */}
      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 text-[11px] block mb-1">Capabilities:</span>
          <div className="flex flex-wrap gap-1">
            {passport.capabilities.map((cap) => (
              <span key={cap} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]">
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-slate-500 text-[11px] block mb-1">Allowed Tools:</span>
          <div className="flex flex-wrap gap-1">
            {passport.allowed_tools.map((tool) => (
              <span key={tool} className="px-2 py-0.5 bg-slate-800/60 text-slate-400 rounded text-[11px] font-mono">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
