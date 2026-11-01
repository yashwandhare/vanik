'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/catalogue', label: 'Catalogue & Sellers' },
    { href: '/seller', label: 'Seller Workspace' },
    { href: '/negotiations', label: 'Negotiations' },
    { href: '/principals', label: 'Principals' },
    { href: '/agents', label: 'Agent Passports' },
  ];

  return (
    <header className="border-b-[1.5px] border-[#CDBB98] bg-[#F6EDD9]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="vanik-container h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0E4A47] border border-[#1E1A1C] inline-block group-hover:scale-110 transition-transform shadow-xs" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tighter text-[#1E1A1C] uppercase">
              VANIK
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] font-bold">
              B2B A2A
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs sm:text-sm font-bold text-[#2A2224]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] rounded ${
                    isActive
                      ? 'text-[#1E1A1C] border-b-2 border-[#0E4A47]'
                      : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/miniapp"
              className="px-2.5 py-1 rounded-full bg-[#F2C85B] text-[#1E1A1C] border border-[#E2A93B] text-xs font-mono font-bold tracking-tight hover:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
            >
              Mini App
            </Link>
          </nav>
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#2A2224] font-mono bg-[#FFFAF0] px-2.5 py-1 rounded-full border border-[#CDBB98]">
            <span className="w-2 h-2 rounded-full bg-[#0E4A47] inline-block animate-pulse" />
            <span className="font-semibold text-[11px]">API :8000</span>
          </div>

          <Link
            href="/login"
            className="text-xs font-bold text-[#2A2224] hover:text-[#1E1A1C] px-3 sm:px-3.5 py-1.5 rounded-[9px] border border-[#CDBB98] hover:border-[#1E1A1C] bg-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="text-xs font-bold text-white bg-[#1E1A1C] hover:bg-[#0E4A47] px-3.5 sm:px-4 py-1.5 rounded-[11px] border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
          >
            Register
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[#CDBB98] text-[#2A2224] hover:bg-[#EDE0C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="block w-4 h-0.5 bg-[#1E1A1C] mb-1" />
            <span className="block w-4 h-0.5 bg-[#1E1A1C] mb-1" />
            <span className="block w-4 h-0.5 bg-[#1E1A1C]" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden border-t border-[#CDBB98] bg-[#F6EDD9] px-4 py-4 space-y-2 font-bold text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#2A2224] hover:text-[#1E1A1C]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/miniapp"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-block mt-2 px-3 py-1 rounded-full bg-[#F2C85B] text-[#1E1A1C] border border-[#E2A93B] text-xs font-mono font-bold"
          >
            Telegram Mini App
          </Link>
        </div>
      )}
    </header>
  );
};
