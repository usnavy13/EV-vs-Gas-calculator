'use client';

import { CalculationResults } from '@/types';
import ResultsDisplay from './ResultsDisplay';

interface DistanceScenariosProps {
  results: CalculationResults;
}

export default function DistanceScenarios({ results }: DistanceScenariosProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Cost Comparison by Scenario
      </h2>

      <ResultsDisplay scenario={results.daily} scenarioName="Daily" />
      <ResultsDisplay scenario={results.weekly} scenarioName="Weekly" />
      <ResultsDisplay scenario={results.monthly} scenarioName="Monthly" />
      <ResultsDisplay scenario={results.yearly} scenarioName="Yearly" />
    </div>
  );
}

