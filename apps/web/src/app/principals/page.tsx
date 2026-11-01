'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type { BusinessIdentifierResponse, DemoVerificationResponse, ErrorEnvelope, IdentifierType, PrincipalResponse } from '../../lib/types';

function PrincipalsContent() {
  const searchParams = useSearchParams();
  const [principal, setPrincipal] = useState<PrincipalResponse | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorEnvelope | string | null>(null);

  // Telegram Linking (FR-REG-04)
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Verification & Synthetic Identifiers (FR-REG-03)
  const [idType, setIdType] = useState<IdentifierType>('pan');
  const [idValue, setIdValue] = useState('ABCDE1234F');
  const [submittingId, setSubmittingId] = useState(false);
  const [verifyingDemo, setVerifyingDemo] = useState(false);
  const [identifierRes, setIdentifierRes] = useState<BusinessIdentifierResponse | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Determine target principal ID from search params, session storage, or default fallback
  const resolvedPrincipalId =
    searchParams.get('principalId') ||
    searchParams.get('id') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('vanik_principal_id') : null);

  useEffect(() => {
    async function initPrincipal() {
      setLoading(true);
      setError(null);
      if (!resolvedPrincipalId) {
        setPrincipal(null);
        setLoading(false);
        setError('No business principal selected. Register a business or open its profile link.');
        return;
      }

      // Restore session/CSRF state if active
      try {
        await apiClient.getSession();
      } catch {
        // Not logged in or expired session
      }

      try {
        const res = await apiClient.getPrincipal(resolvedPrincipalId);
        setPrincipal(res.data);
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
          setError(err instanceof Error ? err.message : 'Failed to load principal profile');
        }
      } finally {
        setLoading(false);
      }
    }

    initPrincipal();
  }, [resolvedPrincipalId]);

  const handleGenerateTelegramCode = async () => {
    setLinkLoading(true);
    setTelegramError(null);
    try {
      const res = await apiClient.startTelegramLink();
      setTelegramCode(res.data.link_code);
      setLinkExpiresAt(res.data.expires_at);
    } catch (err: unknown) {
      setTelegramCode(null);
      setTelegramError(
        err instanceof Error ? err.message : 'Failed to generate Telegram linking code from backend'
      );
    } finally {
      setLinkLoading(false);
    }
  };

  const handleAddSyntheticIdentifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principal) return;
    setSubmittingId(true);
    setVerificationSuccess(null);
    setVerificationError(null);

    try {
      const res = await apiClient.addBusinessIdentifier(principal.id, {
        identifier_type: idType,
        value: idValue,
        is_synthetic: true,
      });
      setIdentifierRes(res.data);
      setVerificationSuccess(
        `Synthetic ${idType.toUpperCase()} recorded (${res.data.masked_value}). Proceed to demo verification.`
      );
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Failed to record synthetic identifier');
    } finally {
      setSubmittingId(false);
    }
  };

  const handleRunDemoVerification = async () => {
    if (!principal) return;
    setVerifyingDemo(true);
    setVerificationSuccess(null);
    setVerificationError(null);

    try {
      const res: { data: DemoVerificationResponse } = await apiClient.verifyPrincipalDemo(principal.id);
      setPrincipal({
        ...principal,
        verification_status: res.data.verification_status,
      });
      setVerificationSuccess(`Principal verified under label "${res.data.label}".`);
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Demo verification failed');
    } finally {
      setVerifyingDemo(false);
    }
  };

  return (
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#CDBB98] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#8C7E70] font-bold">
              [ LEGAL ENTITY REGISTRY ]
            </span>
            {isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] font-bold">
                FIXTURE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1A1C] tracking-tight">
            Business Principal Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5A4B]">
            Root legal identity owning agent representatives, commercial policies, and cryptographic authority.
          </p>
        </div>

        <Link
          href={`/agents?principalId=${principal?.id || resolvedPrincipalId}`}
          className="px-4 py-2 bg-[#2A2224] hover:bg-[#1E1A1C] text-white rounded-[11px] text-xs font-bold border border-[#1E1A1C] transition-all shadow-sm self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
        >
          Manage Agent Passports →
        </Link>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-16 text-[#8C7E70] text-sm font-mono animate-pulse">
          Loading principal credentials...
        </div>
      ) : principal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-[#1E1A1C] tracking-tight">{principal.legal_name}</h2>
                  <p className="text-xs text-[#6B5A4B]">
                    Trade Name: <span className="text-[#1E1A1C] font-bold">{principal.trade_name}</span>
                  </p>
                </div>
                <span
                  className={`px-3 py-0.5 border border-[#1E1A1C] text-xs font-mono font-bold rounded-full uppercase ${
                    principal.verification_status === 'demo_verified'
                      ? 'bg-[#BCDFB0] text-[#0E4A47]'
                      : 'bg-[#F2B6C4] text-[#C8472F]'
                  }`}
                >
                  {principal.verification_status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#CDBB98] text-xs">
                <div className="bg-[#F6EDD9] p-3 rounded-[12px] border border-[#CDBB98]">
                  <span className="text-[#8C7E70] block uppercase tracking-wider text-[10px] font-mono mb-1">Principal ID</span>
                  <code className="text-[#1E1A1C] font-mono text-[11px] font-bold select-all break-all">{principal.id}</code>
                </div>
                <div className="bg-[#F6EDD9] p-3 rounded-[12px] border border-[#CDBB98]">
                  <span className="text-[#8C7E70] block uppercase tracking-wider text-[10px] font-mono mb-1">Business Type</span>
                  <span className="text-[#1E1A1C] font-bold capitalize">{principal.business_type}</span>
                </div>
                <div className="bg-[#F6EDD9] p-3 rounded-[12px] border border-[#CDBB98]">
                  <span className="text-[#8C7E70] block uppercase tracking-wider text-[10px] font-mono mb-1">Registered Address</span>
                  <span className="text-[#2A2224] font-medium">{principal.address}</span>
                </div>
                <div className="bg-[#F6EDD9] p-3 rounded-[12px] border border-[#CDBB98]">
                  <span className="text-[#8C7E70] block uppercase tracking-wider text-[10px] font-mono mb-1">Contact Email</span>
                  <span className="text-[#1E1A1C] font-mono font-bold">{principal.contact_email}</span>
                </div>
              </div>

              <div>
                <span className="text-[#8C7E70] block uppercase tracking-wider text-[10px] font-mono mb-1 font-bold">Marketplace Roles</span>
                <div className="flex gap-1.5 mt-0.5">
                  {principal.roles.map((r) => (
                    <span
                      key={r}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-[#1E1A1C] ${
                        r === 'buyer'
                          ? 'bg-[#BCDFB0] text-[#0E4A47]'
                          : 'bg-[#D4C2E6] text-[#C8472F]'
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Synthetic Compliance & Verification Module (FR-REG-03) */}
            <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs uppercase font-extrabold text-[#0E4A47] tracking-wider block">
                    [ SYNTHETIC VERIFICATION PORTAL ]
                  </span>
                  <h3 className="text-lg font-extrabold text-[#1E1A1C]">Business Identifier & Compliance Seal</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-[#BCDFB0] text-[#0E4A47] text-[10px] font-mono font-bold border border-[#1E1A1C]">
                  SIMULATED / DEMO
                </span>
              </div>

              <p className="text-xs text-[#6B5A4B] leading-relaxed">
                Official PAN, GSTIN, and Udyam credentials are keyed digests for the prototype demonstration. Never enter real identity documents or personal credentials.
              </p>

              {/* Separated Success Notice */}
              {verificationSuccess && (
                <div className="p-3 bg-[#BCDFB0]/30 border border-[#0E4A47] rounded-[10px] text-xs font-mono font-bold text-[#0E4A47]">
                  ✓ {verificationSuccess}
                </div>
              )}

              {/* Separated Error Notice */}
              {verificationError && (
                <div className="p-3 bg-[#F2B6C4] border border-[#1E1A1C] rounded-[10px] text-xs font-mono font-bold text-[#C8472F]">
                  ✕ {verificationError}
                </div>
              )}

              {/* Form to add synthetic identifier */}
              <form onSubmit={handleAddSyntheticIdentifier} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label
                    htmlFor="synthetic-id-type"
                    className="block text-[10px] font-mono uppercase text-[#8C7E70] font-bold mb-1"
                  >
                    Identifier Type
                  </label>
                  <select
                    id="synthetic-id-type"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as IdentifierType)}
                    className="w-full px-3 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                  >
                    <option value="pan">PAN (Permanent Account)</option>
                    <option value="gstin">GSTIN (Goods & Services Tax)</option>
                    <option value="udyam">Udyam Registration</option>
                    <option value="cin">CIN (Corporate Identity)</option>
                    <option value="llpin">LLPIN (Limited Liability)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="synthetic-id-value"
                    className="block text-[10px] font-mono uppercase text-[#8C7E70] font-bold mb-1"
                  >
                    Synthetic Value
                  </label>
                  <input
                    id="synthetic-id-value"
                    type="text"
                    required
                    value={idValue}
                    onChange={(e) => setIdValue(e.target.value)}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] focus-visible:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submittingId}
                    className="w-full py-2 px-3 rounded-[9px] bg-[#2A2224] hover:bg-[#1E1A1C] disabled:bg-[#8C7E70] text-white text-xs font-bold border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                  >
                    {submittingId ? 'Recording...' : 'Add Identifier'}
                  </button>
                </div>
              </form>

              {identifierRes && (
                <div className="p-3 bg-[#BCDFB0]/20 border border-[#0E4A47] rounded-[10px] text-xs font-mono flex items-center justify-between">
                  <span>
                    Type: <strong className="uppercase">{identifierRes.identifier_type}</strong> (Masked:{' '}
                    {identifierRes.masked_value})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#0E4A47]">[HASH PERSISTED]</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#CDBB98] flex items-center justify-between">
                <span className="text-xs text-[#6B5A4B]">Seal Principal Authority via local demo verifier:</span>
                <button
                  type="button"
                  onClick={handleRunDemoVerification}
                  disabled={verifyingDemo || principal.verification_status === 'demo_verified'}
                  className="py-2 px-4 rounded-[11px] bg-[#0E4A47] hover:bg-[#093432] disabled:bg-[#CDBB98] text-white text-xs font-bold border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  {verifyingDemo
                    ? 'Verifying...'
                    : principal.verification_status === 'demo_verified'
                    ? '✓ Demo Verified'
                    : 'Execute Demo Verification'}
                </button>
              </div>
            </div>
          </div>

          {/* Telegram Linking Card (FR-REG-04) */}
          <div className="space-y-6">
            <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[24px] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#1E1A1C] text-sm">Telegram Bot Linking</h3>
                <span className="text-[#C8472F] text-[10px] font-mono font-bold bg-[#D4C2E6] px-2 py-0.5 rounded border border-[#1E1A1C]">
                  FR-REG-04
                </span>
              </div>
              <p className="text-xs text-[#6B5A4B] leading-relaxed">
                Link your personal Telegram handle to receive cryptographic deal challenges, proactive deadline alerts, and agent progress notifications.
              </p>

              {telegramError && (
                <div className="p-3 bg-[#F2B6C4] border border-[#1E1A1C] rounded-[9px] text-xs text-[#C8472F] font-mono">
                  ✕ {telegramError}
                </div>
              )}

              {telegramCode ? (
                <div className="p-4 bg-[#D4C2E6]/40 border-[1.5px] border-[#1E1A1C] rounded-[14px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#C8472F] block font-mono font-bold">
                      Single-Use Linking Code:
                    </span>
                    {linkExpiresAt && (
                      <span className="text-[10px] font-mono text-[#6B5A4B]">
                        Expires: {new Date(linkExpiresAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="text-base font-mono font-extrabold text-[#1E1A1C] select-all text-center bg-[#FFFAF0] py-2 rounded-[8px] border border-[#1E1A1C]">
                    {telegramCode}
                  </div>
                  <p className="text-[11px] text-[#6B5A4B]">
                    Send <code className="text-[#1E1A1C] font-bold">/link {telegramCode}</code> to{' '}
                    <span className="text-[#1E1A1C] font-bold">@vanik_bot</span>. Valid for 10 minutes.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateTelegramCode}
                  disabled={linkLoading}
                  className="w-full py-2.5 px-4 rounded-[11px] bg-[#2A2224] hover:bg-[#1E1A1C] disabled:bg-[#8C7E70] text-white font-bold text-xs border border-[#1E1A1C] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                >
                  {linkLoading ? 'Requesting Code from API...' : 'Generate Telegram Link Code'}
                </button>
              )}
            </div>

            <div className="bg-[#FFFAF0] border border-[#CDBB98] rounded-[20px] p-5 space-y-2 text-xs">
              <h4 className="font-bold text-[#1E1A1C] text-xs uppercase font-mono">
                [ PRINCIPAL AUTHORITY BOUNDARIES ]
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-[#6B5A4B] text-[11px]">
                <li>AI agents inherit maximum constraints from this principal.</li>
                <li>Tasks narrow authority but can never exceed principal boundaries.</li>
                <li>Consequential transactions require cryptographic human sign-off.</li>
                <li>Telegram identity binds to this human account via digest tokens.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PrincipalsPage() {
  return (
    <Suspense
      fallback={
        <div className="vanik-container py-16 text-center text-[#8C7E70] text-sm font-mono animate-pulse">
          Loading principal registry...
        </div>
      }
    >
      <PrincipalsContent />
    </Suspense>
  );
}
