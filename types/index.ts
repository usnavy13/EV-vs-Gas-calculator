export interface CalculatorInputs {
  evEfficiency: number; // mi/kWh
  gasEfficiency: number; // mpg
  regularGasPrice: number; // $/gallon
  premiumGasPrice: number; // $/gallon
  homeElectricityPrice: number; // $/kWh
  fastChargingPrice: number; // $/kWh
  baseDistance: number; // miles
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

