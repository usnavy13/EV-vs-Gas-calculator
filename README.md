# EV vs Gas Calculator

A comprehensive web calculator to compare the real-world costs between electric vehicles (EVs) and gas-powered cars.

## Features

- **Efficiency Comparison**: Compare EV efficiency (mi/kWh) with gas car efficiency (mpg)
- **Multiple Cost Scenarios**: Calculate costs for daily, weekly, monthly, and yearly distances
- **Flexible Pricing**: 
  - Regular vs Premium gas prices
  - Home charging vs Fast charging electricity costs
- **Local Price Lookup**: Automatically fetch local gas prices and electricity rates by ZIP code
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

1. Create a `.env.local` file with your EIA API key (see Environment Variables section above)

2. Build the Docker image:
```bash
docker build -t ev-gas-calculator .
```

3. Run with Docker Compose (will automatically load EIA_API_KEY from .env.local):
```bash
docker-compose up -d
```

Or set the environment variable directly:
```bash
EIA_API_KEY=your_key_here docker-compose up -d
```

4. Access the application at [http://localhost:3000](http://localhost:3000)

## Default Values

The calculator comes with sensible defaults:
- EV Efficiency: 3.5 mi/kWh
- Gas Efficiency: 25 mpg
- Regular Gas: $3.50/gallon
- Premium Gas: $4.00/gallon
- Home Electricity: $0.12/kWh
- Fast Charging: $0.40/kWh
- Base Distance: 30 miles (daily commute)

## Local Price Lookup

The calculator includes a built-in lookup feature that allows users to automatically fetch local gas prices and electricity rates by entering their ZIP code:

1. **Gas Prices**: Uses state-specific average gas prices based on ZIP code lookup
2. **Electricity Rates**: Fetches real-time average residential electricity rates by state from EIA API

The lookup feature:
- Validates ZIP code format (5 digits or 5+4 format)
- Automatically updates gas prices (regular and premium) and electricity rates
- Uses EIA (U.S. Energy Information Administration) API for real-time electricity rate data
- Falls back to state averages if API data isn't available
- Allows manual entry if lookup fails or for custom values

**Data Sources**:
- **Electricity Rates**: Real-time data from EIA API (U.S. Energy Information Administration)
- **Gas Prices**: State-specific averages (updated periodically)

**Note**: Prices are based on state averages and may not reflect exact local prices. Users can always manually adjust values after lookup.

### Environment Variables

Create a `.env.local` file in the root directory with your EIA API key:

```
EIA_API_KEY=your_eia_api_key_here
LOG_LEVEL=lite
```

**Available Environment Variables:**
- `EIA_API_KEY`: Your EIA API key for fetching real-time electricity rates. Get your free API key at: https://www.eia.gov/opendata/register.php
- `LOG_LEVEL`: Controls logging verbosity. Options:
  - `lite` (default): Only logs errors and warnings
  - `verbose`: Logs all debug/info messages including API requests and responses

## Technology Stack

- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Docker

## License

MIT

