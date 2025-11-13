export interface CalculatorInputs {
  evEfficiency: number; // mi/kWh
  gasEfficiency: number; // mpg
  regularGasPrice: number; // $/gallon
  premiumGasPrice: number; // $/gallon
  homeElectricityPrice: number; // $/kWh
  fastChargingPrice: number; // $/kWh
  baseDistance: number; // miles
  gasType: 'regular' | 'premium';
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
  gas: CostBreakdown;
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
  gas: number;
}

