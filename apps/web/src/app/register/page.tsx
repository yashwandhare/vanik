'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { BusinessRole, ErrorEnvelope, PrincipalResponse, UserResponse } from '../../lib/types';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // User credentials
  const [email, setEmail] = useState('ganesh.kirana@example.com');
  const [password, setPassword] = useState('KiranaSecureDemo2026!');
  const [phone, setPhone] = useState('+919876543210');

  // Business Principal
  const [legalName, setLegalName] = useState('Shree Ganesh Enterprises Pvt Ltd');
  const [tradeName, setTradeName] = useState('Shree Ganesh Kirana');
  const [businessType, setBusinessType] = useState('retail_grocery');
  const [address, setAddress] = useState('Shop 12, Market Yard, Gultekdi, Pune 411037');
  const [roles, setRoles] = useState<BusinessRole[]>(['buyer']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);
  const [userRes, setUserRes] = useState<UserResponse | null>(null);
  const [principalRes, setPrincipalRes] = useState<PrincipalResponse | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.register({ email, password, phone });
      setUserRes(res.data);
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.createPrincipal({
        legal_name: legalName,
        trade_name: tradeName,
        business_type: businessType,
        address,
        roles,
      });
      setPrincipalRes(res.data);
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'client-error',
        });
      } else {
        setError(err instanceof Error ? err.message : 'Principal creation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (r: BusinessRole) => {
    if (roles.includes(r)) {
      if (roles.length > 1) {
        setRoles(roles.filter((item) => item !== r));
      }
    } else {
      setRoles([...roles, r]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Register Business Principal</h1>
        <p className="text-xs text-slate-400">
          Step {step} of 3 • Establish human identity and verified business principal profile
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between max-w-md mx-auto text-xs font-medium">
        <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-400' : 'text-slate-600'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
          <span>User Account</span>
        </div>
        <div className="h-0.5 flex-1 mx-2 bg-slate-800" />
        <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-400' : 'text-slate-600'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
          <span>Business Profile</span>
        </div>
        <div className="h-0.5 flex-1 mx-2 bg-slate-800" />
        <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
          <span>Verification</span>
        </div>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <h2 className="text-base font-semibold text-white">Create Human Account</h2>
            <p className="text-xs text-slate-400">
              Account identity is separated from business principal identity.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Synthetic)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm transition-colors shadow-md"
              >
                {loading ? 'Creating Account...' : 'Continue to Business Profile'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <h2 className="text-base font-semibold text-white">Business Principal Information</h2>
            <p className="text-xs text-slate-400">
              Enter your enterprise details. In this demo environment, verification is synthetic.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Legal Registered Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Trade Name (Display)</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Business Type</label>
                <input
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Marketplace Roles</label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleRole('buyer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      roles.includes('buyer')
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRole('seller')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      roles.includes('seller')
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Seller
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm transition-colors shadow-md"
              >
                {loading ? 'Registering Principal...' : 'Submit & Simulate Verification'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && principalRes && (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                  Registration Complete
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold uppercase">
                  DEMO VERIFIED
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{principalRes.legal_name}</h3>
                <p className="text-xs text-slate-400">Trade: {principalRes.trade_name || principalRes.legal_name}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-emerald-900/40 pt-4 font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">Principal ID:</span>
                  <span className="text-slate-200 break-all">{principalRes.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">User Account:</span>
                  <span className="text-slate-200">{userRes?.email || email}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Next Steps for Principal
              </h4>
              <p className="text-xs text-slate-400">
                You can now spawn persistent AI agent representatives under this principal, assign them Ed25519 cryptographic signing identities, and publish task mandates.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/agents"
                className="flex-1 text-center py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md"
              >
                Create & View Agent Passports →
              </Link>
              <Link
                href="/catalogue"
                className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
