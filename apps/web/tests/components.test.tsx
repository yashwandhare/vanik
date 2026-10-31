import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PassportCard } from '../src/components/PassportCard';
import { SimulatedBanner } from '../src/components/SimulatedBanner';
import { ErrorAlert } from '../src/components/ErrorAlert';
import { FIXTURE_AGENT_PASSPORT, FIXTURE_ERROR } from '../src/lib/fixtures';

describe('Web Components', () => {
  it('renders SimulatedBanner with warning text', () => {
    render(<SimulatedBanner />);
    expect(screen.getByText(/SIMULATED \/ SYNTHETIC DEMO ENVIRONMENT/i)).toBeDefined();
    expect(screen.getByText(/DEMO MODE/i)).toBeDefined();
  });

  it('renders PassportCard with agent identity and Ed25519 fingerprint', () => {
    render(<PassportCard passport={FIXTURE_AGENT_PASSPORT} isMock={true} />);
    expect(screen.getByText('Diwali Buyer')).toBeDefined();
    expect(screen.getByText('buyer')).toBeDefined();
    expect(screen.getByText(/Ed25519 Signing Identity/i)).toBeDefined();
    expect(screen.getByText(FIXTURE_AGENT_PASSPORT.signing_key.fingerprint)).toBeDefined();
    expect(screen.getByText('demo verified')).toBeDefined();
    expect(screen.getByText('FIXTURE')).toBeDefined();
  });

  it('renders ErrorAlert with error envelope details and request_id', () => {
    render(<ErrorAlert error={FIXTURE_ERROR.error} />);
    expect(screen.getByText('validation_error')).toBeDefined();
    expect(screen.getByText('Request validation failed.')).toBeDefined();
    expect(screen.getByText('body.email')).toBeDefined();
    expect(screen.getByText('Must be a valid email address.')).toBeDefined();
    expect(screen.getByText(/Request ID: 40000000-0000-4000-8000-000000000001/i)).toBeDefined();
  });
});
