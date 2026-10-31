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
    <div className="w-full bg-[#202020] text-[#f8f9eb] border-b border-[#000000] px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5 select-none">
      <div className="flex items-center gap-2.5 font-medium tracking-wide">
        <span className="inline-block px-2.5 py-0.5 bg-[#aafdc0] text-[#202020] font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
          DEMO MODE
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-wider text-[#f8f9eb]">
          {label}
        </span>
      </div>
      <p className="text-[#c0c2a9] text-[11px] font-mono tracking-tight">{subtext}</p>
    </div>
  );
};
