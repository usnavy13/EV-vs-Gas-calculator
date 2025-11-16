import { load } from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

type PriceResult = {
  regular: number;
  premium: number;
  source: string;
};

type CacheEntry = {
  data: PriceResult;
  timestamp: number;
};

const AAA_BASE_URL = 'https://gasprices.aaa.com/';
const AAA_STATE_URL = (stateCode: string) =>
  `https://gasprices.aaa.com/?state=${encodeURIComponent(stateCode)}`;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_FALLBACK: PriceResult = {
  regular: 3.5,
  premium: 4.0,
  source: 'National average (fallback)',
};

let nationalCache: CacheEntry | null = null;
const stateCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope');
  const zipParam = searchParams.get('zip');
  const zipCode = zipParam?.trim();

  try {
    if (scope === 'national') {
      const national = await getNationalGasPrices();
      return NextResponse.json(national ?? DEFAULT_FALLBACK);
    }

    if (!zipCode) {
      return NextResponse.json(
        { error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format' },
        { status: 400 }
      );
    }

    logger.verbose('Gas Prices API', `Received request for ZIP: ${zipCode}`);

    const stateCode = await getStateFromZip(zipCode);
    logger.verbose(
      'Gas Prices API',
      `State code lookup result: ${stateCode || 'null'}`
    );

    if (stateCode) {
      const statePrices = await getStateGasPrices(stateCode);
      if (statePrices) {
        logger.verbose('Gas Prices API', `Returning AAA prices for ${stateCode}`);
        return NextResponse.json(statePrices);
      }
    }

    logger.verbose(
      'Gas Prices API',
      `Falling back to national average for ZIP ${zipCode}`
    );
    const national = await getNationalGasPrices();
    if (national) {
      return NextResponse.json(national);
    }

    logger.verbose(
      'Gas Prices API',
      'AAA national lookup failed, returning static fallback'
    );
    return NextResponse.json(DEFAULT_FALLBACK);
  } catch (error) {
    logger.error('Error fetching gas prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gas prices' },
      { status: 500 }
    );
  }
}

async function getNationalGasPrices(): Promise<PriceResult | null> {
  if (nationalCache && isCacheFresh(nationalCache.timestamp)) {
    return nationalCache.data;
  }

  const result = await fetchAAAPrices(AAA_BASE_URL, 'National');
  if (result) {
    nationalCache = { data: result, timestamp: Date.now() };
    return result;
  }

  return null;
}

async function getStateGasPrices(stateCode: string): Promise<PriceResult | null> {
  const normalizedState = stateCode.toUpperCase();
  const cached = stateCache.get(normalizedState);
  if (cached && isCacheFresh(cached.timestamp)) {
    return cached.data;
  }

  const url = AAA_STATE_URL(normalizedState);
  const result = await fetchAAAPrices(url, normalizedState);
  if (result) {
    stateCache.set(normalizedState, { data: result, timestamp: Date.now() });
    return result;
  }

  const staticFallback = getStaticStateGasPrices(normalizedState);
  if (staticFallback) {
    return staticFallback;
  }

  return null;
}

async function fetchAAAPrices(
  url: string,
  regionLabel: string
): Promise<PriceResult | null> {
  try {
    const html = await fetchAAAHtml(url);
    return parseAAATable(html, regionLabel);
  } catch (error) {
    logger.error(`[AAA] Failed to fetch ${regionLabel} data:`, error);
    return null;
  }
}

async function fetchAAAHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'User-Agent':
        'EVvsGasCalculator/1.0 (+https://github.com/user/ev-vs-gas-calculator)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseAAATable(html: string, regionLabel: string): PriceResult | null {
  const $ = load(html);
  const regionName =
    $('h1.nati').first().find('span').first().text().trim() || regionLabel || 'Regional';

  const table = findPriceTable($);

  if (!table.length) {
    logger.warn(`[AAA] Could not locate price table for ${regionLabel}`);
    return null;
  }

  const headers: string[] = [];
  table
    .find('thead tr')
    .first()
    .find('th')
    .each((_, element) => {
      headers.push($(element).text().trim());
    });

  const currentRow = table
    .find('tbody tr')
    .filter((_, row) => {
      const label = $(row).find('td').first().text().trim().toLowerCase();
      return isCurrentAverageLabel(label);
    })
    .first();

  if (!currentRow.length) {
    logger.warn(`[AAA] Missing "Current Avg." row for ${regionLabel}`);
    return null;
  }

  let regularText: string | null = null;
  let premiumText: string | null = null;

  currentRow.find('td').each((index, cell) => {
    const headerLabel = headers[index]?.toLowerCase() ?? '';
    const value = $(cell).text().trim();

    if (headerLabel === 'regular' || headerLabel === 'regular unleaded') {
      regularText = value;
    } else if (headerLabel === 'premium') {
      premiumText = value;
    }
  });

  const regular = parsePrice(regularText);
  const premium = parsePrice(premiumText);

  if (regular == null || premium == null) {
    logger.warn(`[AAA] Unable to parse regular/premium prices for ${regionLabel}`);
    return null;
  }

  return {
    regular,
    premium,
    source: `AAA ${regionName} average`,
  };
}

