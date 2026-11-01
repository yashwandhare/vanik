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
    <aside className="w-full bg-[#1c1917] text-[#fbf7ee] border-b border-[#1c1917] px-4 py-2 text-xs select-none">
      <div className="vanik-container flex flex-wrap items-center justify-between gap-x-4 gap-y-1 !px-0">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <span className="inline-block px-2.5 py-0.5 bg-[#fde68a] text-[#78350f] border border-[#b45309] font-mono text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs">
            DEMO MODE
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#fbf7ee]">
            {label}
          </span>
        </div>
        <p className="text-[#d8cbbe] text-[11px] font-mono tracking-tight hidden sm:block">
          {subtext}
        </p>
      </div>
    </aside>
  );
};
