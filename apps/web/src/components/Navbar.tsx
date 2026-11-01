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
    { href: '/negotiations', label: 'Negotiations' },
    { href: '/principals', label: 'Principals' },
    { href: '/agents', label: 'Agent Passports' },
  ];

  return (
    <header className="border-b-[1.5px] border-[#d8cbbe] bg-[#fbf7ee]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="vanik-container h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-3.5 h-3.5 rounded-full bg-[#85290c] border border-[#1c1917] inline-block group-hover:scale-110 transition-transform shadow-xs" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tighter text-[#1c1917] uppercase">
              VANIK
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#f3ebe0] text-[#292524] border border-[#d8cbbe] font-bold">
              B2B A2A
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs sm:text-sm font-bold text-[#292524]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] rounded ${
                    isActive
                      ? 'text-[#1c1917] border-b-2 border-[#85290c]'
                      : 'text-[#665e55] hover:text-[#1c1917]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/miniapp"
              className="px-2.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#b45309] text-xs font-mono font-bold tracking-tight hover:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
            >
              Mini App
            </Link>
          </nav>
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#292524] font-mono bg-[#ffffff] px-2.5 py-1 rounded-full border border-[#d8cbbe]">
            <span className="w-2 h-2 rounded-full bg-[#166534] inline-block animate-pulse" />
            <span className="font-semibold text-[11px]">API :8000</span>
          </div>

          <Link
            href="/login"
            className="text-xs font-bold text-[#292524] hover:text-[#1c1917] px-3 sm:px-3.5 py-1.5 rounded-[9px] border border-[#d8cbbe] hover:border-[#1c1917] bg-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="text-xs font-bold text-white bg-[#1c1917] hover:bg-[#85290c] px-3.5 sm:px-4 py-1.5 rounded-[11px] border border-[#1c1917] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
          >
            Register
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[#d8cbbe] text-[#292524] hover:bg-[#f3ebe0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="block w-4 h-0.5 bg-[#1c1917] mb-1" />
            <span className="block w-4 h-0.5 bg-[#1c1917] mb-1" />
            <span className="block w-4 h-0.5 bg-[#1c1917]" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden border-t border-[#d8cbbe] bg-[#fbf7ee] px-4 py-4 space-y-2 font-bold text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#292524] hover:text-[#1c1917]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/miniapp"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-block mt-2 px-3 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#b45309] text-xs font-mono font-bold"
          >
            Telegram Mini App
          </Link>
        </div>
      )}
    </header>
  );
};
