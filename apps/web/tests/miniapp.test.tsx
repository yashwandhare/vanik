import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MiniAppPage from '../src/app/miniapp/page';

const state = vi.hoisted(() => ({ query: '' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.query),
}));

vi.mock('../src/lib/api-client', () => ({
  apiClient: {
    getSession: vi.fn().mockResolvedValue({ data: { csrf_token: 'test-token' } }),
  },
}));

beforeEach(() => {
  state.query = '';
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('Telegram Mini App Page', () => {
  it('renders default approval view and allows authoring simulated settlement', async () => {
    render(<MiniAppPage />);
    expect(screen.getByText(/Recommended Counterparty/i)).toBeDefined();
    expect(screen.getByText(/Kisan Wholesale \(Seller B\)/i)).toBeDefined();

    const approveBtn = screen.getByRole('button', { name: /Approve & Authorize Mock Settlement/i });
    fireEvent.click(approveBtn);

    expect(await screen.findByText(/DEAL APPROVED & SETTLED \(SIMULATED\)/i)).toBeDefined();
    expect(screen.getByText(/UPI-SIM-2026-9812487/i)).toBeDefined();
  });

  it('switches across all five tabs (mandate, passport, timeline, comparison, approval)', async () => {
    render(<MiniAppPage />);

    // Mandate tab
    const mandateTab = screen.getByRole('tab', { name: /Mandate/i });
    fireEvent.click(mandateTab);
    expect(screen.getByText(/Diwali Restock Mandate/i)).toBeDefined();
    expect(screen.getByText(/Budget Ceiling/i)).toBeDefined();

    // Passport tab
    const passportTab = screen.getByRole('tab', { name: /Passport/i });
    fireEvent.click(passportTab);
    expect(screen.getByText(/Diwali Restock Agent/i)).toBeDefined();
    expect(screen.getByText(/Ed25519 \(v1 Active\)/i)).toBeDefined();

    // Timeline tab
    const roundsTab = screen.getByRole('tab', { name: /Rounds/i });
    fireEvent.click(roundsTab);
    expect(screen.getByText(/Mahalaxmi Agro/i)).toBeDefined();
    expect(screen.getByText(/QuickDrop Wholesale/i)).toBeDefined();

    // Comparison tab
    const comparisonTab = screen.getByRole('tab', { name: /Offers/i });
    fireEvent.click(comparisonTab);
    expect(screen.getByText(/Ranked Offer Matrix/i)).toBeDefined();
    expect(screen.getByText(/#1 Kisan Wholesale/i)).toBeDefined();
  });

  it('respects initial view query param deep linking (?view=mandate)', async () => {
    state.query = 'view=mandate&taskId=task-test-123';
    render(<MiniAppPage />);

    expect(screen.getByText(/Diwali Restock Mandate/i)).toBeDefined();
    expect(screen.getByText(/Task ID: task-test-123/i)).toBeDefined();
  });
});
