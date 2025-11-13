# EV vs Gas Calculator

A comprehensive web calculator to compare the real-world costs between electric vehicles (EVs) and gas-powered cars.

## Features

- **Efficiency Comparison**: Compare EV efficiency (mi/kWh) with gas car efficiency (mpg)
- **Multiple Cost Scenarios**: Calculate costs for daily, weekly, monthly, and yearly distances
- **Flexible Pricing**: 
  - Regular vs Premium gas prices
  - Home charging vs Fast charging electricity costs
- **Visual Comparisons**: Interactive charts showing cost differences across scenarios
- **Real-time Calculations**: Instant updates as you change input values

## Getting Started

### Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t ev-gas-calculator .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Default Values

The calculator comes with sensible defaults:
- EV Efficiency: 3.5 mi/kWh
- Gas Efficiency: 25 mpg
- Regular Gas: $3.50/gallon
- Premium Gas: $4.00/gallon
- Home Electricity: $0.12/kWh
- Fast Charging: $0.40/kWh
- Base Distance: 30 miles (daily commute)

## Technology Stack

- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Docker

## License

MIT

