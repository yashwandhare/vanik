'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { BusinessRole, ErrorEnvelope, PrincipalResponse, UserResponse } from '../../lib/types';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // User credentials (FR-REG-01)
  const [displayName, setDisplayName] = useState('Ganesh Sharma');
  const [email, setEmail] = useState('ganesh.kirana@example.com');
  const [password, setPassword] = useState('KiranaSecureDemo2026!');

  // Business Principal (FR-REG-02)
  const [legalName, setLegalName] = useState('Shree Ganesh Enterprises Pvt Ltd');
  const [tradeName, setTradeName] = useState('Shree Ganesh Kirana');
  const [businessType, setBusinessType] = useState('retail_grocery');
  const [address, setAddress] = useState('Shop 12, Market Yard, Gultekdi, Pune 411037');
  const [contactEmail, setContactEmail] = useState('ganesh.kirana@example.com');
  const [roles, setRoles] = useState<BusinessRole[]>(['buyer']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);
  const [userRes, setUserRes] = useState<UserResponse | null>(null);
  const [principalRes, setPrincipalRes] = useState<PrincipalResponse | null>(null);

  // Step 3 Synthetic Verification State
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.register({
        email,
        password,
        display_name: displayName,
      });
      setUserRes(res.data);

      // Auto-authenticate with the newly created account to establish session cookie and CSRF token
      await apiClient.login({ email, password });

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
        contact_email: contactEmail || email,
        roles,
      });
      setPrincipalRes(res.data);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vanik_principal_id', res.data.id);
      }

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

  const handlePerformSyntheticVerification = async () => {
    if (!principalRes) return;
    setVerifying(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      // 1. Record synthetic business identifier
      await apiClient.addBusinessIdentifier(principalRes.id, {
        identifier_type: 'pan',
        value: 'ABCDE1234F',
        is_synthetic: true,
      });

      // 2. Execute demo verification against backend
      const verifyRes = await apiClient.verifyPrincipalDemo(principalRes.id);

      setPrincipalRes({
        ...principalRes,
        verification_status: verifyRes.data.verification_status,
      });
      setVerificationSuccess(`Principal authority cryptographically sealed under label "${verifyRes.data.label}".`);
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
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
          <span className="font-mono text-xs uppercase tracking-widest text-[#8C7E70] font-bold">
            [ ONBOARDING GATEWAY ]
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1A1C] tracking-tight">
            Register Business Principal
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5A4B]">
            Step {step} of 3 • Establish human identity and enterprise principal authority
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between max-w-sm mx-auto text-xs font-mono font-bold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#1E1A1C]' : 'text-[#8C7E70]'}`}>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#1E1A1C] ${
                step >= 1 ? 'bg-[#BCDFB0] text-[#0E4A47]' : 'bg-[#FFFAF0] text-[#8C7E70]'
              }`}
            >
              1
            </span>
            <span>Account</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[#CDBB98]" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#1E1A1C]' : 'text-[#8C7E70]'}`}>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#1E1A1C] ${
                step >= 2 ? 'bg-[#BCDFB0] text-[#0E4A47]' : 'bg-[#FFFAF0] text-[#8C7E70]'
              }`}
            >
              2
            </span>
            <span>Principal</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[#CDBB98]" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#0E4A47]' : 'text-[#8C7E70]'}`}>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border border-[#1E1A1C] ${
                step >= 3 ? 'bg-[#0E4A47] text-white' : 'bg-[#FFFAF0] text-[#8C7E70]'
              }`}
            >
              3
            </span>
            <span>Status</span>
          </div>
        </div>

        {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

        <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#1E1A1C]">Create Human Account</h2>
                <p className="text-xs text-[#6B5A4B] mt-0.5">
                  Human credentials are authenticated separately from business principal identity.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-display-name"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Display Name
                </label>
                <input
                  id="reg-display-name"
                  type="text"
                  required
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Password (min 12 characters)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-[12px] bg-[#2A2224] hover:bg-[#1E1A1C] disabled:bg-[#8C7E70] text-white font-bold text-xs border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  {loading ? 'Creating Account & Starting Session...' : 'Continue to Business Profile →'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#1E1A1C]">Business Principal Profile</h2>
                <p className="text-xs text-[#6B5A4B] mt-0.5">
                  Enter commercial entity details. Official checks are synthesized via local demo verification.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-legal-name"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Legal Registered Name
                </label>
                <input
                  id="reg-legal-name"
                  type="text"
                  required
                  maxLength={120}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-trade-name"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Trade Display Name
                </label>
                <input
                  id="reg-trade-name"
                  type="text"
                  required
                  maxLength={120}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-biz-type"
                    className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                  >
                    Business Type
                  </label>
                  <input
                    id="reg-biz-type"
                    type="text"
                    required
                    maxLength={80}
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-contact-email"
                    className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                  >
                    Contact Email
                  </label>
                  <input
                    id="reg-contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold">
                  Marketplace Roles
                </label>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleRole('buyer')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
                      roles.includes('buyer')
                        ? 'bg-[#BCDFB0] text-[#0E4A47] border-[#1E1A1C]'
                        : 'bg-[#F6EDD9] text-[#6B5A4B] border-[#CDBB98]'
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRole('seller')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
                      roles.includes('seller')
                        ? 'bg-[#D4C2E6] text-[#C8472F] border-[#1E1A1C]'
                        : 'bg-[#F6EDD9] text-[#6B5A4B] border-[#CDBB98]'
                    }`}
                  >
                    Seller
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-address"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  Registered Commercial Address
                </label>
                <textarea
                  id="reg-address"
                  rows={2}
                  required
                  maxLength={500}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-[9px] bg-[#FFFAF0] hover:bg-[#EDE0C4] text-[#2A2224] text-xs font-semibold border border-[#CDBB98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-[12px] bg-[#2A2224] hover:bg-[#1E1A1C] disabled:bg-[#8C7E70] text-white font-bold text-xs border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  {loading ? 'Registering Principal...' : 'Register Principal & Continue →'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && principalRes && (
            <div className="space-y-6">
              <div className="p-6 bg-[#F6EDD9] border-[1.5px] border-[#1E1A1C] rounded-[20px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-extrabold text-[#1E1A1C] tracking-wider">
                    Principal Created
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full border border-[#1E1A1C] text-xs font-mono font-bold uppercase ${
                      principalRes.verification_status === 'demo_verified'
                        ? 'bg-[#BCDFB0] text-[#0E4A47]'
                        : 'bg-[#EDE0C4] text-[#6B5A4B]'
                    }`}
                  >
                    {principalRes.verification_status === 'demo_verified'
                      ? 'DEMO VERIFIED'
                      : 'NOT SUBMITTED (PENDING VERIFICATION)'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-[#1E1A1C]">{principalRes.legal_name}</h3>
                  <p className="text-xs text-[#6B5A4B]">
                    Trade: <span className="font-bold text-[#1E1A1C]">{principalRes.trade_name}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-[#CDBB98] pt-4 font-mono">
                  <div>
                    <span className="text-[#8C7E70] block text-[10px] uppercase font-bold">Principal ID:</span>
                    <span className="text-[#1E1A1C] font-bold break-all select-all">{principalRes.id}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7E70] block text-[10px] uppercase font-bold">Owner Account:</span>
                    <span className="text-[#1E1A1C] font-bold">{userRes?.email || email}</span>
                  </div>
                </div>
              </div>

              {/* Real Demo Verification Action */}
              {principalRes.verification_status !== 'demo_verified' && (
                <div className="p-5 bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[18px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase font-bold text-[#0E4A47]">
                      [ COMPLIANCE STEP REQUIRED ]
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#BCDFB0] text-[#0E4A47] font-bold border border-[#1E1A1C]">
                      SIMULATED / DEMO
                    </span>
                  </div>
                  <p className="text-xs text-[#6B5A4B] leading-relaxed">
                    VANIK principals require compliance verification before agent delegation. Run the local synthetic demo verifier to test the real backend verification pipeline.
                  </p>

                  {verificationError && (
                    <div className="p-3 bg-[#F2B6C4] border border-[#1E1A1C] rounded-[9px] text-xs text-[#C8472F] font-mono">
                      ✕ {verificationError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePerformSyntheticVerification}
                    disabled={verifying}
                    className="w-full py-2.5 px-4 rounded-[11px] bg-[#0E4A47] hover:bg-[#093432] disabled:bg-[#8C7E70] text-white font-bold text-xs border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                  >
                    {verifying ? 'Submitting Synthetic PAN & Verifying...' : 'Execute Synthetic Demo Verification →'}
                  </button>
                </div>
              )}

              {verificationSuccess && (
                <div className="p-4 bg-[#BCDFB0]/30 border border-[#0E4A47] rounded-[14px] text-xs text-[#0E4A47] font-mono font-bold">
                  ✓ {verificationSuccess}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/principals?principalId=${principalRes.id}`}
                  className="flex-1 text-center py-3 px-4 rounded-[12px] bg-[#2A2224] hover:bg-[#1E1A1C] text-white font-bold text-xs border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  View Principal Profile →
                </Link>
                <Link
                  href={`/agents?principalId=${principalRes.id}`}
                  className="py-3 px-4 rounded-[9px] bg-[#FFFAF0] hover:bg-[#EDE0C4] text-[#2A2224] text-xs font-semibold border border-[#CDBB98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  Agent Passports
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
