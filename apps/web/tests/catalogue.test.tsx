import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CataloguePage from '../src/app/catalogue/page';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  listCatalogueProducts: vi.fn(),
  listMarketplaceSellers: vi.fn(),
  getSellerInventory: vi.fn(),
  updateSellerInventory: vi.fn(),
  getSellerProfile: vi.fn(),
  updateSellerProfile: vi.fn(),
}));

vi.mock('../src/lib/api-client', () => ({
  apiClient: mocks,
  ApiClientError: class MockApiClientError extends Error {
    code: string;
    details?: Array<{ field?: string; message: string }>;
    requestId?: string;
    constructor(code: string, message: string, details?: Array<{ field?: string; message: string }>, requestId?: string) {
      super(message);
      this.name = 'ApiClientError';
      this.code = code;
      this.details = details;
      this.requestId = requestId;
    }
  },
}));

const mockProductsData = {
  items: [
    {
      id: '10000000-0000-4000-8000-000000000001',
      sku: 'STP-RICE-BAS-5K',
      name: 'Basmati Rice 5 kg',
      category: 'staples',
      unit: 'bag',
      benchmark_price: '620.00',
      attributes: { grain: 'long' },
      active: true,
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      sku: 'OIL-MUST-1L',
      name: 'Mustard Oil 1 L',
      category: 'edible_oils',
      unit: 'bottle',
      benchmark_price: '168.00',
      attributes: {},
      active: true,
    },
  ],
  pagination: { total: 2, limit: 100, offset: 0 },
};

const mockSellersData = {
  items: [
    {
      principal_id: '20000000-0000-4000-8000-000000000002',
      trade_name: 'Mangal Wholesale',
      verification_status: 'demo_verified' as const,
      coverage: ['pune', 'mumbai'],
      delivery_days: 3,
      credit_days: [7, 15],
      available_sku_count: 38,
      reliability_evidence_count: 0,
      evidence_is_simulated: true,
      reliability_score: null,
      agents: [
        {
          agent_id: '30000000-0000-4000-8000-000000000002',
          name: 'Mangal Wholesale Agent',
          strategy_profile: 'margin',
          status: 'active',
        },
      ],
    },
  ],
  pagination: { total: 1, limit: 50, offset: 0 },
};

const mockInventoryData = {
  principal_id: '20000000-0000-4000-8000-000000000002',
  agent_id: '30000000-0000-4000-8000-000000000002',
  items: [
    {
      product: mockProductsData.items[0],
      available_qty: '450.00',
    },
  ],
  pagination: { total: 1, limit: 100, offset: 0 },
};

const mockProfileData = {
  seller: mockSellersData.items[0],
  legal_name: 'Mangal Wholesale Synthetic Business',
  business_type: 'synthetic_distributor',
  address: 'Synthetic Market Yard, Pune',
  public_policies: {
    delivery_terms: 'Direct wholesale delivery',
    payment_note: 'Standard mandi terms',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { csrf_token: 'test-token' } });
  mocks.listCatalogueProducts.mockResolvedValue({ data: mockProductsData, isMock: false });
  mocks.listMarketplaceSellers.mockResolvedValue({ data: mockSellersData, isMock: false });
  mocks.getSellerInventory.mockResolvedValue({ data: mockInventoryData, isMock: false });
  mocks.getSellerProfile.mockResolvedValue({ data: mockProfileData, isMock: false });
});

afterEach(cleanup);

