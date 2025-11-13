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
  gasType: 'regular',
};

export default function Home() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const results: CalculationResults = calculateAllScenarios(inputs);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            EV vs Gas Calculator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Compare the real-world costs of electric vehicles and gas-powered cars
          </p>
        </div>

        {/* Input Section */}
        <div className="mb-8">
          <InputSection inputs={inputs} onChange={setInputs} />
        </div>

        {/* Chart Visualization */}
        <div className="mb-8">
          <CostChart results={results} />
        </div>

        {/* Distance Scenarios */}
        <div>
          <DistanceScenarios results={results} />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Calculator factors in efficiency (mi/kWh vs mpg), fuel costs, and charging options
          </p>
        </footer>
      </div>
    </main>
  );
}

