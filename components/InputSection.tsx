'use client';

import { CalculatorInputs } from '@/types';
import PriceLookup from './PriceLookup';

interface InputSectionProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
}

export default function InputSection({ inputs, onChange }: InputSectionProps) {
  const handleChange = (field: keyof CalculatorInputs, value: string | number) => {
    onChange({
      ...inputs,
      [field]: value,
    });
  };

  const handleUpdate = (updates: Partial<CalculatorInputs>) => {
    onChange({
      ...inputs,
      ...updates,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Input Parameters
      </h2>

      {/* Price Lookup Component */}
      <PriceLookup inputs={inputs} onUpdate={handleUpdate} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EV Efficiency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            EV Efficiency (mi/kWh)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={inputs.evEfficiency}
            onChange={(e) => handleChange('evEfficiency', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="3.5"
          />
        </div>

        {/* Gas Efficiency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gas Car Efficiency (mpg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={inputs.gasEfficiency}
            onChange={(e) => handleChange('gasEfficiency', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="25"
          />
        </div>

        {/* Regular Gas Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Regular Gas Price ($/gallon)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={inputs.regularGasPrice}
            onChange={(e) => handleChange('regularGasPrice', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="3.50"
          />
        </div>

        {/* Premium Gas Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Premium Gas Price ($/gallon)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={inputs.premiumGasPrice}
            onChange={(e) => handleChange('premiumGasPrice', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="4.00"
          />
        </div>

        {/* Home Electricity Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Home Charging ($/kWh)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={inputs.homeElectricityPrice}
            onChange={(e) => handleChange('homeElectricityPrice', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="0.12"
          />
        </div>

        {/* Fast Charging Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fast Charging ($/kWh)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={inputs.fastChargingPrice}
            onChange={(e) => handleChange('fastChargingPrice', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="0.40"
          />
        </div>

        {/* Base Distance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base Distance (miles)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={inputs.baseDistance}
            onChange={(e) => handleChange('baseDistance', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="30"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used as daily distance for calculating weekly/monthly/yearly scenarios
          </p>
        </div>

        {/* Gas Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gas Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gasType"
                value="regular"
                checked={inputs.gasType === 'regular'}
                onChange={(e) => handleChange('gasType', e.target.value as 'regular' | 'premium')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Regular</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gasType"
                value="premium"
                checked={inputs.gasType === 'premium'}
                onChange={(e) => handleChange('gasType', e.target.value as 'regular' | 'premium')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Premium</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

