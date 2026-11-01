import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NegotiationsPage from '../src/app/negotiations/page';
import MiniAppPage from '../src/app/miniapp/page';
import { challengeMatches } from '../src/components/LiveWorkflow';
import type { DealResponse, TaskResponse, ApprovalChallengeResponse } from '../src/lib/types';
import taskFixture from '../../../packages/shared-schemas/v1/fixtures/TaskResponse.json';
import dealFixture from '../../../packages/shared-schemas/v1/fixtures/DealResponse.json';
import challengeFixture from '../../../packages/shared-schemas/v1/fixtures/ApprovalChallengeResponse.json';

const state = vi.hoisted(() => ({ query: '' }));
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), listTasks: vi.fn(), listDeals: vi.fn(), getTask: vi.fn(),
  taskNegotiations: vi.fn(), launchTask: vi.fn(), getDeal: vi.fn(), challenge: vi.fn(),
  approve: vi.fn(), settle: vi.fn(), receipt: vi.fn(), security: vi.fn(), getAgentPassport: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock('../src/lib/api-client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/api-client')>(), apiClient: mocks,
}));
let task: TaskResponse;
let deal: DealResponse;
let challenge: ApprovalChallengeResponse;
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); window.history.replaceState(null, '', '/negotiations');
  task = structuredClone(taskFixture) as TaskResponse;
  deal = { ...structuredClone(dealFixture), expires_at: new Date(Date.now() + 3600000).toISOString() } as DealResponse;
  challenge = { ...structuredClone(challengeFixture), expires_at: new Date(Date.now() + 600000).toISOString() };
  state.query = `taskId=${task.id}&view=timeline`;
  mocks.getSession.mockResolvedValue({ data: { user: { id: 'synthetic-user' }, csrf_token: 'test-csrf' } });
  mocks.listTasks.mockImplementation(async () => ({ data: { items: [task] } }));
  mocks.listDeals.mockResolvedValue({ data: { items: [] } });
  mocks.getTask.mockImplementation(async () => ({ data: task }));
  mocks.taskNegotiations.mockResolvedValue({ data: { task_id: task.id, items: [], recommendation_offer_id: null } });
  mocks.getDeal.mockImplementation(async () => ({ data: { ...deal } }));
  mocks.challenge.mockImplementation(async () => ({ data: challenge }));
});
afterEach(cleanup);

describe.each([['Web', NegotiationsPage], ['Mini App', MiniAppPage]] as const)('%s live workflow', (_name, Page) => {
  it('creates no fixture outcomes when launch fails', async () => {
    mocks.launchTask.mockRejectedValue(new Error('network unavailable'));
    render(<Page />);
    const launch = await screen.findByRole('button', { name: 'Launch Negotiations' });
    fireEvent.click(launch);
    await screen.findByText(/Action failed or outcome could not be confirmed.*network unavailable/);
    expect(mocks.launchTask).toHaveBeenCalledWith(task.id);
    expect(screen.queryByText(/RECOMMENDED/)).toBeNull();
    expect(screen.queryByText(/UPI-SIM/)).toBeNull();
    expect(mocks.approve).not.toHaveBeenCalled();
  });

  it('launches only through the backend and reloads persisted state', async () => {
    mocks.launchTask.mockImplementation(async () => { task = { ...task, status: 'running' }; return { data: { task_id: task.id, items: [] } }; });
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'Launch Negotiations' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Launch Negotiations' })).toBeNull());
    expect(await screen.findByText('running', { selector: 'strong' })).toBeDefined();
    expect(mocks.taskNegotiations).toHaveBeenCalledWith(task.id);
  });

  it('requires a matching challenge then a separate mock settlement', async () => {
    state.query = `dealId=${deal.id}&view=approval`;
    mocks.listDeals.mockImplementation(async () => ({ data: { items: [deal] } }));
    mocks.approve.mockImplementation(async () => { deal = { ...deal, status: 'approved' }; return { data: deal }; });
    const receipt = { label: 'MOCK UPI / NO FUNDS MOVED', reference: 'BACKEND-MOCK-RECEIPT', amount: '120', contracted_total: '600', balance_due: '480', status: 'succeeded' };
    mocks.settle.mockImplementation(async () => { deal = { ...deal, status: 'settled' }; return { data: receipt }; });
    mocks.receipt.mockResolvedValue({ data: receipt });
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request Approval Challenge' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Exact Deal Terms' }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith(deal.id, {
      challenge_id: challenge.challenge_id, deal_version: challenge.deal_version, terms_hash: challenge.terms_hash, nonce: challenge.nonce,
    }));
    expect(mocks.settle).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Settle Mock Payment' }));
    expect(await screen.findByText('MOCK UPI / NO FUNDS MOVED')).toBeDefined();
    expect(mocks.settle).toHaveBeenCalledWith(deal.id, expect.any(String));
  });

  it('refuses stale terms before posting approval', async () => {
    state.query = `dealId=${deal.id}&view=approval`;
    mocks.listDeals.mockResolvedValue({ data: { items: [deal] } });
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request Approval Challenge' }));
    const approve = await screen.findByRole('button', { name: 'Approve Exact Deal Terms' });
    deal = { ...deal, version: 2, terms_hash: 'c'.repeat(64) };
    fireEvent.click(approve);
    expect(await screen.findByText(/Deal terms\/version changed/)).toBeDefined();
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.settle).not.toHaveBeenCalled();
  });
});

it('challenge guard rejects expired or different deal references', () => {
  expect(challengeMatches(deal, challenge)).toBe(true);
  expect(challengeMatches(deal, { ...challenge, deal_id: 'other' })).toBe(false);
  expect(challengeMatches(deal, challenge, Date.parse(challenge.expires_at) + 1)).toBe(false);
});
