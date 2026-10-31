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
    (typeof window !== 'undefined' ? sessionStorage.getItem('vanik_principal_id') : null) ||
    '20000000-0000-4000-8000-000000000001';

  useEffect(() => {
    async function initPrincipal() {
      setLoading(true);
      setError(null);

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#c0c2a9] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
              [ LEGAL ENTITY REGISTRY ]
            </span>
            {isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#edeee1] text-[#202020] border border-[#c0c2a9] font-bold">
                FIXTURE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">
            Business Principal Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#5a5a4f]">
            Root legal identity owning agent representatives, commercial policies, and cryptographic authority.
          </p>
        </div>

        <Link
          href={`/agents?principalId=${principal?.id || resolvedPrincipalId}`}
          className="px-4 py-2 bg-[#202020] hover:bg-[#000000] text-white rounded-[11px] text-xs font-bold border border-[#000000] transition-all shadow-sm self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000]"
        >
          Manage Agent Passports →
        </Link>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-16 text-[#7c7d76] text-sm font-mono animate-pulse">
          Loading principal credentials...
        </div>
      ) : principal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight">{principal.legal_name}</h2>
                  <p className="text-xs text-[#5a5a4f]">
                    Trade Name: <span className="text-[#000000] font-bold">{principal.trade_name}</span>
                  </p>
                </div>
                <span
                  className={`px-3 py-0.5 border border-[#000000] text-xs font-mono font-bold rounded-full uppercase ${
                    principal.verification_status === 'demo_verified'
                      ? 'bg-[#aafdc0] text-[#003d21]'
                      : 'bg-[#ffc0e6] text-[#3f0929]'
                  }`}
                >
                  {principal.verification_status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#c0c2a9] text-xs">
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Principal ID</span>
                  <code className="text-[#000000] font-mono text-[11px] font-bold select-all break-all">{principal.id}</code>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Business Type</span>
                  <span className="text-[#000000] font-bold capitalize">{principal.business_type}</span>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Registered Address</span>
                  <span className="text-[#202020] font-medium">{principal.address}</span>
                </div>
                <div className="bg-[#f8f9eb] p-3 rounded-[12px] border border-[#c0c2a9]">
                  <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1">Contact Email</span>
                  <span className="text-[#000000] font-mono font-bold">{principal.contact_email}</span>
                </div>
              </div>

              <div>
                <span className="text-[#7c7d76] block uppercase tracking-wider text-[10px] font-mono mb-1 font-bold">Marketplace Roles</span>
                <div className="flex gap-1.5 mt-0.5">
                  {principal.roles.map((r) => (
                    <span
                      key={r}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-[#000000] ${
                        r === 'buyer'
                          ? 'bg-[#aafdc0] text-[#003d21]'
                          : 'bg-[#b0f4ff] text-[#041668]'
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Synthetic Compliance & Verification Module (FR-REG-03) */}
            <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs uppercase font-extrabold text-[#003d21] tracking-wider block">
                    [ SYNTHETIC VERIFICATION PORTAL ]
                  </span>
                  <h3 className="text-lg font-extrabold text-[#000000]">Business Identifier & Compliance Seal</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-[#aafdc0] text-[#003d21] text-[10px] font-mono font-bold border border-[#000000]">
                  SIMULATED / DEMO
                </span>
              </div>

              <p className="text-xs text-[#5a5a4f] leading-relaxed">
                Official PAN, GSTIN, and Udyam credentials are keyed digests for the prototype demonstration. Never enter real identity documents or personal credentials.
              </p>

              {/* Separated Success Notice */}
              {verificationSuccess && (
                <div className="p-3 bg-[#aafdc0]/30 border border-[#003d21] rounded-[10px] text-xs font-mono font-bold text-[#003d21]">
                  ✓ {verificationSuccess}
                </div>
              )}

              {/* Separated Error Notice */}
              {verificationError && (
                <div className="p-3 bg-[#ffc0e6] border border-[#000000] rounded-[10px] text-xs font-mono font-bold text-[#3f0929]">
                  ✕ {verificationError}
                </div>
              )}

              {/* Form to add synthetic identifier */}
              <form onSubmit={handleAddSyntheticIdentifier} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label
                    htmlFor="synthetic-id-type"
                    className="block text-[10px] font-mono uppercase text-[#7c7d76] font-bold mb-1"
                  >
                    Identifier Type
                  </label>
                  <select
                    id="synthetic-id-type"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as IdentifierType)}
                    className="w-full px-3 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000] focus-visible:border-transparent"
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
                    className="block text-[10px] font-mono uppercase text-[#7c7d76] font-bold mb-1"
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
                    className="w-full px-3 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs font-semibold text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000] focus-visible:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submittingId}
                    className="w-full py-2 px-3 rounded-[9px] bg-[#202020] hover:bg-[#000000] disabled:bg-[#7c7d76] text-white text-xs font-bold border border-[#000000] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000]"
                  >
                    {submittingId ? 'Recording...' : 'Add Identifier'}
                  </button>
                </div>
              </form>

              {identifierRes && (
                <div className="p-3 bg-[#aafdc0]/20 border border-[#003d21] rounded-[10px] text-xs font-mono flex items-center justify-between">
                  <span>
                    Type: <strong className="uppercase">{identifierRes.identifier_type}</strong> (Masked:{' '}
                    {identifierRes.masked_value})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#003d21]">[HASH PERSISTED]</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#c0c2a9] flex items-center justify-between">
                <span className="text-xs text-[#5a5a4f]">Seal Principal Authority via local demo verifier:</span>
                <button
                  type="button"
                  onClick={handleRunDemoVerification}
                  disabled={verifyingDemo || principal.verification_status === 'demo_verified'}
                  className="py-2 px-4 rounded-[11px] bg-[#003d21] hover:bg-[#002815] disabled:bg-[#c0c2a9] text-white text-xs font-bold border border-[#000000] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000]"
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
            <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[24px] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#000000] text-sm">Telegram Bot Linking</h3>
                <span className="text-[#041668] text-[10px] font-mono font-bold bg-[#b0f4ff] px-2 py-0.5 rounded border border-[#000000]">
                  FR-REG-04
                </span>
              </div>
              <p className="text-xs text-[#5a5a4f] leading-relaxed">
                Link your personal Telegram handle to receive cryptographic deal challenges, proactive deadline alerts, and agent progress notifications.
              </p>

              {telegramError && (
                <div className="p-3 bg-[#ffc0e6] border border-[#000000] rounded-[9px] text-xs text-[#3f0929] font-mono">
                  ✕ {telegramError}
                </div>
              )}

              {telegramCode ? (
                <div className="p-4 bg-[#b0f4ff]/40 border-[1.5px] border-[#000000] rounded-[14px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#041668] block font-mono font-bold">
                      Single-Use Linking Code:
                    </span>
                    {linkExpiresAt && (
                      <span className="text-[10px] font-mono text-[#5a5a4f]">
                        Expires: {new Date(linkExpiresAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="text-base font-mono font-extrabold text-[#000000] select-all text-center bg-[#ffffff] py-2 rounded-[8px] border border-[#000000]">
                    {telegramCode}
                  </div>
                  <p className="text-[11px] text-[#5a5a4f]">
                    Send <code className="text-[#000000] font-bold">/link {telegramCode}</code> to{' '}
                    <span className="text-[#000000] font-bold">@vanik_bot</span>. Valid for 10 minutes.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateTelegramCode}
                  disabled={linkLoading}
                  className="w-full py-2.5 px-4 rounded-[11px] bg-[#202020] hover:bg-[#000000] disabled:bg-[#7c7d76] text-white font-bold text-xs border border-[#000000] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000]"
                >
                  {linkLoading ? 'Requesting Code from API...' : 'Generate Telegram Link Code'}
                </button>
              )}
            </div>

            <div className="bg-[#ffffff] border border-[#c0c2a9] rounded-[20px] p-5 space-y-2 text-xs">
              <h4 className="font-bold text-[#000000] text-xs uppercase font-mono">
                [ PRINCIPAL AUTHORITY BOUNDARIES ]
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-[#5a5a4f] text-[11px]">
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
        <div className="vanik-container py-16 text-center text-[#7c7d76] text-sm font-mono animate-pulse">
          Loading principal registry...
        </div>
      }
    >
      <PrincipalsContent />
    </Suspense>
  );
}
