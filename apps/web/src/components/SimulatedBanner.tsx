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
    <aside className="w-full bg-[#1C181A] text-[#FAF5E8] border-b border-[#1C181A] px-4 py-2 text-xs select-none">
      <div className="vanik-container flex flex-wrap items-center justify-between gap-x-4 gap-y-1 !px-0">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#F7CE58] text-[#1C181A] border border-[#EAA82C] font-mono text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F5B57] inline-block animate-pulse" />
            DEMO MODE
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#FAF5E8]">
            {label}
          </span>
        </div>
        <p className="text-[#DDD0B8] text-[11px] font-mono tracking-tight hidden sm:block">
          {subtext}
        </p>
      </div>
    </aside>
  );
};
