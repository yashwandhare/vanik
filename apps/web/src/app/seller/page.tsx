'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type {
  ErrorEnvelope,
  InventoryLineResponse,
  SellerAgentSummary,
  SellerProfileResponse,
  SellerSummary,
} from '../../lib/types';

interface IncomingRFQ {
  rfqId: string;
  buyerPrincipalId: string;
  buyerTradeName: string;
  buyerAgentName: string;
  category: string;
  status: 'rfq_received' | 'quote_submitted' | 'deal_locked' | 'declined';
  deliveryDeadline: string;
  requestedCreditDays: number;
  lines: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  sellerQuote?: {
    totalQuote: string;
    unitPrices: Record<string, string>;
    creditOffered: string;
    deliveryDays: number;
  };
}

const SAMPLE_INCOMING_RFQS: IncomingRFQ[] = [
  {
    rfqId: 'rfq-kirana-diwali-01',
    buyerPrincipalId: '10000000-0000-4000-8000-000000000001',
    buyerTradeName: 'Shree Ganesh Kirana Store',
    buyerAgentName: 'Diwali Restock Autonomous Agent',
    category: 'procurement',
    status: 'rfq_received',
    deliveryDeadline: '3 Days (Prior to Dhanteras)',
    requestedCreditDays: 15,
    lines: [
      { sku: 'STP-RICE-BAS-5K', name: 'Basmati Rice 5 kg', quantity: 15, unit: 'bag' },
      { sku: 'OIL-MUST-1L', name: 'Mustard Oil 1 L', quantity: 24, unit: 'bottle' },
      { sku: 'DRY-CASHEW-500G', name: 'Premium W320 Cashews 500 g', quantity: 10, unit: 'pack' },
      { sku: 'SPC-TURM-500G', name: 'Salem Turmeric Powder 500 g', quantity: 20, unit: 'pack' },
    ],
  },
  {
    rfqId: 'rfq-kirana-diwali-02',
    buyerPrincipalId: '10000000-0000-4000-8000-000000000002',
    buyerTradeName: 'Aapla Kirana Bhandar',
    buyerAgentName: 'Kirana Autonomous Procurement Bot',
    category: 'procurement',
    status: 'quote_submitted',
    deliveryDeadline: '2 Days',
    requestedCreditDays: 7,
    lines: [
      { sku: 'STP-SUGAR-1K', name: 'Refined Sugar 1 kg', quantity: 50, unit: 'kg' },
      { sku: 'CONF-GULAB-1K', name: 'Gulab Jamun Festive Tin 1 kg', quantity: 15, unit: 'tin' },
    ],
    sellerQuote: {
      totalQuote: '₹4,850.00',
      unitPrices: { 'STP-SUGAR-1K': '₹42.00', 'CONF-GULAB-1K': '₹185.00' },
      creditOffered: 'Net 7 Days',
      deliveryDays: 2,
    },
  },
];

function SellerWorkspaceContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'rfqs' | 'policies'>('inventory');

  // Seller Discovery & Selection
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerSummary | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<SellerAgentSummary | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [sellersError, setSellersError] = useState<ErrorEnvelope | string | null>(null);

  // Live Inventory State
  const [inventoryItems, setInventoryItems] = useState<InventoryLineResponse[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState<ErrorEnvelope | string | null>(null);

  // Stock Edit Modal
  const [editingLine, setEditingLine] = useState<InventoryLineResponse | null>(null);
  const [stockInput, setStockInput] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [stockError, setStockError] = useState<ErrorEnvelope | string | null>(null);
  const [stockSuccess, setStockSuccess] = useState<string | null>(null);

  // Commercial Profile & Policies State
  const [profileData, setProfileData] = useState<SellerProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<ErrorEnvelope | string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isEditingPolicies, setIsEditingPolicies] = useState(false);
  const [deliveryDaysInput, setDeliveryDaysInput] = useState<number>(3);
  const [creditDaysInput, setCreditDaysInput] = useState<string>('7, 15');
  const [coverageInput, setCoverageInput] = useState<string>('Pune, Mumbai');
  const [deliveryTermsInput, setDeliveryTermsInput] = useState<string>('');
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('');
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Incoming RFQs State
  const [rfqs, setRfqs] = useState<IncomingRFQ[]>(SAMPLE_INCOMING_RFQS);
  const [rfqSuccess, setRfqSuccess] = useState<string | null>(null);

  // Modal references for accessibility
  const stockModalRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);

  // Restore session on mount
  useEffect(() => {
    apiClient.getSession().catch(() => {});
  }, []);

  // Fetch Sellers List
  useEffect(() => {
    async function fetchSellers() {
      setLoadingSellers(true);
      setSellersError(null);
      try {
        const res = await apiClient.listMarketplaceSellers({ limit: 50 });
        setSellers(res.data.items);

        // Pre-select from query param or first seller
        const paramSellerId = searchParams.get('sellerId') || searchParams.get('id');
        const match = paramSellerId
          ? res.data.items.find((s) => s.principal_id === paramSellerId)
          : res.data.items[0];

        if (match) {
          setSelectedSeller(match);
          if (match.agents && match.agents.length > 0) {
            setSelectedAgent(match.agents[0]);
          }
        }
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          setSellersError({
            code: err.code,
            message: err.message,
            details: err.details,
            request_id: err.requestId || 'sellers-error',
          });
        } else {
          setSellersError(err instanceof Error ? err.message : 'Failed to load sellers');
        }
      } finally {
        setLoadingSellers(false);
      }
    }
    fetchSellers();
  }, [searchParams]);

  // Fetch Inventory for Selected Seller & Agent
  const fetchInventory = useCallback(async () => {
    if (!selectedSeller || !selectedAgent) return;
    setLoadingInventory(true);
    setInventoryError(null);
    try {
      const res = await apiClient.getSellerInventory(
        selectedSeller.principal_id,
        selectedAgent.agent_id,
        { limit: 100 }
      );
      setInventoryItems(res.data.items);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setInventoryError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'inventory-error',
        });
      } else {
        setInventoryError(err instanceof Error ? err.message : 'Failed to load inventory');
      }
    } finally {
      setLoadingInventory(false);
    }
  }, [selectedSeller, selectedAgent]);

  // Fetch Profile & Policies for Selected Seller
  const fetchProfile = useCallback(async () => {
    if (!selectedSeller) return;
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await apiClient.getSellerProfile(selectedSeller.principal_id);
      setProfileData(res.data);
      setDeliveryDaysInput(res.data.seller.delivery_days);
      setCreditDaysInput(res.data.seller.credit_days.join(', '));
      setCoverageInput(res.data.seller.coverage.join(', '));
      const pol = res.data.public_policies || {};
      setDeliveryTermsInput(typeof pol.delivery_terms === 'string' ? pol.delivery_terms : '');
      setPaymentNoteInput(typeof pol.payment_note === 'string' ? pol.payment_note : '');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProfileError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'profile-error',
        });
      } else {
        setProfileError(err instanceof Error ? err.message : 'Failed to load seller profile');
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [selectedSeller]);

  useEffect(() => {
    if (selectedSeller && selectedAgent) {
      fetchInventory();
    }
    if (selectedSeller) {
      fetchProfile();
    }
  }, [selectedSeller, selectedAgent, fetchInventory, fetchProfile]);

  // Update Stock Quantity
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !selectedAgent || !editingLine) return;

    const parsedQty = parseFloat(stockInput);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setStockError('Stock quantity must be a non-negative number.');
      return;
    }

    setUpdatingStock(true);
    setStockError(null);
    setStockSuccess(null);

    try {
      const res = await apiClient.updateSellerInventory(
        selectedSeller.principal_id,
        selectedAgent.agent_id,
        {
          product_id: editingLine.product.id,
          stock_qty: parsedQty,
        }
      );

      setInventoryItems((prev) =>
        prev.map((item) =>
          item.product.id === editingLine.product.id
            ? { ...item, available_qty: res.data.available_qty }
            : item
        )
      );

      setStockSuccess(
        `Stock for ${editingLine.product.sku} successfully updated to ${res.data.available_qty} ${editingLine.product.unit}.`
      );
      setEditingLine(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setStockError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'stock-update-error',
        });
      } else {
        setStockError(err instanceof Error ? err.message : 'Failed to update stock quantity');
      }
    } finally {
      setUpdatingStock(false);
    }
  };

  // Update Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;

    setSavingPolicies(true);
    setProfileError(null);
    setProfileSuccess(null);

    const coverageArr = coverageInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const creditArr = creditDaysInput
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0);

    try {
      const res = await apiClient.updateSellerProfile(selectedSeller.principal_id, {
        coverage: coverageArr.length > 0 ? coverageArr : selectedSeller.coverage,
        delivery_days: Number(deliveryDaysInput) || 1,
        credit_days: creditArr,
        delivery_terms: deliveryTermsInput.trim() || undefined,
        payment_note: paymentNoteInput.trim() || undefined,
      });

      setProfileData(res.data);
      setSelectedSeller(res.data.seller);
      setProfileSuccess('Commercial policies and fulfillment terms successfully updated.');
      setIsEditingPolicies(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProfileError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'policy-update-error',
        });
      } else {
        setProfileError(err instanceof Error ? err.message : 'Failed to save policies');
      }
    } finally {
      setSavingPolicies(false);
    }
  };

  // Submit automated quote for an RFQ
  const handleGenerateQuote = (rfqId: string) => {
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.rfqId === rfqId) {
          return {
            ...r,
            status: 'quote_submitted',
            sellerQuote: {
              totalQuote: '₹34,500.00',
              unitPrices: {
                'STP-RICE-BAS-5K': '₹610.00',
                'OIL-MUST-1L': '₹165.00',
                'DRY-CASHEW-500G': '₹475.00',
                'SPC-TURM-500G': '₹140.00',
              },
              creditOffered: selectedSeller?.credit_days.includes(15)
                ? 'Net 15 Days'
                : 'Net 7 Days',
              deliveryDays: selectedSeller?.delivery_days || 3,
            },
          };
        }
        return r;
      })
    );
    setRfqSuccess(`Automated quotation generated and signed by agent ${selectedAgent?.name || 'Seller Agent'}.`);
  };

  // Focus trap for stock modal
  useEffect(() => {
    if (!editingLine) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingLine(null);
      if (e.key === 'Tab') {
        const controls = stockModalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (e.shiftKey && first && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && last && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => stockInputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [editingLine]);

  return (
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#CDBB98] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#0E4A47] font-bold">
              [ WHOLESALE SUPPLIER WORKSPACE ]
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F2C85B] text-[#1E1A1C] border border-[#E2A93B] font-bold shadow-2xs">
              AUTHORIZED SELLER CONSOLE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1A1C] tracking-tight">
            Wholesale Supplier Workspace & RFQ Engine
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5A4B] max-w-3xl">
            Manage on-hand inventory allocations, configure commercial mandi policies, review incoming buyer RFQs, and coordinate autonomous sales agent strategies.
          </p>
        </div>

        {/* Tab Controls */}
        <div
          role="tablist"
          aria-label="Seller workspace views"
          className="flex items-center bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-1 rounded-[14px] shadow-sm self-start sm:self-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-[10px] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'inventory'
                ? 'bg-[#1E1A1C] text-white shadow-sm'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Live Inventory ({inventoryItems.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'rfqs'}
            onClick={() => setActiveTab('rfqs')}
            className={`px-3.5 py-2 rounded-[10px] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'rfqs'
                ? 'bg-[#1E1A1C] text-white shadow-sm'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Incoming Buyer RFQs ({rfqs.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'policies'}
            onClick={() => setActiveTab('policies')}
            className={`px-3.5 py-2 rounded-[10px] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'policies'
                ? 'bg-[#1E1A1C] text-white shadow-sm'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Commercial Policies
          </button>
        </div>
      </div>

      {/* Seller Selector & Active Principal Card */}
      <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-5 rounded-[20px] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#0E4A47] inline-block" />
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                Active Seller Entity
              </span>
              <h2 className="text-lg font-extrabold text-[#1E1A1C]">
                {selectedSeller ? selectedSeller.trade_name : 'Loading Seller Principal...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="seller-select" className="text-xs font-mono font-bold text-[#8C7E70]">
              Switch Entity:
            </label>
            <select
              id="seller-select"
              value={selectedSeller?.principal_id || ''}
              onChange={(e) => {
                const found = sellers.find((s) => s.principal_id === e.target.value);
                if (found) {
                  setSelectedSeller(found);
                  if (found.agents && found.agents.length > 0) {
                    setSelectedAgent(found.agents[0]);
                  }
                }
              }}
              disabled={loadingSellers || sellers.length === 0}
              className="px-3 py-1.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
            >
              {sellers.map((s) => (
                <option key={s.principal_id} value={s.principal_id}>
                  {s.trade_name} ({s.verification_status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSeller && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#CDBB98] text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Principal ID</span>
              <span className="text-[11px] text-[#1E1A1C] truncate block" title={selectedSeller.principal_id}>
                {selectedSeller.principal_id}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Assigned Agent</span>
              <span className="text-xs font-bold text-[#0E4A47]">
                {selectedAgent?.name || 'Default Seller Agent'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Strategy Profile</span>
              <span className="text-xs font-semibold text-[#1E1A1C] capitalize">
                {selectedAgent?.strategy_profile || 'Margin'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Fulfillment Lead</span>
              <span className="text-xs font-bold text-[#0E4A47]">
                {selectedSeller.delivery_days} days
              </span>
            </div>
          </div>
        )}
      </div>

      {sellersError && <ErrorAlert error={sellersError} onDismiss={() => setSellersError(null)} />}
      {stockSuccess && (
        <div className="bg-[#BCDFB0] border border-[#0E4A47] rounded-[14px] p-3.5 text-[#0E4A47] text-xs font-bold flex items-center justify-between">
          <span>✓ {stockSuccess}</span>
          <button
            type="button"
            onClick={() => setStockSuccess(null)}
            className="text-[#0E4A47] hover:text-[#1E1A1C] font-mono text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: LIVE INVENTORY */}
      {activeTab === 'inventory' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-[#1E1A1C]">
                On-Hand Free-to-Sell Inventory Ledger
              </h3>
              <p className="text-xs text-[#6B5A4B]">
                Real-time stock quantities. Decrements automatically upon buyer contract reservation. Cannot reduce stock below active reservations (HTTP 409).
              </p>
            </div>
            <button
              type="button"
              onClick={fetchInventory}
              disabled={loadingInventory}
              className="px-3.5 py-1.5 bg-[#F6EDD9] hover:bg-[#EDE0C4] border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold text-[#1E1A1C]"
            >
              ↻ Refresh Stock
            </button>
          </div>

          {inventoryError && (
            <ErrorAlert error={inventoryError} onDismiss={() => setInventoryError(null)} />
          )}

          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-[#F6EDD9] text-[#1E1A1C] uppercase font-mono tracking-wider border-b-[1.5px] border-[#1E1A1C]">
                  <tr>
                    <th className="px-5 py-3.5">SKU Code</th>
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 font-mono text-right">Benchmark Price</th>
                    <th className="px-5 py-3.5 font-mono text-right">Free-to-Sell Qty</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CDBB98]">
                  {loadingInventory ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#6B5A4B] font-mono">
                        <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
                        Fetching live inventory ledger...
                      </td>
                    </tr>
                  ) : inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#6B5A4B]">
                        No inventory records discovered for this agent.
                      </td>
                    </tr>
                  ) : (
                    inventoryItems.map((line) => (
                      <tr key={line.product.id} className="hover:bg-[#F6EDD9]/60 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-[#1E1A1C]">
                          {line.product.sku}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#1E1A1C]">
                          {line.product.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-full text-[11px] font-mono capitalize text-[#2A2224]">
                            {line.product.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-right text-[#6B5A4B]">
                          ₹{line.product.benchmark_price}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-right font-extrabold text-[#0E4A47] text-sm">
                          {line.available_qty} {line.product.unit}s
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLine(line);
                              setStockInput(line.available_qty);
                              setStockError(null);
                            }}
                            className="px-3 py-1 bg-[#1E1A1C] hover:bg-[#0E4A47] text-white rounded-[7px] text-[11px] font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                          >
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#F6EDD9] border-t border-[#CDBB98] text-xs text-[#6B5A4B] flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono">
                Showing {inventoryItems.length} allocated commodity lines
              </span>
              <span className="font-mono text-[#8C7E70] text-[11px]">
                GET /v1/principals/{'{id}'}/agents/{'{agent_id}'}/inventory
              </span>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: INCOMING RFQS */}
      {activeTab === 'rfqs' && (
        <section className="space-y-6">
          {/* CRITICAL SECURITY BANNER: BUYER BUDGET PRIVACY */}
          <div className="bg-[#F2C85B] border-[1.5px] border-[#E2A93B] rounded-[18px] p-4 text-[#1E1A1C] text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold uppercase text-[11px] text-[#0E4A47]">
                🔒 MANDI FAIR BIDDING ENFORCEMENT • BUYER BUDGET PRIVACY
              </span>
            </div>
            <p className="leading-relaxed">
              In strict compliance with VANIK A2A protocols, <strong>buyer reservation budgets are strictly confidential and masked from all seller views</strong>. Sellers review trade requests based on SKU volume, delivery timeframe, and payment terms, ensuring genuine market pricing without predatory quote matching.
            </p>
          </div>

          {rfqSuccess && (
            <div className="bg-[#BCDFB0] border border-[#0E4A47] rounded-[14px] p-3.5 text-[#0E4A47] text-xs font-bold flex items-center justify-between">
              <span>✓ {rfqSuccess}</span>
              <button
                type="button"
                onClick={() => setRfqSuccess(null)}
                className="text-[#0E4A47] hover:text-[#1E1A1C] font-mono text-xs px-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="space-y-4">
            {rfqs.map((rfq) => (
              <div
                key={rfq.rfqId}
                className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[22px] p-6 shadow-sm space-y-5"
              >
                {/* RFQ Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#CDBB98] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0E4A47]">
                        {rfq.rfqId.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F6EDD9] text-[#2A2224] border border-[#CDBB98]">
                        {rfq.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#1E1A1C] mt-1">
                      {rfq.buyerTradeName}
                    </h3>
                    <p className="text-xs text-[#6B5A4B] font-mono">
                      Agent: {rfq.buyerAgentName} | Principal: {rfq.buyerPrincipalId}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-3 py-1 rounded-full uppercase font-bold border ${
                      rfq.status === 'quote_submitted'
                        ? 'bg-[#BCDFB0] text-[#0E4A47] border-[#0E4A47]'
                        : 'bg-[#F2C85B] text-[#1E1A1C] border-[#E2A93B]'
                    }`}
                  >
                    {rfq.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Terms Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98]">
                    <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                      Requested Delivery
                    </span>
                    <span className="font-bold text-[#1E1A1C]">{rfq.deliveryDeadline}</span>
                  </div>
                  <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98]">
                    <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                      Requested Credit
                    </span>
                    <span className="font-bold text-[#1E1A1C]">
                      {rfq.requestedCreditDays > 0 ? `Net ${rfq.requestedCreditDays} Days` : 'Cash on Delivery'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98]">
                    <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                      Buyer Budget Ceiling
                    </span>
                    <span className="font-mono text-[#8C7E70] font-bold">
                      [CONFIDENTIAL • MASKED]
                    </span>
                  </div>
                </div>

                {/* Requested SKU Items */}
                <div className="border border-[#1E1A1C] rounded-[14px] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6EDD9] font-mono uppercase text-[#1E1A1C] border-b border-[#1E1A1C]">
                      <tr>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Commodity Name</th>
                        <th className="px-4 py-2.5 text-right">Requested Qty</th>
                        {rfq.sellerQuote && (
                          <th className="px-4 py-2.5 text-right">Quoted Unit Price</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDBB98]">
                      {rfq.lines.map((line) => (
                        <tr key={line.sku} className="hover:bg-[#F6EDD9]/60">
                          <td className="px-4 py-2.5 font-mono font-bold text-[#1E1A1C]">{line.sku}</td>
                          <td className="px-4 py-2.5 text-[#1E1A1C]">{line.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-[#0E4A47]">
                            {line.quantity} {line.unit}s
                          </td>
                          {rfq.sellerQuote && (
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-[#0E4A47]">
                              {rfq.sellerQuote.unitPrices[line.sku] || '₹—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quote Status / Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {rfq.sellerQuote ? (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span>
                        Total Quote:{' '}
                        <strong className="text-sm font-extrabold text-[#0E4A47]">
                          {rfq.sellerQuote.totalQuote}
                        </strong>
                      </span>
                      <span>
                        Credit Offered: <strong>{rfq.sellerQuote.creditOffered}</strong>
                      </span>
                      <span>
                        Lead Time: <strong>{rfq.sellerQuote.deliveryDays} Days</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-[#6B5A4B]">
                      Review line quantities against live inventory stock before submitting.
                    </div>
                  )}

                  {rfq.status === 'rfq_received' && (
                    <button
                      type="button"
                      onClick={() => handleGenerateQuote(rfq.rfqId)}
                      className="px-4 py-2 bg-[#0E4A47] hover:bg-[#C8472F] text-white rounded-[10px] text-xs font-mono font-bold transition-all shadow-xs"
                    >
                      ⚡ Generate Agent Quote (Strategy: {selectedAgent?.strategy_profile || 'Margin'})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: POLICIES & PROFILE */}
      {activeTab === 'policies' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-[#1E1A1C]">
                Commercial Mandate & Fulfillment Policies
              </h3>
              <p className="text-xs text-[#6B5A4B]">
                Configure fulfillment lead times, credit options, regional delivery zones, and payment terms published to the marketplace.
              </p>
            </div>
            {!isEditingPolicies && (
              <button
                type="button"
                onClick={() => setIsEditingPolicies(true)}
                className="px-4 py-2 bg-[#1E1A1C] hover:bg-[#0E4A47] text-white rounded-[10px] text-xs font-mono font-bold transition-all"
              >
                ✎ Edit Policies
              </button>
            )}
          </div>

          {profileError && (
            <ErrorAlert error={profileError} onDismiss={() => setProfileError(null)} />
          )}

          {profileSuccess && (
            <div className="bg-[#BCDFB0] border border-[#0E4A47] rounded-[14px] p-3.5 text-[#0E4A47] text-xs font-bold flex items-center justify-between">
              <span>✓ {profileSuccess}</span>
              <button
                type="button"
                onClick={() => setProfileSuccess(null)}
                className="text-[#0E4A47] hover:text-[#1E1A1C] font-mono text-xs px-2"
              >
                ✕
              </button>
            </div>
          )}

          {loadingProfile ? (
            <div className="py-16 text-center font-mono text-xs text-[#6B5A4B] bg-[#FFFAF0] border border-[#1E1A1C] rounded-[20px]">
              <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
              Loading commercial policies...
            </div>
          ) : isEditingPolicies ? (
            <form
              onSubmit={handleSavePolicies}
              className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] p-6 space-y-5 shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="policy-delivery-days" className="block text-xs font-mono uppercase text-[#8C7E70] font-bold mb-1">
                    Fulfillment Lead Time (Days)
                  </label>
                  <input
                    id="policy-delivery-days"
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={deliveryDaysInput}
                    onChange={(e) => setDeliveryDaysInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                  />
                </div>

                <div>
                  <label htmlFor="policy-credit-days" className="block text-xs font-mono uppercase text-[#8C7E70] font-bold mb-1">
                    Accepted Credit Windows (Comma-separated days, e.g. 0, 7, 15)
                  </label>
                  <input
                    id="policy-credit-days"
                    type="text"
                    value={creditDaysInput}
                    onChange={(e) => setCreditDaysInput(e.target.value)}
                    placeholder="0, 7, 15"
                    className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="policy-coverage" className="block text-xs font-mono uppercase text-[#8C7E70] font-bold mb-1">
                  Delivery Supply Regions (Comma-separated)
                </label>
                <input
                  id="policy-coverage"
                  type="text"
                  required
                  value={coverageInput}
                  onChange={(e) => setCoverageInput(e.target.value)}
                  placeholder="Pune, Mumbai, Maharashtra"
                  className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-mono text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                />
              </div>

              <div>
                <label htmlFor="policy-delivery-terms" className="block text-xs font-mono uppercase text-[#8C7E70] font-bold mb-1">
                  Delivery Logistics & Unloading Terms
                </label>
                <input
                  id="policy-delivery-terms"
                  type="text"
                  value={deliveryTermsInput}
                  onChange={(e) => setDeliveryTermsInput(e.target.value)}
                  placeholder="Wholesale mandi truck dispatch within 48h of deal lock"
                  className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                />
              </div>

              <div>
                <label htmlFor="policy-payment-note" className="block text-xs font-mono uppercase text-[#8C7E70] font-bold mb-1">
                  Payment Policy / Settlement Terms
                </label>
                <input
                  id="policy-payment-note"
                  type="text"
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder="20% upfront via simulated escrow, balance upon mandi delivery inspection"
                  className="w-full px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPolicies(false)}
                  className="px-4 py-2 border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold text-[#1E1A1C] hover:bg-[#EDE0C4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicies}
                  className="px-5 py-2 bg-[#0E4A47] hover:bg-[#C8472F] text-white border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs"
                >
                  {savingPolicies ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Policies...
                    </>
                  ) : (
                    'Save Commercial Policies'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] p-6 space-y-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-center">
                <div className="p-4 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98]">
                  <span className="text-[10px] uppercase text-[#8C7E70] font-bold block mb-1">
                    Fulfillment Speed
                  </span>
                  <span className="text-base font-extrabold text-[#1E1A1C]">
                    {selectedSeller?.delivery_days} Days
                  </span>
                </div>
                <div className="p-4 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98]">
                  <span className="text-[10px] uppercase text-[#8C7E70] font-bold block mb-1">
                    Credit Windows
                  </span>
                  <span className="text-base font-extrabold text-[#1E1A1C]">
                    {selectedSeller?.credit_days.length
                      ? selectedSeller.credit_days.map((d) => `Net ${d}`).join(', ')
                      : 'Prepaid Only'}
                  </span>
                </div>
                <div className="p-4 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98]">
                  <span className="text-[10px] uppercase text-[#8C7E70] font-bold block mb-1">
                    Live Catalog SKUs
                  </span>
                  <span className="text-base font-extrabold text-[#0E4A47]">
                    {selectedSeller?.available_sku_count} Items
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block mb-1.5">
                  Supply Coverage Zones:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeller?.coverage.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] uppercase font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {profileData?.public_policies && (
                <div className="p-4 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98] space-y-2 text-xs">
                  {typeof profileData.public_policies.delivery_terms === 'string' && (
                    <div>
                      <span className="font-mono text-[10px] uppercase text-[#8C7E70] font-bold block">
                        Delivery Logistics:
                      </span>
                      <p className="text-[#1E1A1C] font-medium">{profileData.public_policies.delivery_terms}</p>
                    </div>
                  )}
                  {typeof profileData.public_policies.payment_note === 'string' && (
                    <div>
                      <span className="font-mono text-[10px] uppercase text-[#8C7E70] font-bold block">
                        Payment & Settlement Note:
                      </span>
                      <p className="text-[#1E1A1C] font-medium">{profileData.public_policies.payment_note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Stock Edit Modal */}
      {editingLine && selectedSeller && selectedAgent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-stock-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            ref={stockModalRef}
            className="w-full max-w-md bg-[#FFFAF0] border-[2px] border-[#1E1A1C] rounded-[24px] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E2A93B] font-bold block mb-1">
                  [ STOCK QUANTITY RECONCILIATION ]
                </span>
                <h3 id="seller-stock-dialog-title" className="text-xl font-extrabold text-[#1E1A1C]">
                  Update On-Hand Stock
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLine(null)}
                className="w-7 h-7 rounded-full border border-[#1E1A1C] flex items-center justify-center font-mono font-bold text-xs hover:bg-[#EDE0C4]"
                aria-label="Cancel stock update"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#F6EDD9] rounded-[12px] border border-[#CDBB98] space-y-1">
              <span className="font-mono text-xs font-bold text-[#1E1A1C] block">
                {editingLine.product.sku}
              </span>
              <span className="text-xs text-[#6B5A4B] block">
                {editingLine.product.name}
              </span>
              <span className="text-[11px] font-mono text-[#0E4A47] font-bold block">
                Current Available: {editingLine.available_qty} {editingLine.product.unit}s
              </span>
            </div>

            {stockError && (
              <ErrorAlert error={stockError} onDismiss={() => setStockError(null)} />
            )}

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label
                  htmlFor="seller-stock-qty-input"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  New Total Stock Quantity ({editingLine.product.unit}s)
                </label>
                <input
                  id="seller-stock-qty-input"
                  ref={stockInputRef}
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-sm font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                />
                <p className="text-[11px] text-[#6B5A4B] mt-1.5 leading-relaxed">
                  Total on-hand stock. Note: Cannot reduce stock below existing buyer reservations (HTTP 409 Conflict). Requires authenticated Owner/Admin/Operator role.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className="px-4 py-2 border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold text-[#1E1A1C] hover:bg-[#EDE0C4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStock}
                  className="px-5 py-2 bg-[#0E4A47] hover:bg-[#C8472F] text-white border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs"
                >
                  {updatingStock ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Stock Quantity'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense
      fallback={
        <div className="vanik-container py-16 text-center font-mono text-xs text-[#6B5A4B]">
          <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
          Loading Seller Workspace...
        </div>
      }
    >
      <SellerWorkspaceContent />
    </Suspense>
  );
}
