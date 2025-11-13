import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }

  // Validate ZIP code format
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zipCode)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code format' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Gas Prices API] Received request for ZIP: ${zipCode}`);
    
    const stateCode = await getStateFromZip(zipCode);
    console.log(`[Gas Prices API] State code lookup result: ${stateCode || 'null'}`);
    
    if (stateCode) {
      // Try to get state-specific prices
      const prices = await getStateGasPrices(stateCode);
      console.log(`[Gas Prices API] State prices lookup result:`, prices);
      
      if (prices) {
        console.log(`[Gas Prices API] Returning prices for ${stateCode}`);
        return NextResponse.json({
          regular: prices.regular,
          premium: prices.premium,
          source: `Regional average for ${stateCode}`,
        });
      } else {
        console.log(`[Gas Prices API] No prices found for state ${stateCode}, using fallback`);
      }
    } else {
      console.log(`[Gas Prices API] No state code found for ZIP ${zipCode}, using fallback`);
    }
    
    // Fallback to national average
    console.log(`[Gas Prices API] Returning fallback prices`);
    return NextResponse.json({
      regular: 3.50,
      premium: 4.00,
      source: 'National average (fallback)',
    });
    
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gas prices' },
      { status: 500 }
    );
  }
}

/**
 * Get state code from ZIP code using free geocoding API
 */
