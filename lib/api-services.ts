import { logger } from './logger';

export interface GasPriceData {
  regular: number;
  premium: number;
  source?: string;
}

export interface ElectricityRateData {
  residential: number;
  source?: string;
}

/**
 * Fetch gas prices by ZIP code
 * Uses multiple free APIs as fallback
 */
export async function fetchGasPricesByZip(zipCode: string): Promise<GasPriceData | null> {
  try {
    // Try using Next.js API route (server-side)
    const response = await fetch(`/api/gas-prices?zip=${zipCode}`);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching gas prices:', error);
    return null;
  }
}

/**
 * Fetch national average gas prices (AAA)
 */
export async function fetchNationalGasPrices(): Promise<GasPriceData | null> {
  try {
    const response = await fetch('/api/gas-prices?scope=national', {
      cache: 'no-store',
    });

    if (response.ok) {
      return response.json();
    }

    return null;
  } catch (error) {
    logger.error('Error fetching national gas prices:', error);
    return null;
  }
}

/**
 * Fetch electricity rates by ZIP code
 */
export async function fetchElectricityRatesByZip(zipCode: string): Promise<ElectricityRateData | null> {
  try {
    // Try using Next.js API route (server-side)
    const response = await fetch(`/api/electricity-rates?zip=${zipCode}`);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching electricity rates:', error);
    return null;
  }
}

/**
 * Validate ZIP code format (US ZIP codes)
 */
export function validateZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
}

/**
 * Reverse geocode coordinates to ZIP code
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  logger.verbose('ReverseGeocode', 'Starting reverse geocoding');
  logger.verbose('ReverseGeocode', 'Input coordinates:', { latitude, longitude });
  
  try {
    const url = `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`;
    logger.verbose('ReverseGeocode', `Fetching from: ${url}`);
    
    const response = await fetch(url);
    logger.verbose('ReverseGeocode', `Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      logger.verbose('ReverseGeocode', 'Response data:', data);
      const zipCode = data.zipCode || null;
      logger.verbose('ReverseGeocode', `Extracted ZIP code: ${zipCode}`);
      return zipCode;
    } else {
      const errorText = await response.text();
      logger.error('[ReverseGeocode] API error response:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        logger.error('[ReverseGeocode] Parsed error:', errorData);
      } catch (e) {
        logger.error('[ReverseGeocode] Could not parse error response');
      }
    }
    
    return null;
  } catch (error) {
    logger.error('[ReverseGeocode] Exception during reverse geocoding:', error);
    if (error instanceof Error) {
      logger.error('[ReverseGeocode] Error message:', error.message);
      logger.error('[ReverseGeocode] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Fallback lookup using public IP (approximate ZIP)
 */
export async function fetchZipFromIp(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const postal = data?.postal || data?.zip || data?.postal_code;
    return postal ? String(postal) : null;
  } catch (error) {
    logger.error('[IPLookup] Failed to fetch ZIP from IP:', error);
    return null;
  }
}

