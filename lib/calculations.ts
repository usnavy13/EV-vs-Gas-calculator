import { CalculatorInputs, CostBreakdown, ScenarioResult, CalculationResults } from '@/types';

/**
 * Calculate cost per mile for an EV using home charging
 */
export function calculateEVCostPerMileHome(
  evEfficiency: number,
  electricityPrice: number
): number {
  if (evEfficiency <= 0) return 0;
  return electricityPrice / evEfficiency;
}

/**
 * Calculate cost per mile for an EV using fast charging
 */
export function calculateEVCostPerMileFast(
  evEfficiency: number,
  fastChargingPrice: number
): number {
  if (evEfficiency <= 0) return 0;
  return fastChargingPrice / evEfficiency;
}

/**
 * Calculate cost per mile for a gas car
 */
export function calculateGasCostPerMile(
  mpg: number,
  gasPrice: number
): number {
  if (mpg <= 0) return 0;
  return gasPrice / mpg;
}

/**
 * Calculate total cost breakdown for a given distance
 */
export function calculateCostBreakdown(
  costPerMile: number,
  distance: number
): CostBreakdown {
  const totalCost = costPerMile * distance;
  return {
    costPerMile,
    totalCost,
    fuelCost: totalCost,
  };
}

/**
 * Calculate scenario result for a given distance
 */
export function calculateScenario(
  inputs: CalculatorInputs,
  distance: number
): ScenarioResult {
  const evHomeCostPerMile = calculateEVCostPerMileHome(
    inputs.evEfficiency,
    inputs.homeElectricityPrice
  );
  const evFastCostPerMile = calculateEVCostPerMileFast(
    inputs.evEfficiency,
    inputs.fastChargingPrice
  );
  const gasRegularCostPerMile = calculateGasCostPerMile(
    inputs.gasEfficiency,
    inputs.regularGasPrice
  );
  const gasPremiumCostPerMile = calculateGasCostPerMile(
    inputs.gasEfficiency,
    inputs.premiumGasPrice
  );

  return {
    distance,
    evHomeCharging: calculateCostBreakdown(evHomeCostPerMile, distance),
    evFastCharging: calculateCostBreakdown(evFastCostPerMile, distance),
    gasRegular: calculateCostBreakdown(gasRegularCostPerMile, distance),
    gasPremium: calculateCostBreakdown(gasPremiumCostPerMile, distance),
  };
}

/**
 * Calculate all scenarios (base, daily, weekly, monthly, yearly)
 */
export function calculateAllScenarios(
  inputs: CalculatorInputs
): CalculationResults {
  const baseDistance = inputs.baseDistance;
  
  return {
    baseScenario: calculateScenario(inputs, baseDistance),
    daily: calculateScenario(inputs, baseDistance),
    weekly: calculateScenario(inputs, baseDistance * 7),
    monthly: calculateScenario(inputs, baseDistance * 30),
    yearly: calculateScenario(inputs, baseDistance * 365),
  };
}

/**
 * Calculate the electricity price (per kWh) where EV charging
 * reaches parity with a given gas price.
 */
export function calculateElectricityParityRate(
  gasPrice: number,
  gasEfficiency: number,
  evEfficiency: number
): number {
  if (gasEfficiency <= 0 || evEfficiency <= 0) return 0;
  const gasCostPerMile = calculateGasCostPerMile(gasEfficiency, gasPrice);
  return gasCostPerMile * evEfficiency;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate savings percentage
 */
export function calculateSavings(cost1: number, cost2: number): number {
  if (cost2 === 0) return 0;
  return ((cost2 - cost1) / cost2) * 100;
}