async function getStateFromZip(zipCode: string): Promise<string | null> {
  try {
    // Extract first 5 digits
    const zip5 = zipCode.substring(0, 5);
    console.log(`[getStateFromZip] Looking up ZIP: ${zip5}`);
    
    // Try using a free API like Zippopotam.us
    const apiUrl = `https://api.zippopotam.us/us/${zip5}`;
    console.log(`[getStateFromZip] Calling API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });
    
    console.log(`[getStateFromZip] Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[getStateFromZip] Response data:`, JSON.stringify(data, null, 2));
      
      if (data.places && data.places.length > 0) {
        // API returns "state abbreviation" with a space, not underscore
        const stateCode = data.places[0]['state abbreviation'] || data.places[0].state_abbreviation;
        console.log(`[getStateFromZip] Found state code: ${stateCode}`);
        return stateCode;
      } else {
        console.log(`[getStateFromZip] No places found in response`);
      }
    } else {
      const errorText = await response.text();
      console.log(`[getStateFromZip] API error response: ${errorText}`);
    }
    
    console.log(`[getStateFromZip] Returning null - state lookup failed`);
    return null;
  } catch (error) {
    console.error('[getStateFromZip] Exception:', error);
    if (error instanceof Error) {
      console.error('[getStateFromZip] Error message:', error.message);
      console.error('[getStateFromZip] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Map US states to PADD (Petroleum Administration for Defense Districts) regions
 * EIA API v2 only provides PADD-level gasoline price data, not state-level
 */
function getPADDForState(stateCode: string): string | null {
  const stateToPADD: Record<string, string> = {
    // PADD 1 (East Coast) - R10
    'ME': 'R10', 'NH': 'R10', 'VT': 'R10', 'MA': 'R10', 'RI': 'R10', 'CT': 'R10',
    'NY': 'R10', 'NJ': 'R10', 'PA': 'R10', 'DE': 'R10', 'MD': 'R10', 'DC': 'R10',
    'VA': 'R10', 'WV': 'R10', 'NC': 'R10', 'SC': 'R10', 'GA': 'R10', 'FL': 'R10',
    // PADD 2 (Midwest) - R20
    'OH': 'R20', 'MI': 'R20', 'IN': 'R20', 'IL': 'R20', 'WI': 'R20', 'MN': 'R20',
    'IA': 'R20', 'MO': 'R20', 'ND': 'R20', 'SD': 'R20', 'NE': 'R20', 'KS': 'R20',
    'OK': 'R20', 'KY': 'R20', 'TN': 'R20',
    // PADD 3 (Gulf Coast) - R30
    'TX': 'R30', 'LA': 'R30', 'AR': 'R30', 'MS': 'R30', 'AL': 'R30', 'NM': 'R30',
    // PADD 4 (Rocky Mountain) - R40
    'MT': 'R40', 'ID': 'R40', 'WY': 'R40', 'CO': 'R40', 'UT': 'R40', 'NV': 'R40',
    // PADD 5 (West Coast) - R50
    'WA': 'R50', 'OR': 'R50', 'CA': 'R50', 'AK': 'R50', 'HI': 'R50',
    // AZ is split between PADD 4 and 5, defaulting to PADD 5
    'AZ': 'R50',
  };
  
  return stateToPADD[stateCode] || null;
}

/**
 * Get state-specific gas prices using EIA API (PADD-level) or state averages
 */
async function getStateGasPrices(stateCode: string): Promise<{ regular: number; premium: number } | null> {
  try {
    // Try to fetch from EIA API first
    const eiaApiKey = process.env.EIA_API_KEY;
    if (eiaApiKey) {
      try {
        // EIA API v2 only provides PADD-level data, not state-level
        // Map state to PADD and fetch PADD-level prices
        const paddCode = getPADDForState(stateCode);
        
        if (paddCode) {
          console.log(`[getStateGasPrices] Mapping state ${stateCode} to PADD ${paddCode}`);
          
          try {
            // Fetch regular gasoline price for the PADD
            const regularResponse = await fetch(
              `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${eiaApiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=${paddCode}&facets[product][]=EPMR&sort[0][column]=period&sort[0][direction]=desc&length=1`,
              { headers: { 'Accept': 'application/json' } }
            );
            
            if (regularResponse.ok) {
              const regularData = await regularResponse.json();
              console.log(`[getStateGasPrices] EIA PADD-level API response for regular:`, JSON.stringify(regularData, null, 2));
              
              if (regularData?.response?.data && regularData.response.data.length > 0) {
                const regularValue = typeof regularData.response.data[0].value === 'string' 
                  ? parseFloat(regularData.response.data[0].value) 
                  : regularData.response.data[0].value;
                
                if (regularValue && !isNaN(regularValue) && regularValue > 0) {
                  let regularPrice = regularValue;
                  let premiumPrice: number | null = null;
                  
                  // Try to fetch premium gasoline price
                  try {
                    const premiumResponse = await fetch(
                      `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${eiaApiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=${paddCode}&facets[product][]=EPMU&sort[0][column]=period&sort[0][direction]=desc&length=1`,
                      { headers: { 'Accept': 'application/json' } }
                    );
                    
                    if (premiumResponse.ok) {
                      const premiumData = await premiumResponse.json();
                      console.log(`[getStateGasPrices] EIA PADD-level API response for premium:`, JSON.stringify(premiumData, null, 2));
                      
                      if (premiumData?.response?.data && premiumData.response.data.length > 0) {
                        const premiumValue = typeof premiumData.response.data[0].value === 'string' 
                          ? parseFloat(premiumData.response.data[0].value) 
                          : premiumData.response.data[0].value;
                        
                        if (premiumValue && !isNaN(premiumValue) && premiumValue > 0) {
                          premiumPrice = premiumValue;
                        }
                      }
                    }
                  } catch (premiumError) {
                    console.log(`[getStateGasPrices] Could not fetch premium price:`, premiumError);
                  }
                  
                  if (premiumPrice) {
                    console.log(`[getStateGasPrices] Found EIA PADD-level prices for ${stateCode} (PADD ${paddCode}) - Regular: $${regularPrice}/gal, Premium: $${premiumPrice}/gal`);
                    return { regular: regularPrice, premium: premiumPrice };
                  } else {
                    // Estimate premium if we can't get it (typically ~15% more)
                    const estimatedPremium = regularPrice * 1.15;
                    console.log(`[getStateGasPrices] Found EIA regular price for ${stateCode} (PADD ${paddCode}): $${regularPrice}/gal, estimating premium: $${estimatedPremium.toFixed(2)}/gal`);
                    return { regular: regularPrice, premium: parseFloat(estimatedPremium.toFixed(2)) };
                  }
                }
              }
            }
          } catch (paddError) {
            console.log(`[getStateGasPrices] PADD-level EIA API call failed:`, paddError);
          }
        } else {
          console.log(`[getStateGasPrices] No PADD mapping found for state ${stateCode}`);
        }
        
        console.log(`[getStateGasPrices] EIA API did not return PADD-level data for ${stateCode}, using static state averages`);
      } catch (eiaError) {
        console.log(`[getStateGasPrices] EIA API call failed, using static data:`, eiaError);
      }
    }
    
    // Fallback to state average gas prices (based on historical data)
    // These are approximate averages - updated periodically
    const stateGasPrices: Record<string, { regular: number; premium: number }> = {
      'AL': { regular: 3.20, premium: 3.70 },
      'AK': { regular: 4.10, premium: 4.60 },
      'AZ': { regular: 3.60, premium: 4.10 },
      'AR': { regular: 3.15, premium: 3.65 },
      'CA': { regular: 4.80, premium: 5.20 },
      'CO': { regular: 3.40, premium: 3.90 },
      'CT': { regular: 3.50, premium: 4.00 },
      'DE': { regular: 3.30, premium: 3.80 },
      'FL': { regular: 3.40, premium: 3.90 },
      'GA': { regular: 3.25, premium: 3.75 },
      'HI': { regular: 4.80, premium: 5.30 },
      'ID': { regular: 3.60, premium: 4.10 },
      'IL': { regular: 3.70, premium: 4.20 },
      'IN': { regular: 3.50, premium: 4.00 },
      'IA': { regular: 3.30, premium: 3.80 },
      'KS': { regular: 3.20, premium: 3.70 },
      'KY': { regular: 3.30, premium: 3.80 },
      'LA': { regular: 3.10, premium: 3.60 },
      'ME': { regular: 3.40, premium: 3.90 },
      'MD': { regular: 3.50, premium: 4.00 },
      'MA': { regular: 3.50, premium: 4.00 },
      'MI': { regular: 3.50, premium: 4.00 },
      'MN': { regular: 3.40, premium: 3.90 },
      'MS': { regular: 3.15, premium: 3.65 },
      'MO': { regular: 3.20, premium: 3.70 },
      'MT': { regular: 3.50, premium: 4.00 },
      'NE': { regular: 3.30, premium: 3.80 },
      'NV': { regular: 4.20, premium: 4.70 },
      'NH': { regular: 3.40, premium: 3.90 },
      'NJ': { regular: 3.40, premium: 3.90 },
      'NM': { regular: 3.30, premium: 3.80 },
      'NY': { regular: 3.60, premium: 4.10 },
      'NC': { regular: 3.30, premium: 3.80 },
      'ND': { regular: 3.40, premium: 3.90 },
      'OH': { regular: 3.40, premium: 3.90 },
      'OK': { regular: 3.10, premium: 3.60 },
      'OR': { regular: 4.00, premium: 4.50 },
      'PA': { regular: 3.60, premium: 4.10 },
      'RI': { regular: 3.50, premium: 4.00 },
      'SC': { regular: 3.25, premium: 3.75 },
      'SD': { regular: 3.30, premium: 3.80 },
      'TN': { regular: 3.20, premium: 3.70 },
      'TX': { regular: 3.10, premium: 3.60 },
      'UT': { regular: 3.50, premium: 4.00 },
      'VT': { regular: 3.40, premium: 3.90 },
      'VA': { regular: 3.40, premium: 3.90 },
      'WA': { regular: 4.20, premium: 4.70 },
      'WV': { regular: 3.30, premium: 3.80 },
      'WI': { regular: 3.40, premium: 3.90 },
      'WY': { regular: 3.40, premium: 3.90 },
      'DC': { regular: 3.70, premium: 4.20 },
    };
    
    const prices = stateGasPrices[stateCode];
    return prices || null;
  } catch (error) {
    console.error('Error getting state gas prices:', error);
    return null;
  }
}

