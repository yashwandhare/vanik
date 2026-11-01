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
    <header className="border-b-[1.5px] border-[#DDD0B8] bg-[#FAF5E8]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Emblem */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0F5B57] border border-[#1C181A] ring-2 ring-[#EAA82C]/40 inline-block group-hover:scale-110 transition-transform shadow-xs shrink-0" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1C181A] uppercase font-['Space_Grotesk'] whitespace-nowrap">
              VANIK
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#F5EBD7] text-[#262022] border border-[#DDD0B8] font-bold whitespace-nowrap">
              B2B A2A
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav Links (Visible on lg screens and up) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-bold text-[#262022]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`h-9 px-3 rounded-lg inline-flex items-center justify-center transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] ${
                  isActive
                    ? 'bg-[#0F5B57] text-white font-bold shadow-2xs'
                    : 'text-[#5E4E40] hover:text-[#1C181A] hover:bg-[#F5EBD7]'
                }`}
              >
                <span className="hidden xl:inline">{link.label}</span>
                <span className="xl:hidden">{link.shortLabel}</span>
              </Link>
            );
          })}
          <Link
            href="/miniapp"
            className={`h-8 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-mono font-bold tracking-tight border transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] ${
              pathname === '/miniapp'
                ? 'bg-[#0F5B57] text-white border-[#0F5B57]'
                : 'bg-[#F7CE58] text-[#1C181A] border-[#EAA82C] hover:brightness-105'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F5B57] inline-block animate-pulse shrink-0" />
            <span>Mini App</span>
          </Link>
        </nav>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* API Health indicator (desktop only) */}
          <div className="hidden xl:inline-flex h-8 items-center gap-2 text-xs text-[#262022] font-mono bg-[#FFFDF9] px-3 rounded-full border border-[#DDD0B8] shadow-2xs select-none whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#0F5B57] inline-block animate-pulse shrink-0" />
            <span className="font-semibold text-[11px] whitespace-nowrap">API :8000</span>
          </div>

          {sessionUser ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex h-9 items-center text-xs font-mono font-semibold text-[#0F5B57] bg-[#C5EDB1]/50 border border-[#0F5B57]/40 px-3 rounded-full max-w-[150px] truncate whitespace-nowrap">
                {sessionUser.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 px-3.5 rounded-xl inline-flex items-center justify-center text-xs font-bold text-[#D9381E] hover:bg-[#F8CBD6] border border-[#D9381E]/40 bg-[#FFFDF9] transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex h-9 items-center justify-center text-xs font-bold text-[#262022] hover:text-[#1C181A] px-4 rounded-xl border border-[#DDD0B8] hover:border-[#1C181A] bg-[#FFFDF9] transition-all active:scale-95 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="h-9 px-4 rounded-xl inline-flex items-center justify-center text-xs font-bold text-white bg-[#1C181A] hover:bg-[#0F5B57] border border-[#1C181A] transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[#DDD0B8] bg-[#FFFDF9] text-[#1C181A] hover:bg-[#F5EBD7] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
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
        <div id="mobile-nav-drawer" className="lg:hidden border-t border-[#DDD0B8] bg-[#FAF5E8]/98 backdrop-blur-md px-4 py-4 space-y-3 font-bold text-sm shadow-md">
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
                      ? 'bg-[#0F5B57] text-white shadow-2xs font-extrabold'
                      : 'text-[#262022] hover:bg-[#F5EBD7]'
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
            className="h-11 px-4 rounded-xl flex items-center justify-between bg-[#F7CE58] border border-[#EAA82C] text-[#1C181A] font-bold text-xs font-mono shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F5B57] animate-pulse" />
              Telegram Mini App
            </span>
            <span>@vanik_bot →</span>
          </Link>

          {/* Mobile Auth actions */}
          <div className="pt-2 border-t border-[#DDD0B8] flex items-center gap-2">
            {sessionUser ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-mono text-[#0F5B57] truncate max-w-[200px]">
                  {sessionUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-xl border border-[#D9381E] text-[#D9381E] text-xs font-bold bg-[#FFFDF9]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 h-9 inline-flex items-center justify-center rounded-xl border border-[#DDD0B8] bg-[#FFFDF9] text-[#262022] font-bold text-xs"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 h-9 inline-flex items-center justify-center rounded-xl bg-[#1C181A] text-white font-bold text-xs"
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
