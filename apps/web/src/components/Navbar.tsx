import React from 'react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              VANIK
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              B2B A2A
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/catalogue"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Catalogue (40 SKU)
            </Link>
            <Link
              href="/negotiations"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Negotiations
            </Link>
            <Link
              href="/principals"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Principals
            </Link>
            <Link
              href="/agents"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Agent Passports
            </Link>
            <Link
              href="/miniapp"
              className="px-3 py-1.5 rounded-md text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-900/60 transition-colors ml-2"
            >
              Telegram Mini App
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>API: 8000</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md shadow-sm transition-colors"
          >
            Register Business
          </Link>
        </div>
      </div>
    </header>
  );
};
