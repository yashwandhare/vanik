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
    <html lang="en">
      <body className="bg-[#f8f9eb] text-[#000000] antialiased min-h-screen flex flex-col font-['Space_Grotesk',sans-serif]">
        <SimulatedBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t-[1.5px] border-[#c0c2a9] bg-[#edeee1] py-10 text-center text-xs text-[#5a5a4f]">
          <div className="max-w-[1200px] mx-auto px-4 space-y-2">
            <p className="font-extrabold uppercase tracking-widest text-[#000000] text-sm">
              VANIK • Autonomous Commerce. Verifiable Trust.
            </p>
            <p className="text-[#7c7d76] font-mono text-[11px] max-w-xl mx-auto">
              Prototype environment for AI-02 hackathon track. All GSTIN, PAN, official credentials, and UPI payment settlements are synthetic simulations.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
