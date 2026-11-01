'use client';

import React, { Suspense } from 'react';
import { LiveWorkflow } from '../../components/LiveWorkflow';

export default function NegotiationsPage() {
  return <Suspense fallback={<div className="vanik-container py-16" role="status">Loading Negotiations Workspace…</div>}><LiveWorkflow /></Suspense>;
}
