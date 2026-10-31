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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Marketplace Catalogue & 40-SKU Basket</h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              PHASE 0 SHELL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Standardized SKU catalogue for Diwali kirana restock with benchmark reference prices.
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          Benchmark Count: <span className="font-mono text-indigo-400 font-bold">40 distinct SKUs</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <input
          type="text"
          placeholder="Search by SKU or item name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />

        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                category === c
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">SKU Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Benchmark Price (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-indigo-300 font-semibold">{item.sku}</td>
                <td className="px-4 py-3 text-slate-200 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-800 rounded text-[11px]">{item.category}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 capitalize">{item.unit}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                  ₹{item.benchmarkPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
        <span>Backend Catalogue API is slated for Phase 2 by Main.</span>
        <span className="text-[11px] font-mono text-slate-500">Ref: docs/delivery/PROJECT_TODO.md</span>
      </div>
    </div>
  );
}
