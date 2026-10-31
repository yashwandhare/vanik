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
    <div className="vanik-container py-12 sm:py-16">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
            [ ONBOARDING GATEWAY ]
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">
            Register Business Principal
          </h1>
          <p className="text-xs sm:text-sm text-[#5a5a4f]">
            Step {step} of 3 • Establish human identity and enterprise principal authority
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between max-w-sm mx-auto text-xs font-mono font-bold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#000000]' : 'text-[#7c7d76]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#000000] ${step >= 1 ? 'bg-[#aafdc0] text-[#003d21]' : 'bg-[#ffffff] text-[#7c7d76]'}`}>1</span>
            <span>Account</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[#c0c2a9]" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#000000]' : 'text-[#7c7d76]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#000000] ${step >= 2 ? 'bg-[#aafdc0] text-[#003d21]' : 'bg-[#ffffff] text-[#7c7d76]'}`}>2</span>
            <span>Principal</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[#c0c2a9]" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#003d21]' : 'text-[#7c7d76]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#000000] ${step >= 3 ? 'bg-[#003d21] text-white' : 'bg-[#ffffff] text-[#7c7d76]'}`}>3</span>
            <span>Verified</span>
          </div>
        </div>

        {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

        <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#000000]">Create Human Account</h2>
                <p className="text-xs text-[#5a5a4f] mt-0.5">
                  Human credentials are authenticated separately from business principal identity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Phone Number (Synthetic)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-[12px] bg-[#202020] hover:bg-[#000000] disabled:bg-[#7c7d76] text-white font-bold text-xs border border-[#000000] transition-all shadow-sm"
                >
                  {loading ? 'Creating Account...' : 'Continue to Business Profile →'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#000000]">Business Principal Profile</h2>
                <p className="text-xs text-[#5a5a4f] mt-0.5">
                  Enter your commercial entity details. Official checks are synthesized via local demo verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Legal Registered Name</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Trade Display Name</label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Business Type</label>
                  <input
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Marketplace Roles</label>
                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleRole('buyer')}
                      className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border ${
                        roles.includes('buyer')
                          ? 'bg-[#aafdc0] text-[#003d21] border-[#000000]'
                          : 'bg-[#f8f9eb] text-[#5a5a4f] border-[#c0c2a9]'
                      }`}
                    >
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRole('seller')}
                      className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border ${
                        roles.includes('seller')
                          ? 'bg-[#b0f4ff] text-[#041668] border-[#000000]'
                          : 'bg-[#f8f9eb] text-[#5a5a4f] border-[#c0c2a9]'
                      }`}
                    >
                      Seller
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#7c7d76] mb-1 font-bold">Registered Commercial Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-[9px] bg-[#ffffff] hover:bg-[#edeee1] text-[#202020] text-xs font-semibold border border-[#c0c2a9]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-[12px] bg-[#202020] hover:bg-[#000000] disabled:bg-[#7c7d76] text-white font-bold text-xs border border-[#000000] transition-all shadow-sm"
                >
                  {loading ? 'Submitting...' : 'Register Principal & Seal →'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && principalRes && (
            <div className="space-y-6">
              <div className="p-6 bg-[#aafdc0]/30 border-[1.5px] border-[#000000] rounded-[20px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-extrabold text-[#003d21] tracking-wider">
                    Registration Successful
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#aafdc0] text-[#003d21] border border-[#000000] text-xs font-mono font-bold uppercase">
                    DEMO VERIFIED
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-[#000000]">{principalRes.legal_name}</h3>
                  <p className="text-xs text-[#5a5a4f]">Trade: <span className="font-bold text-[#000000]">{principalRes.trade_name || principalRes.legal_name}</span></p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-[#c0c2a9] pt-4 font-mono">
                  <div>
                    <span className="text-[#7c7d76] block text-[10px] uppercase font-bold">Principal ID:</span>
                    <span className="text-[#000000] font-bold break-all">{principalRes.id}</span>
                  </div>
                  <div>
                    <span className="text-[#7c7d76] block text-[10px] uppercase font-bold">Owner Account:</span>
                    <span className="text-[#000000] font-bold">{userRes?.email || email}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f8f9eb] rounded-[14px] border border-[#c0c2a9] text-xs text-[#5a5a4f] space-y-1">
                <span className="font-mono font-bold text-[#000000] text-xs uppercase block">
                  Next Steps for Principal:
                </span>
                <p className="leading-relaxed">
                  You can now spawn persistent AI agents under this principal, assign them Ed25519 cryptographic signing identities, and publish task mandates.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/agents"
                  className="flex-1 text-center py-3 px-4 rounded-[12px] bg-[#202020] hover:bg-[#000000] text-white font-bold text-xs border border-[#000000] transition-all shadow-sm"
                >
                  Create & View Agent Passports →
                </Link>
                <Link
                  href="/catalogue"
                  className="py-3 px-4 rounded-[9px] bg-[#ffffff] hover:bg-[#edeee1] text-[#202020] text-xs font-semibold border border-[#c0c2a9]"
                >
                  Browse Catalogue
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
