import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get('zip');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  // Need either ZIP code or coordinates
  if (!zipCode && (!lat || !lon)) {
    return NextResponse.json(
      { error: 'ZIP code or latitude/longitude is required' },
      { status: 400 }
    );
  }

  try {
    let latitude: number;
    let longitude: number;

    // If ZIP code provided, convert to coordinates first
    if (zipCode) {
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(zipCode)) {
        return NextResponse.json(
          { error: 'Invalid ZIP code format' },
          { status: 400 }
        );
      }

      // Get coordinates from ZIP code using Zippopotam.us
      const zip5 = zipCode.substring(0, 5);
      const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip5}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!zipResponse.ok) {
        return NextResponse.json(
          { error: 'Could not find location for ZIP code' },
          { status: 404 }
        );
      }

      const zipData = await zipResponse.json();
      if (zipData.places && zipData.places.length > 0) {
        latitude = parseFloat(zipData.places[0].latitude);
        longitude = parseFloat(zipData.places[0].longitude);
      } else {
        return NextResponse.json(
          { error: 'Could not find coordinates for ZIP code' },
          { status: 404 }
        );
      }
    } else {
      latitude = parseFloat(lat!);
      longitude = parseFloat(lon!);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude' },
          { status: 400 }
        );
      }
    }

    console.log(`[EV Chargers API] Looking up fast chargers near ${latitude}, ${longitude}`);

    // Use NREL Alternative Fuels Data Center API (free, no API key required for basic usage)
    // Search for EV charging stations within 50 miles
    const nrelApiKey = process.env.NREL_API_KEY || 'DEMO_KEY';
    const nrelUrl = `https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?api_key=${nrelApiKey}&latitude=${latitude}&longitude=${longitude}&fuel_type=ELEC&ev_charging_level=dc_fast&status=E&limit=10&radius=50`;

    console.log(`[EV Chargers API] Calling NREL API...`);
    const response = await fetch(nrelUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[EV Chargers API] NREL API error: ${response.status} ${response.statusText}`);
      // Fallback to average fast charging price if API fails
      return NextResponse.json({
        price: 0.40,
        source: 'Average fast charging price (fallback)',
        stationCount: 0,
      });
    }

    const data = await response.json();
    console.log(`[EV Chargers API] Found ${data.fuel_stations?.length || 0} stations`);

    if (!data.fuel_stations || data.fuel_stations.length === 0) {
      // No stations found, return average price
      return NextResponse.json({
        price: 0.40,
        source: 'Average fast charging price (no stations found)',
        stationCount: 0,
      });
    }

    // Extract pricing information from stations
    // NREL API provides pricing in various formats - look for ev_pricing field
    const prices: number[] = [];
    let stationWithPrice = 0;

    for (const station of data.fuel_stations) {
      // Check for pricing information
      if (station.ev_pricing) {
        // Try to extract price per kWh
        // Pricing format can vary: "$0.35/kWh", "0.35", etc.
        const pricingStr = station.ev_pricing.toString();
        const priceMatch = pricingStr.match(/(\d+\.?\d*)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          if (!isNaN(price) && price > 0 && price < 2) {
            // Reasonable price range check (0-2 $/kWh)
            prices.push(price);
            stationWithPrice++;
          }
        }
      }

      // Also check ev_network for known networks with standard pricing
      if (station.ev_network) {
        const network = station.ev_network.toLowerCase();
        // Some networks have standard pricing we can use as fallback
        if (network.includes('tesla') && prices.length === 0) {
          // Tesla Supercharger average: ~$0.35-0.45/kWh
          prices.push(0.40);
        } else if (network.includes('electrify') && prices.length === 0) {
          // Electrify America average: ~$0.31-0.43/kWh
          prices.push(0.37);
        } else if (network.includes('chargepoint') && prices.length === 0) {
          // ChargePoint average: ~$0.20-0.50/kWh
          prices.push(0.35);
        }
      }
    }

    // Calculate average price if we have any
    let averagePrice = 0.40; // Default fallback
    let source = 'Average fast charging price';

    if (prices.length > 0) {
      averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      averagePrice = Math.round(averagePrice * 100) / 100; // Round to 2 decimals
      source = `Average from ${stationWithPrice} nearby fast charger${stationWithPrice > 1 ? 's' : ''}`;
    } else {
      // Use regional average based on location
      averagePrice = getRegionalFastChargingPrice(latitude, longitude);
      source = 'Regional average fast charging price';
    }

    console.log(`[EV Chargers API] Returning price: $${averagePrice}/kWh from ${source}`);

    return NextResponse.json({
      price: averagePrice,
      source: source,
      stationCount: data.fuel_stations.length,
      nearestStation: data.fuel_stations[0] ? {
        name: data.fuel_stations[0].station_name,
        address: data.fuel_stations[0].street_address,
        distance: data.fuel_stations[0].distance?.toFixed(1) || 'N/A',
      } : null,
    });

  } catch (error) {
    console.error('[EV Chargers API] Error:', error);
    return NextResponse.json(
      {
        price: 0.40,
        source: 'Average fast charging price (error occurred)',
        stationCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get regional average fast charging price based on location
 * Prices vary by region - West Coast tends to be higher, Midwest lower
 */
function getRegionalFastChargingPrice(latitude: number, longitude: number): number {
  // Rough regional estimates (in $/kWh)
  // West Coast (CA, OR, WA): ~$0.40-0.50
  // East Coast: ~$0.35-0.45
  // Midwest: ~$0.30-0.40
  // South: ~$0.30-0.40
  // Mountain: ~$0.35-0.45

  // Simple approximation based on longitude
  if (longitude < -110) {
    // West Coast
    return 0.45;
  } else if (longitude < -95) {
    // Mountain/Central
    return 0.40;
  } else if (longitude < -85) {
    // Midwest
    return 0.35;
  } else {
    // East Coast
    return 0.40;
  }
}

