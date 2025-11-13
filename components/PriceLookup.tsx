'use client';

import { useState } from 'react';
import { fetchGasPricesByZip, fetchElectricityRatesByZip, fetchFastChargerPrice, validateZipCode, reverseGeocode } from '@/lib/api-services';
import { CalculatorInputs } from '@/types';

interface PriceLookupProps {
  inputs: CalculatorInputs;
  onUpdate: (updates: Partial<CalculatorInputs>) => void;
}

export default function PriceLookup({ inputs, onUpdate }: PriceLookupProps) {
  const [zipCode, setZipCode] = useState('');
  const [loadingGas, setLoadingGas] = useState(false);
  const [loadingElectricity, setLoadingElectricity] = useState(false);
  const [loadingFastCharger, setLoadingFastCharger] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [gasError, setGasError] = useState<string | null>(null);
  const [electricityError, setElectricityError] = useState<string | null>(null);
  const [fastChargerError, setFastChargerError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gasSource, setGasSource] = useState<string | null>(null);
  const [electricitySource, setElectricitySource] = useState<string | null>(null);
  const [fastChargerSource, setFastChargerSource] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const handleLookupGas = async () => {
    if (!zipCode.trim()) {
      setGasError('Please enter a ZIP code');
      return;
    }

    if (!validateZipCode(zipCode.trim())) {
      setGasError('Invalid ZIP code format (use 5 digits or 5+4 format)');
      return;
    }

    await handleLookupGasWithZip(zipCode.trim());
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

  const handleLookupFastCharger = async () => {
    if (!zipCode.trim()) {
      setFastChargerError('Please enter a ZIP code');
      return;
    }

    if (!validateZipCode(zipCode.trim())) {
      setFastChargerError('Invalid ZIP code format (use 5 digits or 5+4 format)');
      return;
    }

    await handleLookupFastChargerWithZip(zipCode.trim());
  };

  const handleUseLocation = async () => {
    console.log('[Geolocation] Starting location request...');
    console.log('[Geolocation] navigator.geolocation available:', !!navigator.geolocation);
    console.log('[Geolocation] Browser:', navigator.userAgent);
    
    if (!navigator.geolocation) {
      console.error('[Geolocation] Geolocation API not supported');
      setLocationError('Geolocation is not supported by your browser');
      setLocationPermissionDenied(true);
      return;
    }

    setLoadingLocation(true);
    setLocationError(null);
    setLocationPermissionDenied(false);

    const geolocationOptions = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // Cache for 5 minutes
    };
    
    console.log('[Geolocation] Options:', geolocationOptions);
    console.log('[Geolocation] Calling getCurrentPosition...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('[Geolocation] Position received successfully');
        console.log('[Geolocation] Position details:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
        
        try {
          const { latitude, longitude } = position.coords;
          console.log('[Geolocation] Starting reverse geocoding for:', { latitude, longitude });
          
          const zip = await reverseGeocode(latitude, longitude);
          console.log('[Geolocation] Reverse geocoding result:', zip);
          
          if (zip) {
            console.log('[Geolocation] ZIP code found:', zip);
            setZipCode(zip);
            // Automatically fetch prices for the detected location
            console.log('[Geolocation] Fetching prices for ZIP:', zip);
            await Promise.all([
              handleLookupGasWithZip(zip),
              handleLookupElectricityWithZip(zip),
              handleLookupFastChargerWithZip(zip),
            ]);
            console.log('[Geolocation] Price fetching completed');
          } else {
            console.error('[Geolocation] ZIP code not found from reverse geocoding');
            setLocationError('Could not determine ZIP code from your location. Please enter manually.');
            setLocationPermissionDenied(true);
          }
        } catch (error) {
          console.error('[Geolocation] Error processing location:', error);
          if (error instanceof Error) {
            console.error('[Geolocation] Error message:', error.message);
            console.error('[Geolocation] Error stack:', error.stack);
          }
          setLocationError('Error processing your location. Please enter ZIP code manually.');
          setLocationPermissionDenied(true);
        } finally {
          setLoadingLocation(false);
          console.log('[Geolocation] Location request completed');
        }
      },
      (error) => {
        console.error('[Geolocation] Error getting position');
        console.error('[Geolocation] Error code:', error.code);
        console.error('[Geolocation] Error message:', error.message);
        console.error('[Geolocation] Full error object:', error);
        
        setLoadingLocation(false);
        setLocationPermissionDenied(true);
        
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('[Geolocation] PERMISSION_DENIED - User denied location access');
            errorMessage = 'Location access denied. Please enter your ZIP code manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('[Geolocation] POSITION_UNAVAILABLE - Location information unavailable');
            console.error('[Geolocation] This could be due to:');
            console.error('[Geolocation] - GPS disabled');
            console.error('[Geolocation] - Network location unavailable');
            console.error('[Geolocation] - Device location services disabled');
            errorMessage = 'Location information unavailable. Please enter your ZIP code manually.';
            break;
          case error.TIMEOUT:
            console.error('[Geolocation] TIMEOUT - Location request timed out');
            errorMessage = 'Location request timed out. Please enter your ZIP code manually.';
            break;
          default:
            console.error('[Geolocation] Unknown error code:', error.code);
            errorMessage = 'Error getting location. Please enter your ZIP code manually.';
            break;
        }
        
        setLocationError(errorMessage);
        console.log('[Geolocation] Error handling completed');
      },
      geolocationOptions
    );
  };

  const handleLookupGasWithZip = async (zip: string) => {
    setLoadingGas(true);
    setGasError(null);
    setGasSource(null);

    try {
      const data = await fetchGasPricesByZip(zip);
      
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

  const handleLookupElectricityWithZip = async (zip: string) => {
    setLoadingElectricity(true);
    setElectricityError(null);
    setElectricitySource(null);

    try {
      const data = await fetchElectricityRatesByZip(zip);
      
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

  const handleLookupFastChargerWithZip = async (zip: string) => {
    setLoadingFastCharger(true);
    setFastChargerError(null);
    setFastChargerSource(null);

    try {
      const data = await fetchFastChargerPrice(zip);
      
      if (data) {
        onUpdate({
          fastChargingPrice: data.price,
        });
        setFastChargerSource(data.source || 'API');
      } else {
        setFastChargerError('Unable to fetch fast charger prices. Please enter manually.');
      }
    } catch (error) {
      setFastChargerError('Error fetching fast charger prices. Please try again or enter manually.');
    } finally {
      setLoadingFastCharger(false);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Lookup Local Prices
      </h3>
      
      <div className="space-y-4">
        {/* Location Button */}
        <div>
          <button
            onClick={handleUseLocation}
            disabled={loadingLocation}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loadingLocation ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting location...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use My Location
              </>
            )}
          </button>
          {locationError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {locationError}
            </p>
          )}
        </div>

        {/* ZIP Code Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {locationPermissionDenied ? 'Enter ZIP Code' : 'Or Enter ZIP Code'}
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
              disabled={loadingGas || !zipCode.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loadingGas ? 'Loading...' : 'Lookup Gas'}
            </button>
            <button
              onClick={handleLookupElectricity}
              disabled={loadingElectricity || !zipCode.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loadingElectricity ? 'Loading...' : 'Lookup Electricity'}
            </button>
            <button
              onClick={handleLookupFastCharger}
              disabled={loadingFastCharger || !zipCode.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              {loadingFastCharger ? 'Loading...' : 'Lookup Fast Charger'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {locationPermissionDenied 
              ? 'Enter your ZIP code to automatically fetch local gas prices, electricity rates, and fast charger prices'
              : 'You can also manually enter your ZIP code to fetch local prices'}
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
        {fastChargerSource && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Fast charger price updated from {fastChargerSource}
          </div>
        )}
        {fastChargerError && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {fastChargerError}
          </div>
        )}
      </div>
    </div>
  );
}

