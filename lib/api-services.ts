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
    console.error('Error fetching gas prices:', error);
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
    console.error('Error fetching electricity rates:', error);
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
  console.log('[ReverseGeocode] Starting reverse geocoding');
  console.log('[ReverseGeocode] Input coordinates:', { latitude, longitude });
  
  try {
    const url = `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`;
    console.log('[ReverseGeocode] Fetching from:', url);
    
    const response = await fetch(url);
    console.log('[ReverseGeocode] Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[ReverseGeocode] Response data:', data);
      const zipCode = data.zipCode || null;
      console.log('[ReverseGeocode] Extracted ZIP code:', zipCode);
      return zipCode;
    } else {
      const errorText = await response.text();
      console.error('[ReverseGeocode] API error response:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        console.error('[ReverseGeocode] Parsed error:', errorData);
      } catch (e) {
        console.error('[ReverseGeocode] Could not parse error response');
      }
    }
    
    return null;
  } catch (error) {
    console.error('[ReverseGeocode] Exception during reverse geocoding:', error);
    if (error instanceof Error) {
      console.error('[ReverseGeocode] Error message:', error.message);
      console.error('[ReverseGeocode] Error stack:', error.stack);
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
    console.error('[IPLookup] Failed to fetch ZIP from IP:', error);
    return null;
  }
}

