'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ email: string } | null>(null);

  const navLinks = [
    { href: '/', label: 'Overview', shortLabel: 'Overview' },
    { href: '/catalogue', label: 'Catalogue & Sellers', shortLabel: 'Catalogue' },
    { href: '/seller', label: 'Seller Workspace', shortLabel: 'Sellers' },
    { href: '/negotiations', label: 'Negotiations', shortLabel: 'Negotiations' },
    { href: '/principals', label: 'Principals', shortLabel: 'Principals' },
    { href: '/agents', label: 'Agent Passports', shortLabel: 'Passports' },
  ];

  useEffect(() => {
    let mounted = true;
    apiClient
      .getSession()
      .then((res) => {
        if (mounted && res?.data?.user) {
          setSessionUser({ email: res.data.user.email });
        }
      })
      .catch(() => {
        if (mounted) setSessionUser(null);
      });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setSessionUser(null);
      window.location.href = '/login';
    } catch {
      setSessionUser(null);
    }
  };

  return (
    <header className="border-b-[1.5px] border-[#CDBB98] bg-[#F6EDD9]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0E4A47] border border-[#1E1A1C] ring-2 ring-[#E2A93B]/50 inline-block group-hover:scale-110 transition-transform shadow-xs shrink-0" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1E1A1C] uppercase font-['Space_Grotesk'] whitespace-nowrap">
              VANIK
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] font-bold whitespace-nowrap">
              B2B A2A
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav Links (Visible on lg screens and up) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-bold text-[#2A2224]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`h-9 px-3 rounded-lg inline-flex items-center justify-center transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4A47] ${
                  isActive
                    ? 'bg-[#0E4A47] text-white font-bold shadow-2xs'
                    : 'text-[#6B5A4B] hover:text-[#1E1A1C] hover:bg-[#EDE0C4]'
                }`}
              >
                <span className="hidden xl:inline">{link.label}</span>
                <span className="xl:hidden">{link.shortLabel}</span>
              </Link>
            );
          })}
          <Link
            href="/miniapp"
            className={`h-8.5 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-mono font-bold tracking-tight border transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4A47] ${
              pathname === '/miniapp'
                ? 'bg-[#0E4A47] text-white border-[#0E4A47]'
                : 'bg-[#F2C85B] text-[#1E1A1C] border-[#E2A93B] hover:brightness-105'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E4A47] inline-block animate-pulse shrink-0" />
            <span className="whitespace-nowrap">Mini App</span>
          </Link>
        </nav>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* API Health indicator (desktop only) */}
          <div className="hidden xl:inline-flex h-8.5 items-center gap-2 text-xs text-[#2A2224] font-mono bg-[#FFFAF0] px-3 rounded-full border border-[#CDBB98] shadow-2xs select-none whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#0E4A47] inline-block animate-pulse shrink-0" />
            <span className="font-semibold text-[11px] whitespace-nowrap">API :8000</span>
          </div>

          {sessionUser ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex h-9 items-center text-xs font-mono font-semibold text-[#0E4A47] bg-[#BCDFB0]/50 border border-[#0E4A47]/40 px-3 rounded-full max-w-[150px] truncate whitespace-nowrap">
                {sessionUser.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 px-3.5 rounded-xl inline-flex items-center justify-center text-xs font-bold text-[#C8472F] hover:bg-[#F2B6C4] border border-[#C8472F]/40 bg-[#FFFAF0] transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8472F]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex h-9 items-center justify-center text-xs font-bold text-[#2A2224] hover:text-[#1E1A1C] px-3.5 sm:px-4 rounded-xl border border-[#CDBB98] hover:border-[#1E1A1C] bg-[#FFFAF0] transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4A47]"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="h-9 px-4 sm:px-4.5 rounded-xl inline-flex items-center justify-center text-xs font-bold text-white bg-[#1E1A1C] hover:bg-[#0E4A47] border border-[#1E1A1C] transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4A47]"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[#CDBB98] bg-[#FFFAF0] text-[#1E1A1C] hover:bg-[#EDE0C4] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4A47]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="lg:hidden border-t border-[#CDBB98] bg-[#F6EDD9]/98 backdrop-blur-md px-4 py-4 space-y-3 font-bold text-sm shadow-md">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`h-11 px-4 rounded-xl flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#0E4A47] text-white shadow-2xs font-extrabold'
                      : 'text-[#2A2224] hover:bg-[#EDE0C4]'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="text-xs font-mono">●</span>}
                </Link>
              );
            })}
          </div>

          <Link
            href="/miniapp"
            onClick={() => setMobileMenuOpen(false)}
            className="h-11 px-4 rounded-xl flex items-center justify-between bg-[#F2C85B] border border-[#E2A93B] text-[#1E1A1C] font-bold text-xs font-mono shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0E4A47] animate-pulse" />
              Telegram Mini App
            </span>
            <span>@vanik_bot →</span>
          </Link>

          {/* Mobile Auth actions */}
          <div className="pt-2 border-t border-[#CDBB98] flex items-center gap-2">
            {sessionUser ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-mono text-[#0E4A47] truncate max-w-[200px]">
                  {sessionUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-xl border border-[#C8472F] text-[#C8472F] text-xs font-bold bg-[#FFFAF0]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 h-9 inline-flex items-center justify-center rounded-xl border border-[#CDBB98] bg-[#FFFAF0] text-[#2A2224] font-bold text-xs"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 h-9 inline-flex items-center justify-center rounded-xl bg-[#1E1A1C] text-white font-bold text-xs"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
