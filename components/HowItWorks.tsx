'use client';

import { useState } from 'react';

export default function HowItWorks() {
  const [isExpanded, setIsExpanded] = useState(false);

  const faqs = [
    {
      question: 'Are these costs accurate?',
      answer: 'The calculator uses EPA-rated efficiency values and real-world pricing data. However, actual costs may vary based on driving habits, weather conditions, and local pricing fluctuations. This calculator focuses on fuel/charging costs only and does not include maintenance, insurance, or purchase price.',
    },
    {
      question: 'What about maintenance, insurance, and purchase price?',
      answer: 'This calculator focuses specifically on fuel and charging costs. For a complete comparison, you should also consider: vehicle purchase price, maintenance costs (EVs typically have lower maintenance), insurance rates, tax incentives, and resale value. EVs often have higher upfront costs but lower operating costs.',
    },
    {
      question: 'How accurate is the home vs fast charging comparison?',
      answer: 'Most EV owners charge 80-90% of the time at home, which is much cheaper. Fast charging is typically used for road trips or emergencies. The calculator shows both scenarios so you can see the best-case (home) and worst-case (fast charging) costs. Your actual costs will likely fall somewhere in between.',
    },
    {
      question: 'Does this account for cold weather impact on EVs?',
      answer: 'The calculator uses EPA-rated efficiency values, which are tested under standard conditions. In cold weather, EV efficiency can drop by 20-40% due to battery heating needs. Gas vehicles also see reduced efficiency in cold weather, typically 10-20%. For accurate cold-weather comparisons, you may want to adjust efficiency values manually.',
    },
    {
      question: 'What about time-of-use electricity rates?',
      answer: 'Many utilities offer time-of-use rates where electricity is cheaper during off-peak hours (often overnight). The calculator uses average residential rates. If you have time-of-use rates and charge during off-peak hours, your actual costs may be even lower than shown.',
    },
  ];

  return (
    <section className="card-surface overflow-hidden bg-white/95">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-4 border-b border-slate-100 bg-slate-900 px-6 py-5 text-left text-white"
        aria-expanded={isExpanded}
      >
        <div>
          <p className="text-sm font-semibold text-white/70">Need a refresher?</p>
          <h2 className="text-2xl font-semibold">How the calculator works</h2>
        </div>
        <svg
          className={`h-6 w-6 text-white/70 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-3">
          <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-inner shadow-slate-900/5">
            <h3 className="text-sm font-semibold text-slate-600">What goes into the math</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                <strong>EV efficiency:</strong> Miles per kWh (mi/kWh). Higher numbers mean less
                energy needed.
              </li>
              <li>
                <strong>Gas efficiency:</strong> Miles per gallon (mpg). The calculator uses the same
                miles for EV and gas so the comparison stays fair.
              </li>
              <li>
                <strong>Distance scaling:</strong> Daily miles roll up automatically to weekly,
                monthly, and yearly totals.
              </li>
              <li>
                <strong>Formula:</strong> (Distance ÷ Efficiency) × Price per unit = Cost.
              </li>
            </ul>
          </div>
          <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-inner shadow-slate-900/5">
            <h3 className="text-sm font-semibold text-slate-600">Common questions</h3>
            <div className="space-y-3">
              {faqs.slice(0, 3).map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-sm font-semibold text-slate-900">{faq.question}</p>
                  <p className="text-xs text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-inner shadow-slate-900/5">
            <h3 className="text-sm font-semibold text-slate-600">Data notes</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>EPA fuel-economy data for efficiency presets.</li>
              <li>Electricity rates from the EIA and other public APIs.</li>
              <li>Gas prices from regional fuel price feeds.</li>
              <li>Adjust anything manually if you have better numbers.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

