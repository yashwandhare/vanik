import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import MiniAppPage from '../src/app/miniapp/page';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), listTasks: vi.fn(), listDeals: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('view=approval') }));
vi.mock('../src/lib/api-client', async (original) => ({ ...await original<typeof import('../src/lib/api-client')>(), apiClient: mocks }));
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
it('requires an authenticated session and never displays a fixture deal', async () => {
  mocks.getSession.mockRejectedValue(new Error('Session expired'));
  render(<MiniAppPage />);
  expect(await screen.findByRole('link', { name: 'Sign in to VANIK' })).toBeDefined();
  expect(screen.queryByText(/UPI-SIM/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Approve Exact/ })).toBeNull();
  expect(mocks.listTasks).not.toHaveBeenCalled();
});
it('shows honest empty state for an authenticated user without a deal', async () => {
  mocks.getSession.mockResolvedValue({ data: { user: { id: 'test-user' } } });
  mocks.listTasks.mockResolvedValue({ data: { items: [] } });
  mocks.listDeals.mockResolvedValue({ data: { items: [] } });
  render(<MiniAppPage />);
  expect(await screen.findByText(/No authorized deal loaded/)).toBeDefined();
  expect(screen.queryByText(/DEAL APPROVED & SETTLED/)).toBeNull();
});
