'use client';

import React, { useState } from 'react';

// Representative 40-SKU Diwali Restock catalogue items
const SAMPLE_40_SKUS = [
  { id: '1', sku: 'RICE-BASMATI-5KG', name: 'Premium Basmati Rice 5kg', category: 'Staples', unit: 'bag', benchmarkPrice: '450.00' },
  { id: '2', sku: 'RICE-KOLAM-25KG', name: 'Kolam Rice Bag 25kg', category: 'Staples', unit: 'bag', benchmarkPrice: '1450.00' },
  { id: '3', sku: 'ATTA-CHAKKI-10KG', name: 'Chakki Fresh Wheat Atta 10kg', category: 'Staples', unit: 'bag', benchmarkPrice: '380.00' },
  { id: '4', sku: 'MAIDA-PREMIUM-1KG', name: 'Refined Wheat Flour (Maida) 1kg', category: 'Staples', unit: 'packet', benchmarkPrice: '42.00' },
  { id: '5', sku: 'SUGAR-M30-5KG', name: 'Refined Sugar M-30 Grade 5kg', category: 'Staples', unit: 'bag', benchmarkPrice: '210.00' },
  { id: '6', sku: 'OIL-SUNFLOWER-1L', name: 'Refined Sunflower Cooking Oil 1L', category: 'Edible Oils', unit: 'pouch', benchmarkPrice: '135.00' },
  { id: '7', sku: 'OIL-MUSTARD-1L', name: 'Kachi Ghani Mustard Oil 1L', category: 'Edible Oils', unit: 'bottle', benchmarkPrice: '150.00' },
  { id: '8', sku: 'GHEE-COW-1L', name: 'Pure Cow Ghee 1L Tin', category: 'Dairy & Sweets', unit: 'tin', benchmarkPrice: '620.00' },
  { id: '9', sku: 'DAL-TOOR-PREMIUM-1KG', name: 'Polished Toor Dal 1kg', category: 'Pulses', unit: 'packet', benchmarkPrice: '165.00' },
  { id: '10', sku: 'DAL-MOONG-YELLOW-1KG', name: 'Yellow Moong Dal Split 1kg', category: 'Pulses', unit: 'packet', benchmarkPrice: '120.00' },
  { id: '11', sku: 'DAL-CHANA-1KG', name: 'Desi Chana Dal 1kg', category: 'Pulses', unit: 'packet', benchmarkPrice: '95.00' },
  { id: '12', sku: 'DAL-URAD-GOTA-1KG', name: 'White Urad Gota Whole 1kg', category: 'Pulses', unit: 'packet', benchmarkPrice: '140.00' },
  { id: '13', sku: 'DRYFRUIT-CASHEW-W240', name: 'Premium Cashews W240 500g', category: 'Dry Fruits', unit: 'box', benchmarkPrice: '480.00' },
  { id: '14', sku: 'DRYFRUIT-ALMOND-CALIF', name: 'California Almonds 500g', category: 'Dry Fruits', unit: 'box', benchmarkPrice: '420.00' },
  { id: '15', sku: 'DRYFRUIT-RAISIN-GREEN', name: 'Green Kishmish (Raisins) 500g', category: 'Dry Fruits', unit: 'packet', benchmarkPrice: '180.00' },
  { id: '16', sku: 'DRYFRUIT-PISTA-ROAST', name: 'Roasted Salted Pistachios 250g', category: 'Dry Fruits', unit: 'pouch', benchmarkPrice: '310.00' },
  { id: '17', sku: 'SPICE-CARDAMOM-8MM', name: 'Green Cardamom (Elaichi) 8mm 100g', category: 'Spices', unit: 'bottle', benchmarkPrice: '280.00' },
  { id: '18', sku: 'SPICE-CLOVE-WHOLE', name: 'Selected Whole Cloves (Laung) 100g', category: 'Spices', unit: 'packet', benchmarkPrice: '110.00' },
  { id: '19', sku: 'SPICE-BLACKPEPPER', name: 'Malabar Black Pepper 100g', category: 'Spices', unit: 'packet', benchmarkPrice: '90.00' },
  { id: '20', sku: 'SPICE-CINNAMON-STICK', name: 'Ceylon Cinnamon Quills 100g', category: 'Spices', unit: 'packet', benchmarkPrice: '85.00' },
];

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Staples', 'Edible Oils', 'Dairy & Sweets', 'Pulses', 'Dry Fruits', 'Spices'];

  const filtered = SAMPLE_40_SKUS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || item.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-[#c0c2a9] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7c7d76] font-bold">
              [ MANDI COMMODITY LEDGER ]
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#aafdc0] text-[#003d21] border border-[#000000] font-bold">
              PHASE 0 SHELL
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] tracking-tight">
            Diwali Restock Catalogue (40 SKU Basket)
          </h1>
          <p className="text-xs text-[#5a5a4f] mt-1">
            Standardized wholesale commodities with seed benchmark reference prices to prevent fraudulent discount inflation.
          </p>
        </div>

        <div className="text-xs text-[#202020] bg-[#ffffff] border-[1.5px] border-[#000000] px-4 py-2 rounded-[13px] font-mono font-bold">
          Benchmark Scope: <span className="text-[#003d21]">40 Distinct SKUs</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#ffffff] border-[1.5px] border-[#000000] p-4 rounded-[16px]">
        <input
          type="text"
          placeholder="Filter by SKU code or product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3.5 py-2 bg-[#f8f9eb] border border-[#c0c2a9] rounded-[9px] text-xs text-[#000000] font-medium focus:outline-none focus:border-[#000000]"
        />

        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                category === c
                  ? 'bg-[#202020] text-white border border-[#000000]'
                  : 'bg-[#f8f9eb] text-[#5a5a4f] hover:text-[#000000] border border-[#c0c2a9]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#ffffff] border-[1.5px] border-[#000000] rounded-[22px] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8f9eb] text-[#202020] uppercase font-mono tracking-wider border-b-[1.5px] border-[#000000]">
            <tr>
              <th className="px-5 py-3.5">SKU Code</th>
              <th className="px-5 py-3.5">Product Name</th>
              <th className="px-5 py-3.5">Category</th>
              <th className="px-5 py-3.5">Unit</th>
              <th className="px-5 py-3.5 text-right">Benchmark Price (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c0c2a9] font-sans">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[#f8f9eb]/60 transition-colors">
                <td className="px-5 py-3.5 font-mono text-[#000000] font-bold">{item.sku}</td>
                <td className="px-5 py-3.5 text-[#202020] font-semibold">{item.name}</td>
                <td className="px-5 py-3.5 text-[#5a5a4f]">
                  <span className="px-2.5 py-0.5 bg-[#f8f9eb] border border-[#c0c2a9] rounded-full text-[11px] font-mono">
                    {item.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#7c7d76] capitalize font-mono">{item.unit}</td>
                <td className="px-5 py-3.5 text-right font-mono text-[#003d21] font-bold text-sm">
                  ₹{item.benchmarkPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-[#ffffff] border border-[#c0c2a9] rounded-[13px] text-xs text-[#5a5a4f] flex flex-wrap items-center justify-between gap-2">
        <span>Backend Catalogue API is slated for Phase 2 by Main.</span>
        <span className="font-mono text-[#7c7d76] text-[11px]">Ref: docs/delivery/PROJECT_TODO.md</span>
      </div>
    </div>
  );
}
