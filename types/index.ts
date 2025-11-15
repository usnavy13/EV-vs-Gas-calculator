export type UsageScale = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type CostOptionKey = 'evHome' | 'evFast' | 'gasRegular' | 'gasPremium';

export interface CalculatorInputs {
  evEfficiency: number; // mi/kWh
  gasEfficiency: number; // mpg
  regularGasPrice: number; // $/gallon
  premiumGasPrice: number; // $/gallon
  homeElectricityPrice: number; // $/kWh
  fastChargingPrice: number; // $/kWh
  baseDistance: number; // miles per day
}

export interface CostBreakdown {
  costPerMile: number;
  totalCost: number;
  fuelCost: number;
}

export interface ScenarioResult {
  distance: number;
  evHomeCharging: CostBreakdown;
  evFastCharging: CostBreakdown;
  gasRegular: CostBreakdown;
  gasPremium: CostBreakdown;
}

export interface CalculationResults {
  baseScenario: ScenarioResult;
  daily: ScenarioResult;
  weekly: ScenarioResult;
  monthly: ScenarioResult;
  yearly: ScenarioResult;
}

export interface ChartDataPoint {
  scenario: string;
  evHome: number;
  evFast: number;
  gasRegular: number;
  gasPremium: number;
}

