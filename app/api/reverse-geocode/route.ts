import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  logger.verbose('ReverseGeocode API', 'Request received');
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  logger.verbose('ReverseGeocode API', 'Query params:', { lat, lon });

  if (!lat || !lon) {
    logger.error('[ReverseGeocode API] Missing lat or lon parameter');
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  logger.verbose('ReverseGeocode API', 'Parsed coordinates:', { latitude, longitude });

  if (isNaN(latitude) || isNaN(longitude)) {
    logger.error('[ReverseGeocode API] Invalid coordinates (NaN)');
    return NextResponse.json(
      { error: 'Invalid latitude or longitude' },
      { status: 400 }
    );
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90) {
    logger.error('[ReverseGeocode API] Latitude out of range:', latitude);
    return NextResponse.json(
      { error: 'Latitude must be between -90 and 90' },
      { status: 400 }
    );
  }

  if (longitude < -180 || longitude > 180) {
    logger.error('[ReverseGeocode API] Longitude out of range:', longitude);
    return NextResponse.json(
      { error: 'Longitude must be between -180 and 180' },
      { status: 400 }
    );
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    logger.verbose('ReverseGeocode API', `Calling Nominatim API: ${nominatimUrl}`);
    
    // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key required)
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EV-Gas-Calculator/1.0', // Required by Nominatim
        'Accept': 'application/json',
      },
    });

    logger.verbose('ReverseGeocode API', `Nominatim response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[ReverseGeocode API] Nominatim API error:', errorText);
      throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.verbose('ReverseGeocode API', `Nominatim response data:`, JSON.stringify(data, null, 2));
    
    // Extract ZIP code from the address
    const zipCode = data.address?.postcode;
    logger.verbose('ReverseGeocode API', `Raw ZIP code from address: ${zipCode}`);
    logger.verbose('ReverseGeocode API', 'Full address object:', data.address);
    
    if (zipCode) {
      // Clean up ZIP code (remove any spaces, ensure it's 5 digits)
      const cleanZip = zipCode.replace(/\s+/g, '').substring(0, 5);
      logger.verbose('ReverseGeocode API', `Cleaned ZIP code: ${cleanZip}`);
      
      if (/^\d{5}$/.test(cleanZip)) {
        logger.verbose('ReverseGeocode API', `Valid ZIP code found: ${cleanZip}`);
        return NextResponse.json({
          zipCode: cleanZip,
          address: data.display_name,
        });
      } else {
        logger.error('[ReverseGeocode API] ZIP code format invalid:', cleanZip);
      }
    } else {
      logger.error('[ReverseGeocode API] No ZIP code found in address data');
      logger.error('[ReverseGeocode API] Available address fields:', Object.keys(data.address || {}));
    }

    logger.error('[ReverseGeocode API] ZIP code not found for location');
    return NextResponse.json(
      { error: 'ZIP code not found for this location', address: data.display_name },
      { status: 404 }
    );
  } catch (error) {
    logger.error('[ReverseGeocode API] Exception in reverse geocoding:', error);
    if (error instanceof Error) {
      logger.error('[ReverseGeocode API] Error message:', error.message);
      logger.error('[ReverseGeocode API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to reverse geocode location', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

