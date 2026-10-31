import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentsPage from '../src/app/agents/page';
import PrincipalsPage from '../src/app/principals/page';

const state = vi.hoisted(() => ({ query: '' }));
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  listAgents: vi.fn(),
  getPrincipal: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.query),
}));
vi.mock('../src/lib/api-client', () => ({
  apiClient: mocks,
  ApiClientError: class extends Error {},
}));

beforeEach(() => {
  state.query = '';
  sessionStorage.clear();
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { csrf_token: 'synthetic-test-token' } });
  mocks.listAgents.mockResolvedValue({ data: { items: [] }, isMock: false });
});
afterEach(cleanup);

describe('Principal selection and modal accessibility', () => {
  it('does not load a seeded identity when no principal is selected', async () => {
    render(<PrincipalsPage />);
    await screen.findByText(/No business principal selected/i);
    expect(mocks.getPrincipal).not.toHaveBeenCalled();
  });

  it('does not load an agent roster without a selected principal', async () => {
    render(<AgentsPage />);
    await screen.findByText(/Select or register a business principal/i);
    expect(mocks.listAgents).not.toHaveBeenCalled();
  });

  it('contains Tab focus in the dialog and restores it on Escape', async () => {
    state.query = 'principalId=20000000-0000-4000-8000-000000000002';
    render(<AgentsPage />);
    await waitFor(() => expect(mocks.listAgents).toHaveBeenCalled());
    const trigger = screen.getByRole('button', { name: /Spawn New Agent/i });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Agent Name')));
    const controls = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});
