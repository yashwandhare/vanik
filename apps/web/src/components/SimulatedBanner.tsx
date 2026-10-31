import React from 'react';

interface SimulatedBannerProps {
  label?: string;
  subtext?: string;
}

export const SimulatedBanner: React.FC<SimulatedBannerProps> = ({
  label = 'SIMULATED / SYNTHETIC DEMO ENVIRONMENT',
  subtext = 'Official verification, payment settlement, and identities are synthetic simulations for demonstration. No real government documents or money are used.',
}) => {
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 font-medium">
        <span className="inline-block px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded tracking-wide text-[10px]">
          DEMO MODE
        </span>
        <span>{label}</span>
      </div>
      <p className="text-slate-400 text-[11px]">{subtext}</p>
    </div>
  );
};
