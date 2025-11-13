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
    console.log(`[Electricity Rates API] Received request for ZIP: ${zipCode}`);
    
    const stateCode = await getStateFromZip(zipCode);
    console.log(`[Electricity Rates API] State code lookup result: ${stateCode || 'null'}`);
    
    if (stateCode) {
      const rate = await getStateElectricityRate(stateCode);
      console.log(`[Electricity Rates API] State rate lookup result: ${rate || 'null'}`);
      
      if (rate) {
        console.log(`[Electricity Rates API] Returning state-specific rate for ${stateCode}`);
        return NextResponse.json({
          residential: rate,
          source: `Average for ${stateCode}`,
        });
      } else {
        console.log(`[Electricity Rates API] No rate found for state ${stateCode}, using fallback`);
      }
    } else {
      console.log(`[Electricity Rates API] No state code found for ZIP ${zipCode}, using fallback`);
    }
    
    // Fallback to national average residential rate
    console.log(`[Electricity Rates API] Returning fallback rate`);
    return NextResponse.json({
      residential: 0.12,
      source: 'National average (fallback)',
    });
    
  } catch (error) {
    console.error('Error fetching electricity rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch electricity rates' },
      { status: 500 }
    );
  }
}

/**
 * Get state code from ZIP code using free geocoding API
 */
async function getStateFromZip(zipCode: string): Promise<string | null> {
  try {
    const zip5 = zipCode.substring(0, 5);
    console.log(`[getStateFromZip] Looking up ZIP: ${zip5}`);
    
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
 * Get state-specific electricity rate
 * Uses EIA API for real-time data, falls back to static averages
 */
async function getStateElectricityRate(stateCode: string): Promise<number | null> {
  try {
    // Try to fetch from EIA API first
    const eiaApiKey = process.env.EIA_API_KEY;
    if (eiaApiKey) {
      try {
        // EIA API format: ELEC.PRICE.<STATE>.RES.M (monthly residential price)
        const seriesId = `ELEC.PRICE.${stateCode}.RES.M`;
        const eiaUrl = `https://api.eia.gov/v2/electricity/retail-sales/data/?api_key=${eiaApiKey}&frequency=monthly&data[0]=price&facets[stateid][]=${stateCode}&facets[sectorid][]=RES&sort[0][column]=period&sort[0][direction]=desc&length=1`;
        
        console.log(`[getStateElectricityRate] Fetching from EIA API for ${stateCode}`);
        const eiaResponse = await fetch(eiaUrl, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (eiaResponse.ok) {
          const eiaData = await eiaResponse.json();
          console.log(`[getStateElectricityRate] EIA API response:`, JSON.stringify(eiaData, null, 2));
          
          // Parse EIA response - structure: { response: { data: [{ price: value }] } }
          if (eiaData?.response?.data && eiaData.response.data.length > 0) {
            const latestPrice = eiaData.response.data[0].price;
            // EIA returns price as a string in cents per kWh
            const priceValue = typeof latestPrice === 'string' ? parseFloat(latestPrice) : latestPrice;
            
            if (priceValue && !isNaN(priceValue) && priceValue > 0) {
              // EIA returns price in cents per kWh, convert to dollars
              const rateInDollars = priceValue / 100;
              console.log(`[getStateElectricityRate] Found EIA rate for ${stateCode}: $${rateInDollars}/kWh (from ${priceValue} cents)`);
              return rateInDollars;
            } else {
              console.log(`[getStateElectricityRate] Invalid price value: ${latestPrice}`);
            }
          } else {
            console.log(`[getStateElectricityRate] No data in EIA response`);
          }
        } else {
          const errorText = await eiaResponse.text();
          console.log(`[getStateElectricityRate] EIA API error: ${eiaResponse.status} - ${errorText}`);
        }
      } catch (eiaError) {
        console.log(`[getStateElectricityRate] EIA API call failed, using static data:`, eiaError);
      }
    } else {
      console.log(`[getStateElectricityRate] EIA API key not found, using static data`);
    }
    
    // Fallback to state average residential electricity rates ($/kWh)
    // Based on EIA historical data - updated periodically
    const stateRates: Record<string, number> = {
      'AL': 0.12, 'AK': 0.20, 'AZ': 0.12, 'AR': 0.10,
      'CA': 0.22, 'CO': 0.12, 'CT': 0.22, 'DE': 0.13,
      'FL': 0.12, 'GA': 0.11, 'HI': 0.30, 'ID': 0.10,
      'IL': 0.12, 'IN': 0.12, 'IA': 0.11, 'KS': 0.12,
      'KY': 0.10, 'LA': 0.10, 'ME': 0.16, 'MD': 0.14,
      'MA': 0.22, 'MI': 0.15, 'MN': 0.13, 'MS': 0.11,
      'MO': 0.10, 'MT': 0.11, 'NE': 0.10, 'NV': 0.11,
      'NH': 0.19, 'NJ': 0.15, 'NM': 0.12, 'NY': 0.18,
      'NC': 0.11, 'ND': 0.10, 'OH': 0.12, 'OK': 0.10,
      'OR': 0.11, 'PA': 0.14, 'RI': 0.20, 'SC': 0.12,
      'SD': 0.11, 'TN': 0.10, 'TX': 0.11, 'UT': 0.10,
      'VT': 0.17, 'VA': 0.11, 'WA': 0.10, 'WV': 0.11,
      'WI': 0.14, 'WY': 0.11, 'DC': 0.13,
    };
    
    const rate = stateRates[stateCode];
    return rate || null;
  } catch (error) {
    console.error('Error getting state electricity rate:', error);
    return null;
  }
}

