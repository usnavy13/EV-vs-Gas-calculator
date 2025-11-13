'use client';

import { CalculationResults, ChartDataPoint } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations';

interface CostChartProps {
  results: CalculationResults;
}

export default function CostChart({ results }: CostChartProps) {
  const chartData: ChartDataPoint[] = [
    {
      scenario: 'Daily',
      evHome: results.daily.evHomeCharging.totalCost,
      evFast: results.daily.evFastCharging.totalCost,
      gas: results.daily.gas.totalCost,
    },
    {
      scenario: 'Weekly',
      evHome: results.weekly.evHomeCharging.totalCost,
      evFast: results.weekly.evFastCharging.totalCost,
      gas: results.weekly.gas.totalCost,
    },
    {
      scenario: 'Monthly',
      evHome: results.monthly.evHomeCharging.totalCost,
      evFast: results.monthly.evFastCharging.totalCost,
      gas: results.monthly.gas.totalCost,
    },
    {
      scenario: 'Yearly',
      evHome: results.yearly.evHomeCharging.totalCost,
      evFast: results.yearly.evFastCharging.totalCost,
      gas: results.yearly.gas.totalCost,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Cost Comparison Chart
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis 
            dataKey="scenario" 
            className="text-gray-700 dark:text-gray-300"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            className="text-gray-700 dark:text-gray-300"
            tick={{ fill: 'currentColor' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="evHome" 
            fill="#10b981" 
            name="EV (Home Charging)"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="evFast" 
            fill="#3b82f6" 
            name="EV (Fast Charging)"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="gas" 
            fill="#f97316" 
            name="Gas Car"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

