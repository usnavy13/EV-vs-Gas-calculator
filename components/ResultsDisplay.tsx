'use client';

import { ScenarioResult } from '@/types';
import { formatCurrency, calculateSavings } from '@/lib/calculations';

interface ResultsDisplayProps {
  scenario: ScenarioResult;
  scenarioName: string;
}

export default function ResultsDisplay({ scenario, scenarioName }: ResultsDisplayProps) {
  const allCosts = [
    { name: 'EV (Home)', cost: scenario.evHomeCharging.totalCost },
    { name: 'EV (Fast)', cost: scenario.evFastCharging.totalCost },
    { name: 'Gas (Regular)', cost: scenario.gasRegular.totalCost },
    { name: 'Gas (Premium)', cost: scenario.gasPremium.totalCost },
  ];

  const bestOption = allCosts.reduce((min, option) =>
    option.cost < min.cost ? option : min
  );
  const worstOption = allCosts.reduce((max, option) =>
    option.cost > max.cost ? option : max
  );
  const savings = worstOption.cost - bestOption.cost;
  const savingsPercent = calculateSavings(bestOption.cost, worstOption.cost);

  const optionCards = [
    {
      title: 'EV · Home charging',
      data: scenario.evHomeCharging,
      accent: 'from-emerald-50 to-white',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
    },
    {
      title: 'EV · Fast charging',
      data: scenario.evFastCharging,
      accent: 'from-indigo-50 to-white',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
    },
    {
      title: 'Gas · Regular',
      data: scenario.gasRegular,
      accent: 'from-amber-50 to-white',
      border: 'border-amber-200',
      text: 'text-amber-900',
    },
    {
      title: 'Gas · Premium',
      data: scenario.gasPremium,
      accent: 'from-rose-50 to-white',
      border: 'border-rose-200',
      text: 'text-rose-900',
    },
  ];

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-inner shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">{scenarioName}</p>
          <h3 className="text-xl font-semibold text-slate-900">
            {scenario.distance.toLocaleString()} miles ·{' '}
            {formatCurrency(bestOption.cost)} – {formatCurrency(worstOption.cost)}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Best option</p>
          <p className="text-lg font-semibold text-slate-900">{bestOption.name}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {optionCards.map((option) => (
          <div
            key={option.title}
            className={`rounded-2xl border ${option.border} bg-gradient-to-b ${option.accent} p-4`}
          >
            <p className={`text-sm font-semibold ${option.text}`}>{option.title}</p>
            <p className="mt-2 text-xs text-slate-500">Cost per mile</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(option.data.costPerMile)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Total cost</p>
            <p className="text-xl font-semibold text-slate-900">
              {formatCurrency(option.data.totalCost)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4">
        <div>
          <p className="text-xs text-slate-500">Savings vs highest cost</p>
          <p className="text-lg font-semibold text-emerald-600">
            {formatCurrency(savings)} ({Math.abs(savingsPercent).toFixed(1)}%)
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Comparing EV home charging with gas premium in this scenario.
        </p>
      </div>
    </div>
  );
}

