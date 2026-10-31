import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';
import { SimulatedBanner } from '../components/SimulatedBanner';

export const metadata: Metadata = {
  title: 'VANIK — Autonomous B2B Marketplace',
  description: 'Agentic B2B marketplace where verified businesses negotiate commercial terms via AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">
        <SimulatedBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p>VANIK — Autonomous commerce. Verifiable trust.</p>
            <p className="text-slate-600">
              Prototype environment for AI-02 hackathon. All GSTIN, PAN, and payment settlement flows are synthetic simulations.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
