'use client';

import { useState } from 'react';
import {
  CalculationResults,
  CalculatorInputs,
  UsageScale,
  CostOptionKey,
  ScenarioResult,
} from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface SummaryDashboardProps {
  results: CalculationResults;
  inputs: CalculatorInputs;
  usageScale: UsageScale;
  onUsageScaleChange: (scale: UsageScale) => void;
  gapBaseline: CostOptionKey;
  onGapBaselineChange: (key: CostOptionKey) => void;
}

const scaleLabels: Record<UsageScale, string> = {
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
  yearly: 'per year',
};

type ScenarioCostKey = keyof Omit<ScenarioResult, 'distance'>;

const breakdownKey: Record<CostOptionKey, ScenarioCostKey> = {
  evHome: 'evHomeCharging',
  evFast: 'evFastCharging',
  gasRegular: 'gasRegular',
  gasPremium: 'gasPremium',
};

const optionMeta: Record<
  CostOptionKey,
  {
    label: string;
    dot: string;
    accent: string;
  }
> = {
  evHome: {
    label: 'EV (Home)',
    dot: 'bg-emerald-500',
    accent: 'from-emerald-400/60 via-emerald-300/40 to-emerald-200/20',
  },
  evFast: {
    label: 'EV (Fast)',
    dot: 'bg-indigo-500',
    accent: 'from-indigo-400/60 via-indigo-300/40 to-indigo-200/20',
  },
  gasRegular: {
    label: 'Gas (Regular)',
    dot: 'bg-amber-500',
    accent: 'from-amber-400/60 via-amber-300/40 to-amber-200/20',
  },
  gasPremium: {
    label: 'Gas (Premium)',
    dot: 'bg-rose-500',
    accent: 'from-rose-400/60 via-rose-300/40 to-rose-200/20',
  },
};

export default function SummaryDashboard({
  results,
  inputs,
  usageScale,
  onUsageScaleChange,
  gapBaseline,
  onGapBaselineChange,
}: SummaryDashboardProps) {
  const [expandedKey, setExpandedKey] = useState<CostOptionKey | null>(null);

  const scenario =
    usageScale === 'daily'
      ? results.daily
      : usageScale === 'weekly'
        ? results.weekly
        : usageScale === 'monthly'
          ? results.monthly
          : results.yearly;

  const optionOrder: CostOptionKey[] = [
    'evHome',
    'evFast',
    'gasRegular',
    'gasPremium',
  ];

  const assumptionMap: Record<CostOptionKey, string> = {
    evHome: `${inputs.evEfficiency.toFixed(1)} mi/kWh · ${inputs.homeElectricityPrice.toFixed(2)} $/kWh`,
    evFast: `${inputs.evEfficiency.toFixed(1)} mi/kWh · ${inputs.fastChargingPrice.toFixed(2)} $/kWh`,
    gasRegular: `${inputs.gasEfficiency.toFixed(1)} mpg · ${inputs.regularGasPrice.toFixed(2)} $/gal`,
    gasPremium: `${inputs.gasEfficiency.toFixed(1)} mpg · ${inputs.premiumGasPrice.toFixed(2)} $/gal`,
  };

  const optionRows = optionOrder.map((key) => {
    const meta = optionMeta[key];
    const breakdown = scenario[breakdownKey[key]];
    return {
      key,
      label: meta.label,
      dot: meta.dot,
      accent: meta.accent,
      breakdown,
      assumption: assumptionMap[key],
    };
  });

  const bestOption = optionRows.reduce((min, option) =>
    option.breakdown.totalCost < min.breakdown.totalCost ? option : min
  );
  const maxCost = Math.max(...optionRows.map((option) => option.breakdown.totalCost));
  const gapTarget =
    optionRows.find((option) => option.key === gapBaseline) ?? optionRows[0];
  const gapValue = gapTarget.breakdown.totalCost - bestOption.breakdown.totalCost;

  const distanceLabel = `${scenario.distance.toLocaleString()} mi ${scaleLabels[usageScale]}`;

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-lg shadow-slate-900/5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Summary</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Cost snapshot {scaleLabels[usageScale]}
          </h2>
          <p className="text-sm text-slate-500">
            Based on {distanceLabel}. Toggle the timeframe to compare apples to apples.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="badge-label">Based on current inputs</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <UsageScaleButtons value={usageScale} onChange={onUsageScaleChange} />
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Best option:{' '}
          <span className="font-semibold text-slate-900">{bestOption.label}</span>{' '}
          · {formatCurrency(bestOption.breakdown.totalCost)} {scaleLabels[usageScale]}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Gap vs
            </p>
            <p className="text-3xl font-semibold text-slate-900">
              {formatCurrency(Math.abs(gapValue))}
            </p>
            <p className="text-sm text-slate-500">
              Difference between {bestOption.label} and {gapTarget.label} {scaleLabels[usageScale]}.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Baseline
            </label>
            <select
              value={gapBaseline}
              onChange={(event) =>
                onGapBaselineChange(event.target.value as CostOptionKey)
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {optionRows.map((option) => (
                <option key={option.key} value={option.key} className="bg-white text-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {optionRows.map((option) => {
          const percentage =
            maxCost === 0
              ? 0
              : (option.breakdown.totalCost / maxCost) * 100;
          const delta = option.breakdown.totalCost - bestOption.breakdown.totalCost;
          const deltaLabel =
            delta === 0
              ? 'Best price'
              : `${delta > 0 ? '+' : '-'}${formatCurrency(Math.abs(delta))} vs ${bestOption.label}`;
          const isExpanded = expandedKey === option.key;
          return (
            <div
              key={option.key}
              className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm shadow-slate-900/5"
            >
              <button
                type="button"
                className="flex w-full flex-col gap-3 text-left"
                onClick={() =>
                  setExpandedKey((prev) => (prev === option.key ? null : option.key))
                }
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                    {option.label}
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Details
                    <svg
                      className={`h-3 w-3 transition ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M3 5l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-500">Total cost</p>
                    <div className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(option.breakdown.totalCost)}
                    </div>
                    <p className="text-xs text-slate-500">Cost per mile</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(option.breakdown.costPerMile)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        delta === 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      {deltaLabel}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${option.accent}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
              {isExpanded && (
                <div className="mt-4 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Energy cost
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {formatCurrency(option.breakdown.fuelCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fees & extras
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      Included (0)
                    </p>
                    <p className="text-xs text-slate-500">
                      We only model energy/fuel cost for now.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assumptions
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {option.assumption}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UsageScaleButtons({
  value,
  onChange,
}: {
  value: UsageScale;
  onChange: (scale: UsageScale) => void;
}) {
  const options: { value: UsageScale; label: string }[] = [
    { value: 'daily', label: 'Day' },
    { value: 'weekly', label: 'Week' },
    { value: 'monthly', label: 'Month' },
    { value: 'yearly', label: 'Year' },
  ];

  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented-control__item ${
            value === option.value ? 'is-active' : ''
          }`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
