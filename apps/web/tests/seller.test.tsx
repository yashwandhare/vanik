import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SellerPage from '../src/app/seller/page';

const mocks = vi.hoisted(() => ({
  sellerRFQs: vi.fn(),
  getSession: vi.fn(),
  listMarketplaceSellers: vi.fn(),
  getSellerInventory: vi.fn(),
  updateSellerInventory: vi.fn(),
  getSellerProfile: vi.fn(),
  updateSellerProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
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
      product: {
        id: '10000000-0000-4000-8000-000000000001',
        sku: 'STP-RICE-BAS-5K',
        name: 'Basmati Rice 5 kg',
        category: 'staples',
        unit: 'bag',
        benchmark_price: '620.00',
        attributes: { grain: 'long' },
        active: true,
      },
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
  mocks.listMarketplaceSellers.mockResolvedValue({ data: mockSellersData, isMock: false });
  mocks.getSellerInventory.mockResolvedValue({ data: mockInventoryData, isMock: false });
  mocks.getSellerProfile.mockResolvedValue({ data: mockProfileData, isMock: false });
});

afterEach(cleanup);

describe('Seller Workspace Page', () => {
  it('loads active seller and renders live inventory', async () => {
    render(<SellerPage />);
    await waitFor(() => expect(mocks.listMarketplaceSellers).toHaveBeenCalled());
    await waitFor(() => expect(mocks.getSellerInventory).toHaveBeenCalled());

    expect(screen.getByText('Mangal Wholesale')).toBeDefined();
    expect(screen.getByText('STP-RICE-BAS-5K')).toBeDefined();
    expect(screen.getByText('450.00 bags')).toBeDefined();
  });

  it('updates stock quantity in modal', async () => {
    mocks.updateSellerInventory.mockResolvedValueOnce({
      data: {
        product: mockInventoryData.items[0].product,
        available_qty: '600.00',
      },
      isMock: false,
    });

    render(<SellerPage />);
    await screen.findByText('STP-RICE-BAS-5K');

    const updateBtn = screen.getByRole('button', { name: /Update Stock/i });
    fireEvent.click(updateBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeDefined();

    const input = screen.getByLabelText(/New Total Stock Quantity/i);
    fireEvent.change(input, { target: { value: '600' } });

    const saveBtn = screen.getByRole('button', { name: /Save Stock Quantity/i });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(mocks.updateSellerInventory).toHaveBeenCalledWith(
        '20000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000002',
        {
          product_id: '10000000-0000-4000-8000-000000000001',
          stock_qty: 600,
        }
      )
    );

    expect(await screen.findByText(/successfully updated to 600.00 bag/i)).toBeDefined();
  });

  it('strictly masks buyer maximum budget in the incoming RFQs view', async () => {
    mocks.sellerRFQs.mockResolvedValueOnce({ data: { items: [{
      id: 'negotiation-real-response', task_id: 'task-from-api', state: 'evaluating', round_no: 1,
      offers: [], messages: [{ message_type: 'REQUEST_FOR_QUOTE', sender_principal_id: 'buyer-principal',
        sender_agent_id: 'buyer-agent', key_version: 1, signature: 'backend-signature',
        payload: { lines: [{ sku: 'STP-RICE-BAS-5K', quantity: '2', unit: 'bag' }], currency: 'INR' },
      }],
    }] } });
    render(<SellerPage />);
    await waitFor(() => expect(mocks.listMarketplaceSellers).toHaveBeenCalled());
    await waitFor(() => expect(mocks.getSellerInventory).toHaveBeenCalled());

    const rfqTab = screen.getByRole('tab', { name: /Incoming Buyer RFQs/i });
    fireEvent.click(rfqTab);

    // Verify critical privacy banner and budget masking
    expect(await screen.findByText(/BUYER BUDGET PRIVACY/i)).toBeDefined();
    expect(await screen.findByText(/RFQ \/ Negotiation: negotiation-real-response/i)).toBeDefined();
    expect(mocks.sellerRFQs).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000002');
    expect(screen.queryByRole('button', { name: /Generate Agent Quote/i })).toBeNull();
    expect(screen.getAllByText(/\[CONFIDENTIAL • MASKED\]/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/₹85,000/i)).toBeNull(); // Buyer budget never exposed
  });

  it('allows editing commercial policies in the policies tab', async () => {
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

    render(<SellerPage />);
    await waitFor(() => expect(mocks.listMarketplaceSellers).toHaveBeenCalled());

    const policiesTab = screen.getByRole('tab', { name: /Commercial Policies/i });
    fireEvent.click(policiesTab);

    await screen.findByText(/Commercial Mandate & Fulfillment Policies/i);
    const editBtn = screen.getByRole('button', { name: /Edit Policies/i });
    fireEvent.click(editBtn);

    const deliveryInput = screen.getByLabelText(/Fulfillment Lead Time/i);
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
      await screen.findByText(/Commercial policies and fulfillment terms successfully updated/i)
    ).toBeDefined();
  });
});
