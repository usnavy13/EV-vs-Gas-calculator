'use client';

import { ScenarioResult } from '@/types';
import { formatCurrency, calculateSavings } from '@/lib/calculations';

interface ResultsDisplayProps {
  scenario: ScenarioResult;
  scenarioName: string;
}

export default function ResultsDisplay({ scenario, scenarioName }: ResultsDisplayProps) {
  // Find the best option among all choices
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {scenarioName} ({scenario.distance.toLocaleString()} miles)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* EV Home Charging */}
        <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
            EV (Home Charging)
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cost per mile: <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(scenario.evHomeCharging.costPerMile)}
              </span>
            </p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              Total: {formatCurrency(scenario.evHomeCharging.totalCost)}
            </p>
          </div>
        </div>

        {/* EV Fast Charging */}
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            EV (Fast Charging)
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cost per mile: <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(scenario.evFastCharging.costPerMile)}
              </span>
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              Total: {formatCurrency(scenario.evFastCharging.totalCost)}
            </p>
          </div>
        </div>

        {/* Gas Regular */}
        <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
          <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">
            Gas (Regular)
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cost per mile: <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(scenario.gasRegular.costPerMile)}
              </span>
            </p>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
              Total: {formatCurrency(scenario.gasRegular.totalCost)}
            </p>
          </div>
        </div>

        {/* Gas Premium */}
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            Gas (Premium)
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cost per mile: <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(scenario.gasPremium.costPerMile)}
              </span>
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">
              Total: {formatCurrency(scenario.gasPremium.totalCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Best Option:
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {bestOption.name}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Savings vs Worst:
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(savings)} ({Math.abs(savingsPercent).toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

