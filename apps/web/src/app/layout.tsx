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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F6EDD9] text-[#1E1A1C] antialiased min-h-screen flex flex-col font-['Space_Grotesk',sans-serif]">
        <SimulatedBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t-[1.5px] border-[#CDBB98] bg-[#EDE0C4] py-10 text-center text-xs text-[#6B5A4B]">
          <div className="vanik-container space-y-2">
            <p className="font-extrabold uppercase tracking-widest text-[#1E1A1C] text-sm">
              VANIK • Autonomous Commerce. Verifiable Trust.
            </p>
            <p className="text-[#8C7E70] font-mono text-[11px] max-w-xl mx-auto">
              Prototype environment for AI-02 hackathon track. All GSTIN, PAN, official credentials, and UPI payment settlements are synthetic simulations.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
