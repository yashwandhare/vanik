'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { ErrorEnvelope, SessionResponse } from '../../lib/types';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('DemoSecurePass123!');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);

  // Restore active session state on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await apiClient.getSession();
        setSession(res.data);
        setIsMock(res.isMock);
      } catch {
        // Not logged in or expired; stay on login form
      }
    }
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login({ email, password });
      setSession(res.data);
      setIsMock(res.isMock);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Unknown login error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.logout();
      setSession(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('vanik_principal_id');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vanik-container py-16 sm:py-20">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[#7D6F61] font-bold">
            [ HUMAN ACCESS PORTAL ]
          </span>
          <h1 className="text-3xl font-extrabold text-[#1C181A] tracking-tight">Sign In to VANIK</h1>
          <p className="text-xs sm:text-sm text-[#5E4E40]">
            Access your verified business principal authority and AI agent roster.
          </p>
        </div>

        <div className="bg-[#FFFDF9] border-[1.5px] border-[#1C181A] rounded-[24px] p-6 sm:p-8 shadow-sm space-y-6">
          {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

          {session ? (
            <div className="space-y-4">
              <div className="p-5 bg-[#C5EDB1]/30 border-[1.5px] border-[#1C181A] rounded-[18px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-extrabold text-[#0F5B57]">Session Active</span>
                  {isMock && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFDF9] text-[#1C181A] border border-[#1C181A] font-bold">
                      FIXTURE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#0F5B57] font-semibold">Authentication token verified.</p>
                <div className="text-[11px] font-mono text-[#262022] pt-2 border-t border-[#DDD0B8] space-y-1">
                  <div>User ID: <span className="font-bold select-all">{session.user.id}</span></div>
                  <div>User: <span className="font-bold">{session.user.display_name} ({session.user.email})</span></div>
                  <div>Expires: <span className="font-bold">{new Date(session.expires_at).toLocaleString()}</span></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/principals"
                  className="flex-1 text-center py-3 px-4 rounded-[12px] bg-[#262022] hover:bg-[#1C181A] text-white font-bold text-xs border border-[#1C181A] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
                >
                  Go to Business Principal →
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="py-3 px-4 rounded-[12px] bg-[#FFFDF9] hover:bg-[#F8CBD6] text-[#D9381E] border border-[#1C181A] text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-xs font-semibold text-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] focus-visible:border-transparent"
                  placeholder="owner@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-mono uppercase tracking-wider text-[#7D6F61] mb-1 font-bold"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF5E8] border border-[#DDD0B8] rounded-[9px] text-xs font-semibold text-[#1C181A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] focus-visible:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-[12px] bg-[#262022] hover:bg-[#1C181A] disabled:bg-[#7D6F61] text-white font-bold text-xs border border-[#1C181A] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57]"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-[#5E4E40]">
          Don&apos;t have a business principal yet?{' '}
          <Link href="/register" className="text-[#1C181A] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5B57] rounded">
            Register new enterprise
          </Link>
        </div>
      </div>
    </div>
  );
}
