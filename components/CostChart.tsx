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
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/10">
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
    <section className="card-surface bg-white/95 p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Chart</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            How each option grows over time
          </h2>
          <p className="text-sm text-slate-500">
            The lines show daily, weekly, monthly, and yearly totals using the same inputs.
          </p>
        </div>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
          Hover for values
        </span>
      </div>

      <div className="rounded-[26px] border border-slate-100 bg-slate-50/60 p-4">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="period"
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5f5' }}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => {
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                return `$${value.toFixed(0)}`;
              }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="EV (Home)"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="EV (Fast)"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Gas (Regular)"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Gas (Premium)"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

