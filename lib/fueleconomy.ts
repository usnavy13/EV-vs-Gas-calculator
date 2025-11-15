export interface FuelEconomyMenuItem {
  text: string;
  value: string;
}

export interface FuelEconomyVehicleDetails {
  id: string;
  year?: string;
  make?: string;
  model?: string;
  trany?: string;
  fuelType?: string;
  fuelType1?: string;
  fuelType2?: string;
  atvType?: string;
  comb08?: string;
  city08?: string;
  highway08?: string;
  combE?: string;
  cityE?: string;
  highwayE?: string;
  youSaveSpend?: string;
}

const BASE_URL = 'https://www.fueleconomy.gov/ws/rest';

type MenuResponse = {
  menuItem?: FuelEconomyMenuItem | FuelEconomyMenuItem[];
  menuItems?: {
    menuItem?: FuelEconomyMenuItem | FuelEconomyMenuItem[];
  };
};

const menuCache = new Map<string, FuelEconomyMenuItem[]>();
const vehicleCache = new Map<string, FuelEconomyVehicleDetails>();

function buildCacheKey(endpoint: string, params?: Record<string, string | number>) {
  const query = params ? new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  ).toString() : '';

  return `${endpoint}${query ? `?${query}` : ''}`;
}

async function fetchFuelEconomy<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`FuelEconomy.gov request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function normalizeMenuItems(data: MenuResponse | undefined | null): FuelEconomyMenuItem[] {
  if (!data) return [];
  const rawItems = data.menuItems?.menuItem ?? data.menuItem;

  if (!rawItems) return [];
  return Array.isArray(rawItems) ? rawItems : [rawItems];
}

async function fetchMenuItems(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<FuelEconomyMenuItem[]> {
  const cacheKey = buildCacheKey(endpoint, params);
  if (menuCache.has(cacheKey)) {
    return menuCache.get(cacheKey)!;
  }

  const data = await fetchFuelEconomy<MenuResponse>(endpoint, params);
  const items = normalizeMenuItems(data);
  menuCache.set(cacheKey, items);

  return items;
}

export async function getVehicleYears() {
  return fetchMenuItems('vehicle/menu/year');
}

export async function getVehicleMakes(year: string) {
  return fetchMenuItems('vehicle/menu/make', { year });
}

export async function getVehicleModels(year: string, make: string) {
  return fetchMenuItems('vehicle/menu/model', { year, make });
}

export async function getVehicleOptions(year: string, make: string, model: string) {
  return fetchMenuItems('vehicle/menu/options', { year, make, model });
}

export async function getVehicleDetails(id: string) {
  if (vehicleCache.has(id)) {
    return vehicleCache.get(id)!;
  }

  const data = await fetchFuelEconomy<FuelEconomyVehicleDetails>(`vehicle/${id}`);
  vehicleCache.set(id, data);

  return data;
}

export function convertKwhPer100MilesToMilesPerKwh(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? parseFloat(value) : value;

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return 100 / numeric;
}

export function parseFuelEconomyNumber(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

