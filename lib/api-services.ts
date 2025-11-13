export interface GasPriceData {
  regular: number;
  premium: number;
  source?: string;
}

export interface ElectricityRateData {
  residential: number;
  source?: string;
}

export interface FastChargerData {
  price: number;
  source?: string;
  stationCount?: number;
  nearestStation?: {
    name: string;
    address: string;
    distance: string;
  };
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
 * Fetch fast charger pricing by ZIP code or coordinates
 */
export async function fetchFastChargerPrice(zipCode?: string, latitude?: number, longitude?: number): Promise<FastChargerData | null> {
  try {
    let url = '/api/ev-chargers?';
    if (zipCode) {
      url += `zip=${zipCode}`;
    } else if (latitude !== undefined && longitude !== undefined) {
      url += `lat=${latitude}&lon=${longitude}`;
    } else {
      return null;
    }

    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching fast charger prices:', error);
    return null;
  }
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

