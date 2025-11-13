'use client';

import { CalculationResults } from '@/types';
import {
  LineChart,
  Line,
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

export default function CostChart({ results }: CostChartProps) {
  // Show cost progression over time periods
  const chartData = [
    {
      period: 'Daily',
      'EV (Home)': results.daily.evHomeCharging.totalCost,
      'EV (Fast)': results.daily.evFastCharging.totalCost,
      'Gas (Regular)': results.daily.gasRegular.totalCost,
      'Gas (Premium)': results.daily.gasPremium.totalCost,
    },
    {
      period: 'Weekly',
      'EV (Home)': results.weekly.evHomeCharging.totalCost,
      'EV (Fast)': results.weekly.evFastCharging.totalCost,
      'Gas (Regular)': results.weekly.gasRegular.totalCost,
      'Gas (Premium)': results.weekly.gasPremium.totalCost,
    },
    {
      period: 'Monthly',
      'EV (Home)': results.monthly.evHomeCharging.totalCost,
      'EV (Fast)': results.monthly.evFastCharging.totalCost,
      'Gas (Regular)': results.monthly.gasRegular.totalCost,
      'Gas (Premium)': results.monthly.gasPremium.totalCost,
    },
    {
      period: 'Yearly',
      'EV (Home)': results.yearly.evHomeCharging.totalCost,
      'EV (Fast)': results.yearly.evFastCharging.totalCost,
      'Gas (Regular)': results.yearly.gasRegular.totalCost,
      'Gas (Premium)': results.yearly.gasPremium.totalCost,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Cost Comparison Chart
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        See how costs accumulate over time for each vehicle/charging option
      </p>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis 
            dataKey="period" 
            className="text-gray-700 dark:text-gray-300"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            className="text-gray-700 dark:text-gray-300"
            tick={{ fill: 'currentColor' }}
            tickFormatter={(value) => {
              if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
              return `$${value.toFixed(0)}`;
            }}
            scale="log"
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="EV (Home)" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line 
            type="monotone" 
            dataKey="EV (Fast)" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line 
            type="monotone" 
            dataKey="Gas (Regular)" 
            stroke="#f97316" 
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line 
            type="monotone" 
            dataKey="Gas (Premium)" 
            stroke="#ef4444" 
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

