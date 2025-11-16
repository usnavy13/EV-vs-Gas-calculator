'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalculatorInputs,
  CalculationResults,
  CostOptionKey,
  UsageScale,
} from '@/types';
import { calculateAllScenarios, formatCurrency } from '@/lib/calculations';
import { fetchNationalGasPrices } from '@/lib/api-services';
import InputSection from '@/components/InputSection';
import SummaryDashboard from '@/components/SummaryDashboard';
import BreakEvenExplorer from '@/components/BreakEvenExplorer';
import HowItWorks from '@/components/HowItWorks';

const defaultInputs: CalculatorInputs = {
  evEfficiency: 3.5,
  gasEfficiency: 25,
  regularGasPrice: 3.5,
  premiumGasPrice: 4.0,
  homeElectricityPrice: 0.15,
  fastChargingPrice: 0.5,
  baseDistance: 30,
};

const SCALE_FACTORS: Record<UsageScale, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export default function Home() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const [usageScale, setUsageScale] = useState<UsageScale>('daily');
  const [gapBaseline, setGapBaseline] = useState<CostOptionKey>('gasRegular');
  const results: CalculationResults = calculateAllScenarios(inputs);

  useEffect(() => {
    let isMounted = true;

    const loadNationalGasPrices = async () => {
      try {
        const data = await fetchNationalGasPrices();
        if (data && isMounted) {
          setInputs((prev) => ({
            ...prev,
            regularGasPrice: data.regular ?? prev.regularGasPrice,
            premiumGasPrice: data.premium ?? prev.premiumGasPrice,
          }));
        }
      } catch (error) {
        console.error('[Home] Failed to load national gas prices', error);
      }
    };

    loadNationalGasPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  const yearlyComparisons = useMemo(
    () => [
      {
        key: 'evHome' as CostOptionKey,
        label: 'EV (Home)',
        value: results.yearly.evHomeCharging.totalCost,
        tone: 'from-emerald-400 to-emerald-500',
      },
      {
        key: 'evFast' as CostOptionKey,
        label: 'EV (Fast)',
        value: results.yearly.evFastCharging.totalCost,
        tone: 'from-indigo-400 to-indigo-500',
      },
      {
        key: 'gasRegular' as CostOptionKey,
        label: 'Gas (Regular)',
        value: results.yearly.gasRegular.totalCost,
        tone: 'from-amber-400 to-amber-500',
      },
      {
        key: 'gasPremium' as CostOptionKey,
        label: 'Gas (Premium)',
        value: results.yearly.gasPremium.totalCost,
        tone: 'from-rose-400 to-rose-500',
      },
    ],
    [results.yearly]
  );

  const bestOption = yearlyComparisons.reduce((acc, item) =>
    item.value < acc.value ? item : acc
  );
  const worstOption = yearlyComparisons.reduce((acc, item) =>
    item.value > acc.value ? item : acc
  );
  const selectedGapBaseline =
    yearlyComparisons.find((option) => option.key === gapBaseline) || worstOption;
  const evHomeOption = yearlyComparisons.find((option) => option.key === 'evHome') || bestOption;
  
  // Compare EV Home vs selected baseline: negative means EV is more expensive (red), positive means EV is cheaper (green)
  const annualGap = selectedGapBaseline.value - evHomeOption.value;

  const displayDistance = inputs.baseDistance * SCALE_FACTORS[usageScale];

  const handleDistanceChange = (value: number) => {
    const multiplier = SCALE_FACTORS[usageScale];
    const normalized = multiplier === 0 ? value : value / multiplier;
    setInputs((prev) => ({
      ...prev,
      baseDistance: Math.max(0, Math.min(1000, normalized)),
    }));
  };

  const handleResetInputs = () => {
    setInputs({ ...defaultInputs });
    setUsageScale('daily');
    setGapBaseline('gasRegular');
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-10">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 lg:gap-14">
        <section className="mx-auto max-w-6xl text-white">
          <div className="grid gap-8 lg:grid-cols-[1fr,1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                EV vs Gas calculator
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-[3.1rem] sm:leading-[1.1]">
                See what electric driving really costs
              </h1>
              <p className="mt-4 text-base text-white/70 sm:text-lg">
                Adjust driving distance, energy prices, and vehicle efficiency to
                compare EV home charging, fast charging, and gas fill-ups side by
                side.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="badge-label border-white/30 bg-white/10 text-white/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Local price lookup
                </span>
                <span className="badge-label border-white/30 bg-white/10 text-white/80">
                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                  Daily to yearly scenarios
                </span>
              </div>
            </div>
            
            <div className="relative flex h-full flex-col rounded-[30px] border border-white/20 bg-white/10 p-6 shadow-inner shadow-black/25 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-white/70">
                  Lowest yearly cost
                </p>
                <p className="text-lg font-semibold text-white">
                  {bestOption.label}
                </p>
              </div>
              <span className="badge-label border-white/30 bg-white/5 text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Based on current inputs
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {yearlyComparisons.map((option) => {
                const width = (option.value / worstOption.value) * 100;
                return (
                  <div key={option.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/80">
                        {option.label}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(option.value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/15">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${option.tone}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto space-y-2 rounded-2xl border border-white/15 bg-black/30 p-4 text-white shadow-[0_20px_60px_rgba(2,2,2,0.55)]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white/70">
                  Gap vs
                </p>
                <select
                  className="rounded-full border border-white/20 bg-slate-800 px-3 py-1 text-xs font-medium text-white"
                  value={gapBaseline}
                  onChange={(event) =>
                    setGapBaseline(event.target.value as CostOptionKey)
                  }
                >
                  {yearlyComparisons.map((option) => (
                    <option key={option.key} value={option.key} className="bg-slate-800 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`text-3xl font-semibold ${
                annualGap < 0 ? 'text-rose-400' : annualGap > 0 ? 'text-emerald-400' : 'text-white'
              }`}>
                {annualGap < 0 ? '-' : ''}{formatCurrency(Math.abs(annualGap))}
              </p>
              <p className="text-sm text-white/70">
                {annualGap === 0 
                  ? `${evHomeOption.label} and ${selectedGapBaseline.label} are equal at ${results.yearly.distance.toLocaleString()} mi/yr`
                  : annualGap < 0
                    ? `${selectedGapBaseline.label} is ${formatCurrency(Math.abs(annualGap))} cheaper than ${evHomeOption.label} at ${results.yearly.distance.toLocaleString()} mi/yr`
                    : `${evHomeOption.label} is ${formatCurrency(annualGap)} cheaper than ${selectedGapBaseline.label} at ${results.yearly.distance.toLocaleString()} mi/yr`
                }
              </p>
            </div>
            </div>
          </div>
        </section>

        <InputSection
          inputs={inputs}
          onChange={setInputs}
          usageScale={usageScale}
          onUsageScaleChange={setUsageScale}
          displayDistance={displayDistance}
          onDistanceChange={handleDistanceChange}
          onResetInputs={handleResetInputs}
        />

        <SummaryDashboard
          inputs={inputs}
          results={results}
          usageScale={usageScale}
          onUsageScaleChange={setUsageScale}
          gapBaseline={gapBaseline}
          onGapBaselineChange={setGapBaseline}
        />

        <BreakEvenExplorer inputs={inputs} />
        <HowItWorks />

        <footer className="rounded-[26px] border border-slate-200/70 bg-white/60 px-6 py-6 text-center text-sm text-slate-500 shadow-lg shadow-slate-900/5">
          <p>
            Analysis factors in mi/kWh vs mpg efficiency, regional fuel inputs,
            and both home and fast-charging strategies.
          </p>
        </footer>
      </div>
    </main>
  );
}

