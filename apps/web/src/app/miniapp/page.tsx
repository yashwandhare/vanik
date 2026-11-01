'use client';

import React, { Suspense } from 'react';
import { LiveWorkflow } from '../../components/LiveWorkflow';

export default function MiniAppPage() {
  return <Suspense fallback={<div className="vanik-container py-16" role="status">Loading Telegram Mini App…</div>}><LiveWorkflow miniapp /></Suspense>;
}
