'use client';

import { CalculationResults } from '@/types';
import ResultsDisplay from './ResultsDisplay';

interface DistanceScenariosProps {
  results: CalculationResults;
}

export default function DistanceScenarios({ results }: DistanceScenariosProps) {
  return (
    <section className="card-surface bg-white/95 p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Scenarios</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Daily through yearly comparisons
          </h2>
          <p className="text-sm text-slate-500">
            These cards reuse the distance you entered and scale it automatically.
          </p>
        </div>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
          Hover for details
        </span>
      </div>

      <div className="space-y-5">
        <ResultsDisplay scenario={results.daily} scenarioName="Daily" />
        <ResultsDisplay scenario={results.weekly} scenarioName="Weekly" />
        <ResultsDisplay scenario={results.monthly} scenarioName="Monthly" />
        <ResultsDisplay scenario={results.yearly} scenarioName="Yearly" />
      </div>
    </section>
  );
}

