import React from 'react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b-[1.5px] border-[#c0c2a9] bg-[#f8f9eb]/95 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-4 h-4 rounded-full bg-[#003d21] border border-[#000000] inline-block group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-extrabold tracking-tighter text-[#000000] uppercase font-['Space_Grotesk']">
              VANIK
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#edeee1] text-[#202020] border border-[#c0c2a9] tracking-wider">
              A2A COMMERCE
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-semibold text-[#202020]">
            <Link
              href="/"
              className="hover:text-[#000000] transition-colors hover:underline underline-offset-4 decoration-2 decoration-[#003d21]"
            >
              Overview
            </Link>
            <Link
              href="/catalogue"
              className="hover:text-[#000000] transition-colors hover:underline underline-offset-4 decoration-2 decoration-[#003d21]"
            >
              Catalogue (40 SKU)
            </Link>
            <Link
              href="/negotiations"
              className="hover:text-[#000000] transition-colors hover:underline underline-offset-4 decoration-2 decoration-[#003d21]"
            >
              Negotiations
            </Link>
            <Link
              href="/principals"
              className="hover:text-[#000000] transition-colors hover:underline underline-offset-4 decoration-2 decoration-[#003d21]"
            >
              Principals
            </Link>
            <Link
              href="/agents"
              className="hover:text-[#000000] transition-colors hover:underline underline-offset-4 decoration-2 decoration-[#003d21]"
            >
              Agent Passports
            </Link>
            <Link
              href="/miniapp"
              className="px-2.5 py-1 rounded-full bg-[#b0f4ff] text-[#000000] border border-[#000000] text-xs font-mono font-bold tracking-tight hover:brightness-95 transition-all"
            >
              Mini App
            </Link>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#202020] font-mono bg-[#ffffff] px-3 py-1 rounded-full border-[1.5px] border-[#c0c2a9]">
            <span className="w-2 h-2 rounded-full bg-[#003d21] inline-block animate-pulse" />
            <span className="font-semibold text-[11px]">API: 8000</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-[#202020] hover:text-[#000000] px-4 py-2 rounded-[9px] border-[1.5px] border-[#c0c2a9] hover:border-[#000000] bg-transparent transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold text-white bg-[#202020] hover:bg-[#000000] px-4 py-2 rounded-[13px] border border-[#000000] transition-all shadow-sm"
          >
            Register Business
          </Link>
        </div>
      </div>
    </header>
  );
};
