'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import type {
  ErrorEnvelope,
  InventoryLineResponse,
  ProductResponse,
  SellerAgentSummary,
  SellerProfileResponse,
  SellerSummary,
} from '../../lib/types';

const CATEGORIES = [
  { slug: 'all', label: 'All Categories' },
  { slug: 'staples', label: 'Staples' },
  { slug: 'edible_oils', label: 'Edible Oils' },
  { slug: 'dry_fruits', label: 'Dry Fruits' },
  { slug: 'confectionery', label: 'Confectionery' },
  { slug: 'spices', label: 'Spices' },
];

const COVERAGE_REGIONS = ['all', 'pune', 'mumbai', 'delhi', 'ahmedabad', 'bengaluru'];

export default function CataloguePage() {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'sellers'>('catalogue');

  // Catalogue State
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<ErrorEnvelope | string | null>(null);

  // Sellers State
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [totalSellers, setTotalSellers] = useState(0);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerCoverage, setSellerCoverage] = useState('all');
  const [maxDeliveryDays, setMaxDeliveryDays] = useState('');
  const [minCreditDays, setMinCreditDays] = useState('');
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [sellersError, setSellersError] = useState<ErrorEnvelope | string | null>(null);

  // Inventory Inspector & Stock Edit State
  const [inspectingSeller, setInspectingSeller] = useState<SellerSummary | null>(null);
  const [inspectingAgent, setInspectingAgent] = useState<SellerAgentSummary | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryLineResponse[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState<ErrorEnvelope | string | null>(null);

  // Stock Update Sub-State
  const [editingLine, setEditingLine] = useState<InventoryLineResponse | null>(null);
  const [stockInput, setStockInput] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [stockError, setStockError] = useState<ErrorEnvelope | string | null>(null);
  const [stockSuccess, setStockSuccess] = useState<string | null>(null);

  // Seller Profile Modal State
  const [profileSeller, setProfileSeller] = useState<SellerSummary | null>(null);
  const [profileData, setProfileData] = useState<SellerProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<ErrorEnvelope | string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDeliveryDays, setProfileDeliveryDays] = useState<number>(3);
  const [profileCoverageText, setProfileCoverageText] = useState<string>('');
  const [profileCreditDaysText, setProfileCreditDaysText] = useState<string>('');
  const [profileDeliveryTerms, setProfileDeliveryTerms] = useState<string>('');
  const [profilePaymentNote, setProfilePaymentNote] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal references for focus trapping and restoration
  const inventoryDialogRef = useRef<HTMLDivElement>(null);
  const stockDialogRef = useRef<HTMLDivElement>(null);
  const profileDialogRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);

  // Attempt session restoration on mount
  useEffect(() => {
    apiClient.getSession().catch(() => {});
  }, []);

  // Fetch Catalogue Products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await apiClient.listCatalogueProducts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        query: catalogueSearch.trim() || undefined,
        limit: 100,
      });
      setProducts(res.data.items);
      setTotalProducts(res.data.pagination.total);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProductsError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'catalogue-error',
        });
      } else {
        setProductsError(err instanceof Error ? err.message : 'Failed to load catalogue products');
      }
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedCategory, catalogueSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch Marketplace Sellers
  const fetchSellers = useCallback(async () => {
    setLoadingSellers(true);
    setSellersError(null);
    try {
      const res = await apiClient.listMarketplaceSellers({
        coverage: sellerCoverage !== 'all' ? sellerCoverage : undefined,
        max_delivery_days: maxDeliveryDays ? Number(maxDeliveryDays) : undefined,
        min_credit_days: minCreditDays ? Number(minCreditDays) : undefined,
        query: sellerSearch.trim() || undefined,
        limit: 50,
      });
      setSellers(res.data.items);
      setTotalSellers(res.data.pagination.total);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setSellersError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'sellers-error',
        });
      } else {
        setSellersError(err instanceof Error ? err.message : 'Failed to load marketplace sellers');
      }
    } finally {
      setLoadingSellers(false);
    }
  }, [sellerCoverage, maxDeliveryDays, minCreditDays, sellerSearch]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  // Open Inventory Inspector
  const openInventoryModal = async (
    seller: SellerSummary,
    agent: SellerAgentSummary,
    triggerElement: HTMLButtonElement | null
  ) => {
    triggerButtonRef.current = triggerElement;
    setInspectingSeller(seller);
    setInspectingAgent(agent);
    setInventoryItems([]);
    setInventoryError(null);
    setStockSuccess(null);
    setStockError(null);
    setEditingLine(null);
    setLoadingInventory(true);

    try {
      const res = await apiClient.getSellerInventory(seller.principal_id, agent.agent_id, {
        limit: 100,
      });
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
        setInventoryError(err instanceof Error ? err.message : 'Failed to fetch live inventory');
      }
    } finally {
      setLoadingInventory(false);
    }
  };

  const closeInventoryModal = () => {
    setInspectingSeller(null);
    setInspectingAgent(null);
    setEditingLine(null);
    if (triggerButtonRef.current && triggerButtonRef.current.isConnected) {
      triggerButtonRef.current.focus();
    }
  };

  // Keyboard navigation & Focus Trapping for Inventory Modal
  useEffect(() => {
    if (!inspectingSeller || editingLine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeInventoryModal();
      }
      if (e.key === 'Tab') {
        const controls = inventoryDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingSeller, editingLine]);

  // Focus Trapping for Stock Edit Modal
  useEffect(() => {
    if (!editingLine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingLine(null);
      }
      if (e.key === 'Tab') {
        const controls = stockDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
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
    const timeout = setTimeout(() => stockInputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [editingLine]);

  // Submit Stock Update
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingSeller || !inspectingAgent || !editingLine) return;

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
        inspectingSeller.principal_id,
        inspectingAgent.agent_id,
        {
          product_id: editingLine.product.id,
          stock_qty: parsedQty,
        }
      );

      // Update item in local inventory table
      setInventoryItems((prev) =>
        prev.map((item) =>
          item.product.id === editingLine.product.id
            ? { ...item, available_qty: res.data.available_qty }
            : item
        )
      );

      setStockSuccess(`Stock for ${editingLine.product.sku} successfully updated to ${res.data.available_qty} ${editingLine.product.unit}.`);
      setEditingLine(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setStockError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'stock-error',
        });
      } else {
        setStockError(err instanceof Error ? err.message : 'Stock update failed');
      }
    } finally {
      setUpdatingStock(false);
    }
  };

  // Open Seller Profile Modal
  const openProfileModal = async (
    seller: SellerSummary,
    triggerElement: HTMLButtonElement | null
  ) => {
    profileTriggerRef.current = triggerElement;
    setProfileSeller(seller);
    setProfileData(null);
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditingProfile(false);
    setLoadingProfile(true);

    try {
      const res = await apiClient.getSellerProfile(seller.principal_id);
      setProfileData(res.data);
      setProfileDeliveryDays(res.data.seller.delivery_days);
      setProfileCoverageText(res.data.seller.coverage.join(', '));
      setProfileCreditDaysText(res.data.seller.credit_days.join(', '));
      const pol = res.data.public_policies || {};
      setProfileDeliveryTerms(typeof pol.delivery_terms === 'string' ? pol.delivery_terms : '');
      setProfilePaymentNote(typeof pol.payment_note === 'string' ? pol.payment_note : '');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProfileError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'profile-error',
        });
      } else {
        setProfileError(err instanceof Error ? err.message : 'Failed to fetch seller profile');
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeProfileModal = () => {
    setProfileSeller(null);
    setProfileData(null);
    setIsEditingProfile(false);
    if (profileTriggerRef.current && profileTriggerRef.current.isConnected) {
      profileTriggerRef.current.focus();
    }
  };

  // Keyboard navigation & Focus Trapping for Profile Modal
  useEffect(() => {
    if (!profileSeller) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProfileModal();
      }
      if (e.key === 'Tab') {
        const controls = profileDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profileSeller]);

  // Submit Profile & Policy Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileSeller) return;

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    const coverageArr = profileCoverageText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const creditDaysArr = profileCreditDaysText
      .split(',')
      .map((c) => parseInt(c.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0);

    try {
      const res = await apiClient.updateSellerProfile(profileSeller.principal_id, {
        coverage: coverageArr.length > 0 ? coverageArr : profileSeller.coverage,
        delivery_days: Number(profileDeliveryDays) || 1,
        credit_days: creditDaysArr,
        delivery_terms: profileDeliveryTerms.trim() || undefined,
        payment_note: profilePaymentNote.trim() || undefined,
      });

      setProfileData(res.data);
      setSellers((prev) =>
        prev.map((s) => (s.principal_id === profileSeller.principal_id ? res.data.seller : s))
      );
      setProfileSuccess('Seller profile and commercial policies successfully updated.');
      setIsEditingProfile(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProfileError({
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: err.requestId || 'profile-save-error',
        });
      } else {
        setProfileError(err instanceof Error ? err.message : 'Failed to save seller profile');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="vanik-container py-10 sm:py-14 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#CDBB98] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#E2A93B] font-bold">
              [ MANDI COMMODITY & COUNTERPARTY LEDGER ]
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F2C85B] text-[#1E1A1C] border border-[#E2A93B] font-bold shadow-2xs">
              PHASE 2 LIVE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1A1C] tracking-tight">
            Diwali Restock Catalogue & Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5A4B] max-w-3xl">
            Live commodity catalogue with benchmark reference prices, verified wholesale supplier discovery, and real-time inventory ledger powered by autonomous A2A negotiation agents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Catalogue sections"
          className="flex items-center bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-1 rounded-[14px] shadow-sm self-start sm:self-auto"
        >
          <button
            role="tab"
            id="tab-catalogue"
            aria-selected={activeTab === 'catalogue'}
            aria-controls="panel-catalogue"
            onClick={() => setActiveTab('catalogue')}
            className={`px-4 py-2 rounded-[10px] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'catalogue'
                ? 'bg-[#1E1A1C] text-white shadow-sm'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            40-SKU Catalogue ({totalProducts || products.length})
          </button>
          <button
            role="tab"
            id="tab-sellers"
            aria-selected={activeTab === 'sellers'}
            aria-controls="panel-sellers"
            onClick={() => setActiveTab('sellers')}
            className={`px-4 py-2 rounded-[10px] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
              activeTab === 'sellers'
                ? 'bg-[#1E1A1C] text-white shadow-sm'
                : 'text-[#6B5A4B] hover:text-[#1E1A1C]'
            }`}
          >
            Wholesale Sellers ({totalSellers || sellers.length})
          </button>
        </div>
      </div>

      {/* Global Success / Notice Alert */}
      {stockSuccess && (
        <div className="bg-[#BCDFB0] border-[1.5px] border-[#0E4A47] rounded-[16px] p-4 text-[#0E4A47] text-xs font-bold flex items-center justify-between shadow-xs">
          <span>✓ {stockSuccess}</span>
          <button
            type="button"
            onClick={() => setStockSuccess(null)}
            className="text-[#0E4A47] hover:text-[#1E1A1C] font-mono text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: 40-SKU CATALOGUE */}
      {activeTab === 'catalogue' && (
        <section
          id="panel-catalogue"
          role="tabpanel"
          aria-labelledby="tab-catalogue"
          className="space-y-6"
        >
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-4 rounded-[16px] shadow-xs">
            <input
              type="text"
              aria-label="Search catalogue products by SKU code or name"
              placeholder="Filter by SKU (e.g. STP-RICE) or product name..."
              value={catalogueSearch}
              onChange={(e) => setCatalogueSearch(e.target.value)}
              className="flex-1 min-w-[220px] px-3.5 py-2 bg-[#F6EDD9] border border-[#CDBB98] rounded-[9px] text-xs text-[#1E1A1C] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
            />

            <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Filter products by category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C] ${
                    selectedCategory === cat.slug
                      ? 'bg-[#0E4A47] text-white border border-[#0E4A47] shadow-2xs'
                      : 'bg-[#F6EDD9] text-[#6B5A4B] hover:text-[#1E1A1C] border border-[#CDBB98]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {productsError && (
            <ErrorAlert error={productsError} onDismiss={() => setProductsError(null)} />
          )}

          {/* Table Container */}
          <div className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-[#F6EDD9] text-[#1E1A1C] uppercase font-mono tracking-wider border-b-[1.5px] border-[#1E1A1C]">
                  <tr>
                    <th className="px-5 py-3.5">SKU Code</th>
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Unit</th>
                    <th className="px-5 py-3.5 text-right">Benchmark Price</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CDBB98] font-sans">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#6B5A4B] font-mono">
                        <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
                        Querying live mandi catalogue (/v1/catalogue/products)...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#6B5A4B]">
                        No matching catalogue items found.
                      </td>
                    </tr>
                  ) : (
                    products.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F6EDD9]/60 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[#1E1A1C] font-bold">
                          {item.sku}
                        </td>
                        <td className="px-5 py-3.5 text-[#1E1A1C] font-semibold">
                          {item.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-full text-[11px] font-mono capitalize text-[#2A2224]">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#8C7E70] capitalize font-mono">
                          {item.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[#0E4A47] font-bold text-sm">
                          ₹{item.benchmark_price}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              item.active
                                ? 'bg-[#BCDFB0] text-[#0E4A47] border border-[#0E4A47]'
                                : 'bg-[#EDE0C4] text-[#8C7E70] border border-[#CDBB98]'
                            }`}
                          >
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Status */}
            <div className="p-4 bg-[#F6EDD9] border-t border-[#CDBB98] text-xs text-[#6B5A4B] flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono">
                Showing {products.length} of {totalProducts} verified mandi items
              </span>
              <span className="font-mono text-[#8C7E70] text-[11px]">
                GET /v1/catalogue/products
              </span>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: MARKETPLACE SELLERS & AGENTS */}
      {activeTab === 'sellers' && (
        <section
          id="panel-sellers"
          role="tabpanel"
          aria-labelledby="tab-sellers"
          className="space-y-6"
        >
          {/* Seller Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] p-4 rounded-[16px] shadow-xs">
            <div>
              <label htmlFor="seller-query" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                Search Sellers
              </label>
              <input
                id="seller-query"
                type="text"
                placeholder="Search trade name..."
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              />
            </div>

            <div>
              <label htmlFor="seller-coverage" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                Coverage Region
              </label>
              <select
                id="seller-coverage"
                value={sellerCoverage}
                onChange={(e) => setSellerCoverage(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              >
                {COVERAGE_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'all' ? 'All Delivery Regions' : r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="seller-delivery" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                Max Delivery Days
              </label>
              <select
                id="seller-delivery"
                value={maxDeliveryDays}
                onChange={(e) => setMaxDeliveryDays(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              >
                <option value="">Any Fulfillment Speed</option>
                <option value="2">Within 2 Days</option>
                <option value="3">Within 3 Days</option>
                <option value="5">Within 5 Days</option>
              </select>
            </div>

            <div>
              <label htmlFor="seller-credit" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                Min Credit Terms
              </label>
              <select
                id="seller-credit"
                value={minCreditDays}
                onChange={(e) => setMinCreditDays(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F6EDD9] border border-[#CDBB98] rounded-[8px] text-xs font-semibold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
              >
                <option value="">Any Credit Window</option>
                <option value="0">Net 0 (Cash only)</option>
                <option value="7">Net 7 Days+</option>
                <option value="15">Net 15 Days+</option>
                <option value="30">Net 30 Days+</option>
              </select>
            </div>
          </div>

          {sellersError && (
            <ErrorAlert error={sellersError} onDismiss={() => setSellersError(null)} />
          )}

          {/* Sellers Grid */}
          {loadingSellers ? (
            <div className="p-12 text-center text-[#6B5A4B] bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] font-mono text-xs shadow-xs">
              <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
              Discovering verified wholesale sellers (/v1/marketplace/sellers)...
            </div>
          ) : sellers.length === 0 ? (
            <div className="p-12 text-center text-[#6B5A4B] bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px]">
              No sellers match the selected delivery criteria or coverage zone.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sellers.map((seller) => (
                <div
                  key={seller.principal_id}
                  className="bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[20px] p-6 shadow-sm flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    {/* Seller Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#CDBB98] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-extrabold text-[#1E1A1C]">
                            {seller.trade_name}
                          </h2>
                          {seller.evidence_is_simulated && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F6EDD9] text-[#8C7E70] border border-[#CDBB98] font-bold">
                              SYNTHETIC
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[#8C7E70] mt-0.5">
                          ID: {seller.principal_id}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase font-bold border ${
                          seller.verification_status === 'demo_verified'
                            ? 'bg-[#BCDFB0] text-[#0E4A47] border-[#0E4A47]'
                            : 'bg-[#EDE0C4] text-[#2A2224] border-[#CDBB98]'
                        }`}
                      >
                        {seller.verification_status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Commercial Terms Badges */}
                    <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
                      <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                        <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Fulfillment</span>
                        <span className="text-xs font-extrabold text-[#1E1A1C]">
                          {seller.delivery_days} {seller.delivery_days === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                        <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Credit Terms</span>
                        <span className="text-xs font-extrabold text-[#1E1A1C]">
                          {seller.credit_days.length > 0
                            ? seller.credit_days.map((d) => `Net ${d}`).join(', ')
                            : 'Prepaid'}
                        </span>
                      </div>

                      <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                        <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">Live Basket</span>
                        <span className="text-xs font-extrabold text-[#0E4A47]">
                          {seller.available_sku_count} SKUs
                        </span>
                      </div>
                    </div>

                    {/* Regional Coverage */}
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block mb-1.5">
                        Supply Coverage:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {seller.coverage.map((city) => (
                          <span
                            key={city}
                            className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] font-medium uppercase"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Reliability & Trade History */}
                    <div className="p-3 bg-[#F6EDD9] rounded-[13px] border border-[#CDBB98] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#1E1A1C]">
                          Mandi Reliability Record:
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFAF0] text-[#8C7E70] border border-[#CDBB98]">
                          {seller.reliability_score !== null
                            ? `Score: ${seller.reliability_score}`
                            : 'Unrated (New Seller)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B5A4B]">
                        {seller.reliability_evidence_count === 0
                          ? '0 verified trade outcomes recorded on-chain. Counterparties establish trust through cryptographic passports and deposit guarantees.'
                          : `${seller.reliability_evidence_count} settled contract outcomes.`}
                      </p>
                    </div>

                    {/* Autonomous Trading Agents */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                        Assigned Autonomous Negotiation Agents:
                      </span>
                      {seller.agents.map((ag) => (
                        <div
                          key={ag.agent_id}
                          className="flex items-center justify-between p-3 rounded-[12px] bg-[#FFFAF0] border border-[#1E1A1C] shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#1E1A1C]">{ag.name}</span>
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#BCDFB0] text-[#0E4A47] border border-[#0E4A47] font-bold">
                                {ag.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[#6B5A4B] block">
                              Strategy: <strong className="text-[#0E4A47] capitalize">{ag.strategy_profile.replace('_', ' ')}</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => openInventoryModal(seller, ag, e.currentTarget)}
                            className="px-3 py-1.5 rounded-[9px] bg-[#1E1A1C] text-white hover:bg-[#0E4A47] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                          >
                            Inspect Live Inventory →
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Seller Profile Action */}
                    <div className="pt-3 border-t border-[#CDBB98] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#8C7E70]">
                        Verified Mandi Entity
                      </span>
                      <button
                        type="button"
                        onClick={(e) => openProfileModal(seller, e.currentTarget)}
                        className="px-3 py-1.5 rounded-[9px] bg-[#F6EDD9] hover:bg-[#EDE0C4] border border-[#1E1A1C] text-[#1E1A1C] hover:text-[#0E4A47] text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                      >
                        View Business Profile & Policies ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: INVENTORY INSPECTOR DIALOG */}
      {inspectingSeller && inspectingAgent && !editingLine && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            ref={inventoryDialogRef}
            className="w-full max-w-4xl max-h-[90vh] bg-[#FFFAF0] border-[2px] border-[#1E1A1C] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-6 border-b-[1.5px] border-[#1E1A1C] bg-[#F6EDD9] flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E2A93B] font-bold block mb-1">
                  [ LIVE AGENT INVENTORY LEDGER ]
                </span>
                <h2 id="inventory-dialog-title" className="text-2xl font-extrabold text-[#1E1A1C]">
                  {inspectingSeller.trade_name}
                </h2>
                <p className="text-xs text-[#6B5A4B] mt-1 font-mono">
                  Agent: <strong className="text-[#0E4A47]">{inspectingAgent.name}</strong> ({inspectingAgent.strategy_profile}) | ID: {inspectingAgent.agent_id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeInventoryModal}
                className="w-8 h-8 rounded-full border border-[#1E1A1C] bg-[#FFFAF0] hover:bg-[#EDE0C4] flex items-center justify-center font-mono font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                aria-label="Close inventory dialog"
              >
                ✕
              </button>
            </div>

            {/* Inventory Informational Banner */}
            <div className="bg-[#EDE0C4] px-6 py-3 border-b border-[#CDBB98] text-xs text-[#6B5A4B] flex items-center justify-between">
              <span>
                💡 <strong>Public Free-to-Sell Inventory</strong>: Available quantities reflect unreserved on-hand allocations.
              </span>
              <span className="font-mono text-[11px] text-[#1E1A1C] font-bold">
                {inventoryItems.length} lines listed
              </span>
            </div>

            {/* Inventory Body / Table */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {inventoryError && (
                <ErrorAlert error={inventoryError} onDismiss={() => setInventoryError(null)} />
              )}

              {loadingInventory ? (
                <div className="py-16 text-center font-mono text-xs text-[#6B5A4B]">
                  <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
                  Querying seller inventory allocation...
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#6B5A4B]">
                  No active inventory lines discovered for this agent.
                </div>
              ) : (
                <div className="border border-[#1E1A1C] rounded-[16px] overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6EDD9] border-b border-[#1E1A1C] font-mono text-[#1E1A1C] uppercase">
                      <tr>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Commodity</th>
                        <th className="px-4 py-3">Benchmark</th>
                        <th className="px-4 py-3 text-right">Available Qty</th>
                        <th className="px-4 py-3 text-center">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CDBB98]">
                      {inventoryItems.map((line) => (
                        <tr key={line.product.id} className="hover:bg-[#F6EDD9]/60">
                          <td className="px-4 py-3 font-mono font-bold text-[#1E1A1C]">
                            {line.product.sku}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#1E1A1C] block">{line.product.name}</span>
                            <span className="text-[10px] text-[#8C7E70] font-mono capitalize">
                              {line.product.category.replace('_', ' ')} • {line.product.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#6B5A4B]">
                            ₹{line.product.benchmark_price}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-sm text-[#0E4A47]">
                            {line.available_qty} {line.product.unit}s
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLine(line);
                                setStockInput(line.available_qty);
                                setStockError(null);
                              }}
                              className="px-2.5 py-1 bg-[#FFFAF0] hover:bg-[#EDE0C4] border border-[#1E1A1C] rounded-[7px] text-[11px] font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                            >
                              Update Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#CDBB98] bg-[#F6EDD9] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#8C7E70]">
                POST /v1/principals/{'{id}'}/agents/{'{agent_id}'}/inventory requires principal auth & CSRF token
              </span>
              <button
                type="button"
                onClick={closeInventoryModal}
                className="px-4 py-2 bg-[#1E1A1C] text-white hover:bg-[#0E4A47] text-xs font-mono font-bold rounded-[10px]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK UPDATE DIALOG */}
      {editingLine && inspectingSeller && inspectingAgent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            ref={stockDialogRef}
            className="w-full max-w-md bg-[#FFFAF0] border-[2px] border-[#1E1A1C] rounded-[24px] shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E2A93B] font-bold block mb-1">
                  [ STOCK QUANTITY RECONCILIATION ]
                </span>
                <h3 id="stock-dialog-title" className="text-xl font-extrabold text-[#1E1A1C]">
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
                  htmlFor="stock-qty-input"
                  className="block text-xs font-mono uppercase tracking-wider text-[#8C7E70] mb-1 font-bold"
                >
                  New Total Stock Quantity ({editingLine.product.unit}s)
                </label>
                <input
                  id="stock-qty-input"
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

      {/* MODAL 3: SELLER PROFILE & COMMERCIAL POLICIES DIALOG */}
      {profileSeller && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            ref={profileDialogRef}
            className="w-full max-w-2xl max-h-[90vh] bg-[#FFFAF0] border-[2px] border-[#1E1A1C] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-6 border-b-[1.5px] border-[#1E1A1C] bg-[#F6EDD9] flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E2A93B] font-bold block mb-1">
                  [ VERIFIED BUSINESS PROFILE & POLICIES ]
                </span>
                <h2 id="profile-dialog-title" className="text-2xl font-extrabold text-[#1E1A1C]">
                  {profileSeller.trade_name}
                </h2>
                <p className="text-xs text-[#6B5A4B] mt-1 font-mono">
                  Principal ID: <strong className="text-[#0E4A47]">{profileSeller.principal_id}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeProfileModal}
                className="w-8 h-8 rounded-full border border-[#1E1A1C] bg-[#FFFAF0] hover:bg-[#EDE0C4] flex items-center justify-center font-mono font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                aria-label="Close profile dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
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
                <div className="py-16 text-center font-mono text-xs text-[#6B5A4B]">
                  <span className="inline-block w-4 h-4 border-2 border-[#0E4A47] border-t-transparent rounded-full animate-spin mr-2" />
                  Querying verified counterparty profile (/v1/marketplace/sellers/{profileSeller.principal_id})...
                </div>
              ) : profileData ? (
                <div className="space-y-5">
                  {/* Business Entity Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98] space-y-1">
                      <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                        Legal Entity Name
                      </span>
                      <span className="text-xs font-bold text-[#1E1A1C] block">
                        {profileData.legal_name}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98] space-y-1">
                      <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                        Business Structure & Verification
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1E1A1C] capitalize">
                          {profileData.business_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#BCDFB0] text-[#0E4A47] border border-[#0E4A47] font-bold">
                          {profileData.seller.verification_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Address */}
                  <div className="p-3.5 bg-[#F6EDD9] rounded-[14px] border border-[#CDBB98] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block">
                      Registered Mandi / Warehouse Address
                    </span>
                    <span className="text-xs text-[#1E1A1C] block font-medium">
                      {profileData.address || 'Address registered on state Mandi ledger'}
                    </span>
                  </div>

                  {/* Commercial Terms View or Edit Form */}
                  {!isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#FFFAF0] border-[1.5px] border-[#1E1A1C] rounded-[16px] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#CDBB98] pb-2">
                          <span className="font-mono text-xs font-bold text-[#1E1A1C] uppercase">
                            Published Commercial Policies
                          </span>
                          <span className="text-[10px] font-mono text-[#0E4A47] font-bold">
                            Live on Marketplace
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                          <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                            <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                              Fulfillment Lead
                            </span>
                            <span className="text-xs font-extrabold text-[#1E1A1C]">
                              {profileData.seller.delivery_days} {profileData.seller.delivery_days === 1 ? 'day' : 'days'}
                            </span>
                          </div>

                          <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                            <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                              Credit Windows
                            </span>
                            <span className="text-xs font-extrabold text-[#1E1A1C]">
                              {profileData.seller.credit_days.length > 0
                                ? profileData.seller.credit_days.map((d) => `Net ${d}`).join(', ')
                                : 'Prepaid (Net 0)'}
                            </span>
                          </div>

                          <div className="bg-[#F6EDD9] p-2.5 rounded-[12px] border border-[#CDBB98]">
                            <span className="text-[10px] uppercase text-[#8C7E70] block font-bold">
                              Live SKUs
                            </span>
                            <span className="text-xs font-extrabold text-[#0E4A47]">
                              {profileData.seller.available_sku_count} items
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#8C7E70] font-bold block mb-1">
                            Supply Coverage Regions:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {profileData.seller.coverage.map((c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#EDE0C4] text-[#2A2224] border border-[#CDBB98] font-medium uppercase"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {profileData.public_policies && (
                          <div className="space-y-2 pt-2 border-t border-[#CDBB98]">
                            {typeof profileData.public_policies.delivery_terms === 'string' && (
                              <div className="text-xs">
                                <span className="font-mono text-[10px] uppercase text-[#8C7E70] font-bold block">
                                  Delivery Terms:
                                </span>
                                <span className="text-[#1E1A1C]">{profileData.public_policies.delivery_terms}</span>
                              </div>
                            )}
                            {typeof profileData.public_policies.payment_note === 'string' && (
                              <div className="text-xs">
                                <span className="font-mono text-[10px] uppercase text-[#8C7E70] font-bold block">
                                  Payment Note:
                                </span>
                                <span className="text-[#1E1A1C]">{profileData.public_policies.payment_note}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] font-mono text-[#8C7E70]">
                          POST /v1/principals/{'{id}'}/seller-profile requires authenticated principal member
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="px-4 py-2 bg-[#1E1A1C] text-white hover:bg-[#0E4A47] text-xs font-mono font-bold rounded-[10px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                        >
                          ✎ Edit Seller Policies
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 p-4 bg-[#F6EDD9] border-[1.5px] border-[#1E1A1C] rounded-[16px]">
                      <div className="flex items-center justify-between border-b border-[#CDBB98] pb-2">
                        <span className="font-mono text-xs font-bold text-[#1E1A1C] uppercase">
                          Edit Commercial Mandate & Policies
                        </span>
                        <span className="text-[10px] font-mono text-[#0E4A47] font-bold">
                          POST /v1/principals/{profileSeller.principal_id}/seller-profile
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="edit-delivery-days" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                            Fulfillment Lead (Days)
                          </label>
                          <input
                            id="edit-delivery-days"
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={profileDeliveryDays}
                            onChange={(e) => setProfileDeliveryDays(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-[#FFFAF0] border border-[#CDBB98] rounded-[8px] text-xs font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-credit-days" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                            Credit Windows (Comma-separated days, e.g. 0, 7, 15)
                          </label>
                          <input
                            id="edit-credit-days"
                            type="text"
                            value={profileCreditDaysText}
                            onChange={(e) => setProfileCreditDaysText(e.target.value)}
                            placeholder="0, 7, 15"
                            className="w-full px-3 py-2 bg-[#FFFAF0] border border-[#CDBB98] rounded-[8px] text-xs font-mono font-bold text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="edit-coverage" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                          Coverage Regions (Comma-separated cities/states)
                        </label>
                        <input
                          id="edit-coverage"
                          type="text"
                          required
                          value={profileCoverageText}
                          onChange={(e) => setProfileCoverageText(e.target.value)}
                          placeholder="Pune, Mumbai, Maharashtra"
                          className="w-full px-3 py-2 bg-[#FFFAF0] border border-[#CDBB98] rounded-[8px] text-xs font-mono text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-delivery-terms" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                          Delivery Terms Note
                        </label>
                        <input
                          id="edit-delivery-terms"
                          type="text"
                          value={profileDeliveryTerms}
                          onChange={(e) => setProfileDeliveryTerms(e.target.value)}
                          placeholder="Wholesale truckload delivery to retail doorstep"
                          className="w-full px-3 py-2 bg-[#FFFAF0] border border-[#CDBB98] rounded-[8px] text-xs text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-payment-note" className="block text-[11px] font-mono font-bold text-[#8C7E70] uppercase mb-1">
                          Payment Policy Note
                        </label>
                        <input
                          id="edit-payment-note"
                          type="text"
                          value={profilePaymentNote}
                          onChange={(e) => setProfilePaymentNote(e.target.value)}
                          placeholder="Standard mandi credit terms with post-dated cheque or UPI"
                          className="w-full px-3 py-2 bg-[#FFFAF0] border border-[#CDBB98] rounded-[8px] text-xs text-[#1E1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1A1C]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold text-[#1E1A1C] hover:bg-[#EDE0C4]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="px-5 py-2 bg-[#0E4A47] hover:bg-[#C8472F] text-white border border-[#1E1A1C] rounded-[9px] text-xs font-mono font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs"
                        >
                          {savingProfile ? (
                            <>
                              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving Policy...
                            </>
                          ) : (
                            'Save Commercial Policies'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#CDBB98] bg-[#F6EDD9] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#8C7E70]">
                Mandi Counterparty Trust Protocol
              </span>
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2 bg-[#1E1A1C] text-white hover:bg-[#0E4A47] text-xs font-mono font-bold rounded-[10px]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
