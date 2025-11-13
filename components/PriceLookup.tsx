'use client';

import { useState } from 'react';
import { fetchGasPricesByZip, fetchElectricityRatesByZip, validateZipCode } from '@/lib/api-services';
import { CalculatorInputs } from '@/types';

interface PriceLookupProps {
  inputs: CalculatorInputs;
  onUpdate: (updates: Partial<CalculatorInputs>) => void;
}

export default function PriceLookup({ inputs, onUpdate }: PriceLookupProps) {
  const [zipCode, setZipCode] = useState('');
  const [loadingGas, setLoadingGas] = useState(false);
  const [loadingElectricity, setLoadingElectricity] = useState(false);
  const [gasError, setGasError] = useState<string | null>(null);
  const [electricityError, setElectricityError] = useState<string | null>(null);
  const [gasSource, setGasSource] = useState<string | null>(null);
  const [electricitySource, setElectricitySource] = useState<string | null>(null);

  const handleLookupGas = async () => {
    if (!zipCode.trim()) {
      setGasError('Please enter a ZIP code');
      return;
    }

    if (!validateZipCode(zipCode.trim())) {
      setGasError('Invalid ZIP code format (use 5 digits or 5+4 format)');
      return;
    }

    setLoadingGas(true);
    setGasError(null);
    setGasSource(null);

    try {
      const data = await fetchGasPricesByZip(zipCode.trim());
      
      if (data) {
        onUpdate({
          regularGasPrice: data.regular,
          premiumGasPrice: data.premium,
        });
        setGasSource(data.source || 'API');
      } else {
        setGasError('Unable to fetch gas prices. Please enter manually.');
      }
    } catch (error) {
      setGasError('Error fetching gas prices. Please try again or enter manually.');
    } finally {
      setLoadingGas(false);
    }
  };

  const handleLookupElectricity = async () => {
    if (!zipCode.trim()) {
      setElectricityError('Please enter a ZIP code');
      return;
    }

    if (!validateZipCode(zipCode.trim())) {
      setElectricityError('Invalid ZIP code format (use 5 digits or 5+4 format)');
      return;
    }

    setLoadingElectricity(true);
    setElectricityError(null);
    setElectricitySource(null);

    try {
      const data = await fetchElectricityRatesByZip(zipCode.trim());
      
      if (data) {
        onUpdate({
          homeElectricityPrice: data.residential,
        });
        setElectricitySource(data.source || 'API');
      } else {
        setElectricityError('Unable to fetch electricity rates. Please enter manually.');
      }
    } catch (error) {
      setElectricityError('Error fetching electricity rates. Please try again or enter manually.');
    } finally {
      setLoadingElectricity(false);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Lookup Local Prices
      </h3>
      
      <div className="space-y-4">
        {/* ZIP Code Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter ZIP Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="12345"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={10}
            />
            <button
              onClick={handleLookupGas}
              disabled={loadingGas}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loadingGas ? 'Loading...' : 'Lookup Gas'}
            </button>
            <button
              onClick={handleLookupElectricity}
              disabled={loadingElectricity}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loadingElectricity ? 'Loading...' : 'Lookup Electricity'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your ZIP code to automatically fetch local gas prices and electricity rates
          </p>
        </div>

        {/* Status Messages */}
        {gasSource && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Gas prices updated from {gasSource}
          </div>
        )}
        {gasError && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {gasError}
          </div>
        )}
        {electricitySource && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Electricity rate updated from {electricitySource}
          </div>
        )}
        {electricityError && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {electricityError}
          </div>
        )}
      </div>
    </div>
  );
}

