'use client';

import { useState } from 'react';
import { CalculatorInputs, CalculationResults } from '@/types';
import { calculateAllScenarios } from '@/lib/calculations';
import InputSection from '@/components/InputSection';
import DistanceScenarios from '@/components/DistanceScenarios';
import CostChart from '@/components/CostChart';

const defaultInputs: CalculatorInputs = {
  evEfficiency: 3.5,
  gasEfficiency: 25,
  regularGasPrice: 3.50,
  premiumGasPrice: 4.00,
  homeElectricityPrice: 0.12,
  fastChargingPrice: 0.40,
  baseDistance: 30,
};

export default function Home() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const results: CalculationResults = calculateAllScenarios(inputs);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            EV vs Gas Calculator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Compare the real-world costs of electric vehicles and gas-powered cars
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Compare EV (Home & Fast Charging) vs Gas (Regular & Premium)
          </p>
        </div>

        {/* Input Section */}
        <InputSection inputs={inputs} onChange={setInputs} />

        {/* Chart Visualization */}
        <CostChart results={results} />

        {/* Distance Scenarios */}
        <DistanceScenarios results={results} />

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Calculator factors in efficiency (mi/kWh vs mpg), fuel costs, and charging options
          </p>
        </footer>
      </div>
    </main>
  );
}

