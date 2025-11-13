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

