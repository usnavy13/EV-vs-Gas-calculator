export interface VehiclePreset {
  name: string;
  efficiency: number;
  description?: string;
}

export const EV_PRESETS: VehiclePreset[] = [
  { name: 'Tesla Model 3', efficiency: 4.2, description: 'EPA rated 4.2 mi/kWh combined' },
  { name: 'Tesla Model Y', efficiency: 3.8, description: 'EPA rated 3.8 mi/kWh combined' },
  { name: 'Chevy Bolt EV', efficiency: 4.0, description: 'EPA rated 4.0 mi/kWh combined' },
  { name: 'Nissan Leaf', efficiency: 3.8, description: 'EPA rated 3.8 mi/kWh combined' },
  { name: 'Ford Mach-E', efficiency: 3.5, description: 'EPA rated 3.5 mi/kWh combined' },
  { name: 'Hyundai IONIQ 5', efficiency: 3.6, description: 'EPA rated 3.6 mi/kWh combined' },
  { name: 'Kia EV6', efficiency: 3.6, description: 'EPA rated 3.6 mi/kWh combined' },
  { name: 'Rivian R1T', efficiency: 2.8, description: 'EPA rated 2.8 mi/kWh combined' },
];

export const GAS_PRESETS: VehiclePreset[] = [
  { name: 'Toyota Prius', efficiency: 56, description: 'EPA rated 56 mpg combined' },
  { name: 'Honda Civic', efficiency: 35, description: 'EPA rated 35 mpg combined' },
  { name: 'Toyota Camry', efficiency: 32, description: 'EPA rated 32 mpg combined' },
  { name: 'Ford F-150', efficiency: 22, description: 'EPA rated 22 mpg combined' },
  { name: 'BMW 3 Series', efficiency: 30, description: 'EPA rated 30 mpg combined' },
  { name: 'Honda Accord', efficiency: 33, description: 'EPA rated 33 mpg combined' },
  { name: 'Toyota RAV4', efficiency: 30, description: 'EPA rated 30 mpg combined' },
  { name: 'Chevy Silverado', efficiency: 20, description: 'EPA rated 20 mpg combined' },
];
