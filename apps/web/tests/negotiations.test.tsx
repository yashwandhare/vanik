import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NegotiationsPage from '../src/app/negotiations/page';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  listCatalogueProducts: vi.fn(),
  createTask: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { csrf_token: 'test-token' } });
  mocks.listCatalogueProducts.mockResolvedValue({ data: mockProductsData, isMock: false });
  mocks.createTask.mockResolvedValue({
    data: {
      id: '50000000-0000-4000-8000-000000000001',
      version: 1,
      principal_id: '10000000-0000-4000-8000-000000000001',
      agent_id: '30000000-0000-4000-8000-000000000001',
      mandate: {},
      status: 'running',
      created_at: '2026-11-01T06:00:00Z',
    },
    isMock: false,
  });
});

afterEach(cleanup);

describe('Negotiations Workspace Page', () => {
  it('renders parallel negotiation rounds with Ed25519 signatures and security status', async () => {
    render(<NegotiationsPage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    expect(screen.getByText(/Mahalaxmi Agro Distributors/i)).toBeDefined();
    expect(screen.getByText(/Kisan Wholesale Traders/i)).toBeDefined();
    expect(screen.getByText(/QuickDrop Wholesale/i)).toBeDefined();
    expect(screen.getByText(/SECURITY AUDIT VIOLATION/i)).toBeDefined();
    expect(screen.getAllByText(/✓ Ed25519 Signed/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders mandate form with real catalogue commodities and submits task', async () => {
    render(<NegotiationsPage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    const mandateTab = screen.getByRole('tab', { name: /Mandate Form/i });
    fireEvent.click(mandateTab);

    expect(screen.getByLabelText(/Procurement Objective/i)).toBeDefined();
    expect(screen.getByLabelText(/Maximum Reservation Budget/i)).toBeDefined();
    expect(screen.getByLabelText(/Price Weight/i)).toBeDefined();

    const launchBtn = screen.getByRole('button', { name: /Sign & Launch Parallel Negotiation Mandate/i });
    fireEvent.click(launchBtn);

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalled());
    expect(await screen.findByText(/successfully launched/i)).toBeDefined();
  });

  it('renders offer comparison matrix and authorizes human deal lock with simulated receipt', async () => {
    render(<NegotiationsPage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    const comparisonTab = screen.getByRole('tab', { name: /Offer Comparison/i });
    fireEvent.click(comparisonTab);

    expect(screen.getByText(/RECOMMENDED/i)).toBeDefined();
    expect(screen.getByText(/Deal Lock & Approval Challenge/i)).toBeDefined();

    const authorizeBtn = screen.getByRole('button', { name: /Authorize Deal Lock/i });
    fireEvent.click(authorizeBtn);

    expect(await screen.findByText(/SIMULATED SETTLEMENT - NO REAL FUNDS MOVED/i)).toBeDefined();
    expect(screen.getAllByText(/UPI-SIM-2026-9812487/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders adversarial audit tab displaying prompt injection and fake discount mitigation', async () => {
    render(<NegotiationsPage />);
    await waitFor(() => expect(mocks.listCatalogueProducts).toHaveBeenCalled());

    const securityTab = screen.getByRole('tab', { name: /Adversarial Audit/i });
    fireEvent.click(securityTab);

    expect(await screen.findByText(/Adversarial Seller Defense Demonstration/i)).toBeDefined();
    expect(screen.getByText(/Untrusted Seller Free-Text Prompt Injection/i)).toBeDefined();
    expect(screen.getByText(/Benchmark Price Fake Discount Check/i)).toBeDefined();
    expect(screen.getByText(/ATTACK MITIGATED/i)).toBeDefined();
  });
});