function findPriceTable($: ReturnType<typeof load>) {
  const headerTable = $('h1.nati')
    .first()
    .nextAll('div.tblwrap')
    .first()
    .find('table.table-mob')
    .first();

  if (headerTable.length) {
    return headerTable;
  }

  return $('table.table-mob')
    .filter((_, table) => {
      const firstRowLabel = $(table)
        .find('tbody tr')
        .first()
        .find('td')
        .first()
        .text()
        .trim()
        .toLowerCase();
      return isCurrentAverageLabel(firstRowLabel);
    })
    .first();
}

function parsePrice(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^0-9.]/g, '');
  if (!normalized) {
    return null;
  }
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isCurrentAverageLabel(label: string): boolean {
  const normalized = label.replace(/\./g, '').trim();
  return normalized.toLowerCase() === 'current avg';
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

/**
 * Get state code from ZIP code using free geocoding API
 */
async function getStateFromZip(zipCode: string): Promise<string | null> {
  try {
    const zip5 = zipCode.substring(0, 5);
    logger.verbose('getStateFromZip', `Looking up ZIP: ${zip5}`);

    const apiUrl = `https://api.zippopotam.us/us/${zip5}`;
    logger.verbose('getStateFromZip', `Calling API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
    });

    logger.verbose(
      'getStateFromZip',
      `Response status: ${response.status} ${response.statusText}`
    );

    if (response.ok) {
      const data = await response.json();
      logger.verbose(
        'getStateFromZip',
        `Response data:`,
        JSON.stringify(data, null, 2)
      );

      if (data.places && data.places.length > 0) {
        const stateCode =
          data.places[0]['state abbreviation'] || data.places[0].state_abbreviation;
        logger.verbose('getStateFromZip', `Found state code: ${stateCode}`);
        return stateCode;
      } else {
        logger.verbose('getStateFromZip', 'No places found in response');
      }
    } else {
      const errorText = await response.text();
      logger.verbose('getStateFromZip', `API error response: ${errorText}`);
    }

    logger.verbose('getStateFromZip', 'Returning null - state lookup failed');
    return null;
  } catch (error) {
    logger.error('[getStateFromZip] Exception:', error);
    if (error instanceof Error) {
      logger.error('[getStateFromZip] Error message:', error.message);
      logger.error('[getStateFromZip] Error stack:', error.stack);
    }
    return null;
  }
}

const staticStateGasPrices: Record<string, { regular: number; premium: number }> = {
  AL: { regular: 3.2, premium: 3.7 },
  AK: { regular: 4.1, premium: 4.6 },
  AZ: { regular: 3.6, premium: 4.1 },
  AR: { regular: 3.15, premium: 3.65 },
  CA: { regular: 4.8, premium: 5.2 },
  CO: { regular: 3.4, premium: 3.9 },
  CT: { regular: 3.5, premium: 4.0 },
  DE: { regular: 3.3, premium: 3.8 },
  FL: { regular: 3.4, premium: 3.9 },
  GA: { regular: 3.25, premium: 3.75 },
  HI: { regular: 4.8, premium: 5.3 },
  ID: { regular: 3.6, premium: 4.1 },
  IL: { regular: 3.7, premium: 4.2 },
  IN: { regular: 3.5, premium: 4.0 },
  IA: { regular: 3.3, premium: 3.8 },
  KS: { regular: 3.2, premium: 3.7 },
  KY: { regular: 3.3, premium: 3.8 },
  LA: { regular: 3.1, premium: 3.6 },
  ME: { regular: 3.4, premium: 3.9 },
  MD: { regular: 3.5, premium: 4.0 },
  MA: { regular: 3.5, premium: 4.0 },
  MI: { regular: 3.5, premium: 4.0 },
  MN: { regular: 3.4, premium: 3.9 },
  MS: { regular: 3.15, premium: 3.65 },
  MO: { regular: 3.2, premium: 3.7 },
  MT: { regular: 3.5, premium: 4.0 },
  NE: { regular: 3.3, premium: 3.8 },
  NV: { regular: 4.2, premium: 4.7 },
  NH: { regular: 3.4, premium: 3.9 },
  NJ: { regular: 3.4, premium: 3.9 },
  NM: { regular: 3.3, premium: 3.8 },
  NY: { regular: 3.6, premium: 4.1 },
  NC: { regular: 3.3, premium: 3.8 },
  ND: { regular: 3.4, premium: 3.9 },
  OH: { regular: 3.4, premium: 3.9 },
  OK: { regular: 3.1, premium: 3.6 },
  OR: { regular: 4.0, premium: 4.5 },
  PA: { regular: 3.6, premium: 4.1 },
  RI: { regular: 3.5, premium: 4.0 },
  SC: { regular: 3.25, premium: 3.75 },
  SD: { regular: 3.3, premium: 3.8 },
  TN: { regular: 3.2, premium: 3.7 },
  TX: { regular: 3.1, premium: 3.6 },
  UT: { regular: 3.5, premium: 4.0 },
  VT: { regular: 3.4, premium: 3.9 },
  VA: { regular: 3.4, premium: 3.9 },
  WA: { regular: 4.2, premium: 4.7 },
  WV: { regular: 3.3, premium: 3.8 },
  WI: { regular: 3.4, premium: 3.9 },
  WY: { regular: 3.4, premium: 3.9 },
  DC: { regular: 3.7, premium: 4.2 },
};

function getStaticStateGasPrices(stateCode: string): PriceResult | null {
  const prices = staticStateGasPrices[stateCode];
  if (!prices) {
    return null;
  }

  return {
    regular: prices.regular,
    premium: prices.premium,
    source: `State fallback average for ${stateCode}`,
  };
}

