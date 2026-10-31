'use client';

import React, { useState } from 'react';
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

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to VANIK</h1>
        <p className="text-xs text-slate-400">
          Access your business principal and managed AI agent representatives.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

        {session ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-emerald-400">Authentication Active</span>
                {isMock && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    FIXTURE SESSION
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">Session successfully established.</p>
              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-emerald-900/40 space-y-1">
                <div>User ID: <span className="text-slate-300">{session.user_id}</span></div>
                <div>Session ID: <span className="text-slate-300">{session.session_id}</span></div>
                <div>Expires: <span className="text-slate-300">{new Date(session.expires_at).toLocaleString()}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/principals"
                className="w-full text-center py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
              >
                Go to Business Principal
              </Link>
              <button
                onClick={() => setSession(null)}
                className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="owner@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm transition-colors shadow-md"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="text-center text-xs text-slate-500">
        Don&apos;t have a business registered?{' '}
        <Link href="/register" className="text-indigo-400 hover:underline">
          Register new principal
        </Link>
      </div>
    </div>
  );
}