describe('Catalogue and Marketplace Page', () => {
  it('loads and renders catalogue items from live API', async () => {
    render(<CataloguePage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    expect(screen.getByText('STP-RICE-BAS-5K')).toBeDefined();
    expect(screen.getByText('Basmati Rice 5 kg')).toBeDefined();
    expect(screen.getByText('₹620.00')).toBeDefined();
    expect(screen.getByText('OIL-MUST-1L')).toBeDefined();
    expect(screen.getByText('Mustard Oil 1 L')).toBeDefined();
  });

  it('filters catalogue when category pill is selected', async () => {
    render(<CataloguePage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    const staplesBtn = screen.getByRole('button', { name: 'Staples' });
    fireEvent.click(staplesBtn);

    await waitFor(() => {
      expect(mocks.listCatalogueProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'staples' })
      );
    });
  });

  it('switches to wholesale sellers tab and renders seller cards with unrated history', async () => {
    render(<CataloguePage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    const sellersTab = screen.getByRole('tab', { name: /Wholesale Sellers/i });
    fireEvent.click(sellersTab);

    await waitFor(() => expect(mocks.listMarketplaceSellers).toHaveBeenCalled());

    expect(screen.getByText('Mangal Wholesale')).toBeDefined();
    expect(screen.getByText('demo verified')).toBeDefined();
    expect(screen.getAllByText(/3 days/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Net 7, Net 15')).toBeDefined();
    expect(screen.getByText('Unrated (New Seller)')).toBeDefined();
    expect(screen.getByText(/Mangal Wholesale Agent/i)).toBeDefined();
  });

  it('opens inventory inspector and displays available free-to-sell stock', async () => {
    render(<CataloguePage />);
    const sellersTab = screen.getByRole('tab', { name: /Wholesale Sellers/i });
    fireEvent.click(sellersTab);

    await screen.findByText('Mangal Wholesale');
    const inspectBtn = screen.getByRole('button', { name: /Inspect Live Inventory/i });
    fireEvent.click(inspectBtn);

    await waitFor(() => expect(mocks.getSellerInventory).toHaveBeenCalledWith(
      '20000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      { limit: 100 }
    ));

    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByText('450.00 bags')).toBeDefined();
  });

  it('updates stock quantity through authenticated form and updates view', async () => {
    mocks.updateSellerInventory.mockResolvedValueOnce({
      data: {
        product: mockProductsData.items[0],
        available_qty: '500.00',
      },
      isMock: false,
    });

    render(<CataloguePage />);
    const sellersTab = screen.getByRole('tab', { name: /Wholesale Sellers/i });
    fireEvent.click(sellersTab);

    const inspectBtn = await screen.findByRole('button', { name: /Inspect Live Inventory/i });
    fireEvent.click(inspectBtn);

    const updateBtn = await screen.findByRole('button', { name: 'Update Stock' });
    fireEvent.click(updateBtn);

    const qtyInput = screen.getByLabelText(/New Total Stock Quantity/i);
    fireEvent.change(qtyInput, { target: { value: '500' } });

    const saveBtn = screen.getByRole('button', { name: /Save Stock Quantity/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mocks.updateSellerInventory).toHaveBeenCalledWith(
      '20000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      {
        product_id: '10000000-0000-4000-8000-000000000001',
        stock_qty: 500,
      }
    ));

    expect(await screen.findByText(/successfully updated to 500.00 bag/i)).toBeDefined();
  });

  it('opens seller profile modal and displays legal name and policies', async () => {
    render(<CataloguePage />);
    const sellersTab = screen.getByRole('tab', { name: /Wholesale Sellers/i });
    fireEvent.click(sellersTab);

    await screen.findByText('Mangal Wholesale');
    const profileBtn = screen.getByRole('button', { name: /View Business Profile & Policies/i });
    fireEvent.click(profileBtn);

    await waitFor(() =>
      expect(mocks.getSellerProfile).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000002')
    );

    expect(await screen.findByText('Mangal Wholesale Synthetic Business')).toBeDefined();
    expect(screen.getByText('Direct wholesale delivery')).toBeDefined();
    expect(screen.getByText('Standard mandi terms')).toBeDefined();
  });

  it('allows editing seller commercial policies in modal', async () => {
    mocks.updateSellerProfile.mockResolvedValueOnce({
      data: {
        ...mockProfileData,
        seller: {
          ...mockProfileData.seller,
          delivery_days: 2,
        },
      },
      isMock: false,
    });

    render(<CataloguePage />);
    const sellersTab = screen.getByRole('tab', { name: /Wholesale Sellers/i });
    fireEvent.click(sellersTab);

    await screen.findByText('Mangal Wholesale');
    const profileBtn = screen.getByRole('button', { name: /View Business Profile & Policies/i });
    fireEvent.click(profileBtn);

    await screen.findByText('Mangal Wholesale Synthetic Business');
    const editBtn = screen.getByRole('button', { name: /Edit Seller Policies/i });
    fireEvent.click(editBtn);

    const deliveryInput = screen.getByLabelText(/Fulfillment Lead/i);
    fireEvent.change(deliveryInput, { target: { value: '2' } });

    const saveBtn = screen.getByRole('button', { name: /Save Commercial Policies/i });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(mocks.updateSellerProfile).toHaveBeenCalledWith(
        '20000000-0000-4000-8000-000000000002',
        expect.objectContaining({
          delivery_days: 2,
        })
      )
    );

    expect(
      await screen.findByText(/Seller profile and commercial policies successfully updated/i)
    ).toBeDefined();
  });
});
