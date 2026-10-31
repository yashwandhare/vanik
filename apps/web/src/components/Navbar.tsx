'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/catalogue', label: 'Catalogue (40 SKU)' },
    { href: '/negotiations', label: 'Negotiations' },
    { href: '/principals', label: 'Principals' },
    { href: '/agents', label: 'Agent Passports' },
  ];

  return (
    <header className="border-b-[1.5px] border-[#c0c2a9] bg-[#f8f9eb]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="vanik-container h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-3.5 h-3.5 rounded-full bg-[#003d21] border border-[#000000] inline-block group-hover:scale-110 transition-transform" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tighter text-[#000000] uppercase">
              VANIK
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#edeee1] text-[#202020] border border-[#c0c2a9] font-bold">
              B2B A2A
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs sm:text-sm font-bold text-[#202020]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 ${
                    isActive
                      ? 'text-[#000000] border-b-2 border-[#003d21]'
                      : 'text-[#5a5a4f] hover:text-[#000000]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/miniapp"
              className="px-2.5 py-1 rounded-full bg-[#b0f4ff] text-[#041668] border border-[#000000] text-xs font-mono font-bold tracking-tight hover:brightness-95 transition-all"
            >
              Mini App
            </Link>
          </nav>
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#202020] font-mono bg-[#ffffff] px-2.5 py-1 rounded-full border border-[#c0c2a9]">
            <span className="w-2 h-2 rounded-full bg-[#003d21] inline-block animate-pulse" />
            <span className="font-semibold text-[11px]">API :8000</span>
          </div>

          <Link
            href="/login"
            className="text-xs font-bold text-[#202020] hover:text-[#000000] px-3 sm:px-3.5 py-1.5 rounded-[9px] border border-[#c0c2a9] hover:border-[#000000] bg-transparent transition-all"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="text-xs font-bold text-white bg-[#202020] hover:bg-[#000000] px-3.5 sm:px-4 py-1.5 rounded-[11px] border border-[#000000] transition-all shadow-sm"
          >
            Register
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[#c0c2a9] text-[#202020] hover:bg-[#edeee1]"
            aria-label="Toggle Menu"
          >
            <span className="block w-4 h-0.5 bg-[#000000] mb-1" />
            <span className="block w-4 h-0.5 bg-[#000000] mb-1" />
            <span className="block w-4 h-0.5 bg-[#000000]" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#c0c2a9] bg-[#f8f9eb] px-4 py-4 space-y-2 font-bold text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#202020] hover:text-[#000000]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/miniapp"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-block mt-2 px-3 py-1 rounded-full bg-[#b0f4ff] text-[#041668] border border-[#000000] text-xs font-mono font-bold"
          >
            Telegram Mini App
          </Link>
        </div>
      )}
    </header>
  );
};
