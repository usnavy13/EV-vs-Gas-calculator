'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { CalculatorInputs } from '@/types';
import {
  calculateElectricityParityRate,
  calculateEVCostPerMileHome,
  calculateGasCostPerMile,
} from '@/lib/calculations';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BreakEvenExplorerProps {
  inputs: CalculatorInputs;
}

const formatRate = (value: number) =>
  Number.isFinite(value) ? `$${value.toFixed(2)}/kWh` : '—';

const formatPerMile = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1) {
    return `$${value.toFixed(2)}/mi`;
  }
  return `${(value * 100).toFixed(1)}¢/mi`;
};

const describeMargin = (margin: number) => {
  if (!Number.isFinite(margin) || margin === 0) return 'at parity';
  const abs = Math.abs(margin);
  const formatted = abs >= 1 ? `$${abs.toFixed(2)}/mi` : `${(abs * 100).toFixed(1)}¢/mi`;
  return margin > 0 ? `${formatted} cheaper` : `${formatted} more`;
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const gasPrice = Number(label);
  const electric = payload[0]?.value as number;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-600 shadow-lg shadow-slate-900/10">
      <p className="font-semibold text-slate-800">
        Gas: ${gasPrice.toFixed(2)}/gal
      </p>
      <p>Break-even electricity: ${electric.toFixed(3)}/kWh</p>
      <p className="text-xs text-slate-500">
        Below this line → EV cheaper · Above this line → Gas cheaper
      </p>
    </div>
  );
};

export default function BreakEvenExplorer({ inputs }: BreakEvenExplorerProps) {
  const [testRate, setTestRate] = useState(inputs.homeElectricityPrice);

  useEffect(() => {
    setTestRate(inputs.homeElectricityPrice);
  }, [inputs.homeElectricityPrice]);

  const sliderBounds = useMemo(() => {
    const regularParity = calculateElectricityParityRate(
      inputs.regularGasPrice,
      inputs.gasEfficiency,
      inputs.evEfficiency
    );
    const premiumParity = calculateElectricityParityRate(
      inputs.premiumGasPrice,
      inputs.gasEfficiency,
      inputs.evEfficiency
    );
    const candidates = [
      0.01,
      regularParity * 1.3,
      premiumParity * 1.3,
      inputs.homeElectricityPrice * 2,
      inputs.fastChargingPrice * 1.4,
      0.6,
    ].filter((num) => Number.isFinite(num) && num > 0);

    const min = Math.min(...candidates, 0.01);
    const max = Math.max(...candidates, 0.6);
    return { min: Math.max(0.01, min), max: Math.min(2, Math.max(max, 0.2)) };
  }, [
    inputs.evEfficiency,
    inputs.fastChargingPrice,
    inputs.gasEfficiency,
    inputs.homeElectricityPrice,
    inputs.premiumGasPrice,
    inputs.regularGasPrice,
  ]);

  const parityRegular = calculateElectricityParityRate(
    inputs.regularGasPrice,
    inputs.gasEfficiency,
    inputs.evEfficiency
  );
  const parityPremium = calculateElectricityParityRate(
    inputs.premiumGasPrice,
    inputs.gasEfficiency,
    inputs.evEfficiency
  );

  const gasRegularCostPerMile = calculateGasCostPerMile(
    inputs.gasEfficiency,
    inputs.regularGasPrice
  );
  const gasPremiumCostPerMile = calculateGasCostPerMile(
    inputs.gasEfficiency,
    inputs.premiumGasPrice
  );
  const sliderHomeCostPerMile = calculateEVCostPerMileHome(inputs.evEfficiency, testRate);
  const actualHomeCostPerMile = calculateEVCostPerMileHome(
    inputs.evEfficiency,
    inputs.homeElectricityPrice
  );
  const fastCostPerMile = calculateEVCostPerMileHome(
    inputs.evEfficiency,
    inputs.fastChargingPrice
  );

  const efficiencyRatio =
    inputs.gasEfficiency > 0 ? inputs.evEfficiency / inputs.gasEfficiency : 0;

  const chartConfig = useMemo(() => {
    const minGasCandidate =
      Math.min(inputs.regularGasPrice, inputs.premiumGasPrice) || inputs.regularGasPrice;
    const maxGasCandidate = Math.max(
      inputs.regularGasPrice,
      inputs.premiumGasPrice,
      inputs.regularGasPrice * 1.2,
      inputs.premiumGasPrice * 1.2,
      5
    );
    const minGas = Math.max(0.5, minGasCandidate * 0.6);
    const maxGas = Math.min(12, Math.max(3, maxGasCandidate * 1.3));
    const steps = 40;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const gasPrice = minGas + ((maxGas - minGas) * i) / steps;
      points.push({
        gasPrice,
        breakEven: gasPrice * efficiencyRatio,
      });
    }
    const maxLine = points.reduce((max, point) => Math.max(max, point.breakEven), 0);
    const baseElectricMax = Math.min(
      2,
      Math.max(
        maxLine * 1.2,
        inputs.homeElectricityPrice * 1.4,
        inputs.fastChargingPrice * 1.4,
        sliderBounds.max * 1.2,
        0.6
      )
    );
    return {
      points,
      baseGasDomain: [minGas, maxGas] as [number, number],
      baseElectricDomain: [0, Math.max(baseElectricMax, sliderBounds.max)] as [number, number],
    };
  }, [
    efficiencyRatio,
    inputs.fastChargingPrice,
    inputs.homeElectricityPrice,
    inputs.premiumGasPrice,
    inputs.regularGasPrice,
    sliderBounds.max,
  ]);

  const comparisonRows = [
    { label: 'Home (slider)', value: sliderHomeCostPerMile, tone: 'text-indigo-600' },
    { label: 'Home (your input)', value: actualHomeCostPerMile, tone: 'text-emerald-600' },
    { label: 'Fast charging', value: fastCostPerMile, tone: 'text-indigo-500' },
    { label: 'Gas (Regular)', value: gasRegularCostPerMile, tone: 'text-amber-600' },
    { label: 'Gas (Premium)', value: gasPremiumCostPerMile, tone: 'text-rose-600' },
  ];

  const sliderCards = [
    {
      label: 'vs Regular gas',
      parity: parityRegular,
      gasCost: gasRegularCostPerMile,
    },
    {
      label: 'vs Premium gas',
      parity: parityPremium,
      gasCost: gasPremiumCostPerMile,
    },
  ];

  const markerPoints = [
    {
      label: 'Home vs Regular',
      gasPrice: inputs.regularGasPrice,
      electricityPrice: inputs.homeElectricityPrice,
      color: '#34d399',
    },
    {
      label: 'Fast vs Regular',
      gasPrice: inputs.regularGasPrice,
      electricityPrice: inputs.fastChargingPrice,
      color: '#818cf8',
    },
    {
      label: 'Home vs Premium',
      gasPrice: inputs.premiumGasPrice,
      electricityPrice: inputs.homeElectricityPrice,
      color: '#fb7185',
    },
    {
      label: 'Fast vs Premium',
      gasPrice: inputs.premiumGasPrice,
      electricityPrice: inputs.fastChargingPrice,
      color: '#c084fc',
    },
    {
      label: 'Regular parity',
      gasPrice: inputs.regularGasPrice,
      electricityPrice: parityRegular,
      color: '#f97316',
    },
    {
      label: 'Premium parity',
      gasPrice: inputs.premiumGasPrice,
      electricityPrice: parityPremium,
      color: '#ef4444',
    },
  ];

  const { points, baseGasDomain, baseElectricDomain } = chartConfig;
  const [gasDomain, setGasDomain] = useState<[number, number]>(baseGasDomain);
  const [electricDomain, setElectricDomain] =
    useState<[number, number]>(baseElectricDomain);
  const [baseGasMin, baseGasMax] = baseGasDomain;
  const baseGasSpan = baseGasMax - baseGasMin || 1;
  const [baseElectricMin, baseElectricMax] = baseElectricDomain;
  const baseElectricSpan = baseElectricMax - baseElectricMin || 1;
  const pinchDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    setGasDomain(baseGasDomain);
    setElectricDomain(baseElectricDomain);
  }, [baseGasDomain, baseElectricDomain]);

  const applyZoom = useCallback(
    (
      factor: number,
      focalGas = (gasDomain[0] + gasDomain[1]) / 2,
      focalElectric = (electricDomain[0] + electricDomain[1]) / 2
    ) => {
      const currentSpan = gasDomain[1] - gasDomain[0];
      const newSpan = Math.min(
        Math.max(currentSpan * factor, baseGasSpan * 0.25),
        baseGasSpan * 1.2
      );
      const center = Math.min(
        Math.max(focalGas, baseGasMin + newSpan / 2),
        baseGasMax - newSpan / 2
      );
      let newMin = center - newSpan / 2;
      let newMax = center + newSpan / 2;
      if (newMin < baseGasMin) {
        newMax += baseGasMin - newMin;
        newMin = baseGasMin;
      }
      if (newMax > baseGasMax) {
        newMin -= newMax - baseGasMax;
        newMax = baseGasMax;
      }
      setGasDomain([newMin, newMax]);
      const currentElectricSpan = electricDomain[1] - electricDomain[0];
      const newElectricSpan = Math.min(
        Math.max(currentElectricSpan * factor, baseElectricSpan * 0.25),
        baseElectricSpan * 1.2
      );
      const electricCenter = Math.min(
        Math.max(focalElectric, baseElectricMin + newElectricSpan / 2),
        baseElectricMax - newElectricSpan / 2
      );
      let newElectricMin = electricCenter - newElectricSpan / 2;
      let newElectricMax = electricCenter + newElectricSpan / 2;
      if (newElectricMin < baseElectricMin) {
        newElectricMax += baseElectricMin - newElectricMin;
        newElectricMin = baseElectricMin;
      }
      if (newElectricMax > baseElectricMax) {
        newElectricMin -= newElectricMax - baseElectricMax;
        newElectricMax = baseElectricMax;
      }
      setElectricDomain([newElectricMin, newElectricMax]);
    },
    [
      baseElectricMax,
      baseElectricMin,
      baseElectricSpan,
      baseGasMax,
      baseGasMin,
      baseGasSpan,
      electricDomain,
      gasDomain,
    ]
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeY = (event.clientY - rect.top) / rect.height;
      const focalGas =
        gasDomain[0] + relativeX * (gasDomain[1] - gasDomain[0]);
      const focalElectric =
        electricDomain[1] -
        relativeY * (electricDomain[1] - electricDomain[0]);
      const factor = event.deltaY < 0 ? 0.85 : 1.15;
      applyZoom(factor, focalGas, focalElectric);
    },
    [applyZoom, electricDomain, gasDomain]
  );

  const handleZoomIn = () => applyZoom(0.7);
  const handleZoomOut = () => applyZoom(1.3);
  const handleResetZoom = () => {
    setGasDomain(baseGasDomain);
    setElectricDomain(baseElectricDomain);
    pinchDistanceRef.current = null;
  };

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      pinchDistanceRef.current = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 2 || pinchDistanceRef.current == null) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const midpointX =
        (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
      const midpointY =
        (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
      const relativeX = midpointX / rect.width;
      const relativeY = midpointY / rect.height;
      const focalGas =
        gasDomain[0] + relativeX * (gasDomain[1] - gasDomain[0]);
      const focalElectric =
        electricDomain[1] -
        relativeY * (electricDomain[1] - electricDomain[0]);
      const currentDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (!currentDistance || currentDistance === pinchDistanceRef.current) return;
      const factor = currentDistance < pinchDistanceRef.current ? 1.1 : 0.9;
      applyZoom(factor, focalGas, focalElectric);
      pinchDistanceRef.current = currentDistance;
    },
    [applyZoom, electricDomain, gasDomain]
  );

  const handleTouchEnd = useCallback(() => {
    pinchDistanceRef.current = null;
  }, []);

  return (
    <section className="card-surface bg-white/95 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Break-even explorer</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            When does charging cost more than gas?
          </h2>
          <p className="text-sm text-slate-500">
            Use the slider to test different electricity prices and spot the exact point where
            charging surpasses gas for your inputs.
          </p>
        </div>
        <span className="badge-label">Interactive</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Test electricity rate
              </p>
              <p className="text-3xl font-semibold text-slate-900">{formatRate(testRate)}</p>
              <p className="text-sm text-slate-500">
                Home charging cost at this rate: {formatPerMile(sliderHomeCostPerMile)}
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Current input: {formatRate(inputs.homeElectricityPrice)}</p>
              <p>Fast charging: {formatRate(inputs.fastChargingPrice)}</p>
            </div>
          </div>
          <div className="mt-6">
            <input
              type="range"
              min={sliderBounds.min}
              max={sliderBounds.max}
              step={0.005}
              value={testRate}
              onChange={(event) => setTestRate(parseFloat(event.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>{formatRate(sliderBounds.min)}</span>
              <span>{formatRate(sliderBounds.max)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sliderCards.map((card) => {
            const margin = card.gasCost - sliderHomeCostPerMile;
            const status =
              margin > 0 ? 'Charging still cheaper' : margin < 0 ? 'Charging now more expensive' : 'At parity';
            const barPercent =
              card.parity > 0 ? Math.min(100, (testRate / card.parity) * 100) : testRate > 0 ? 100 : 0;
            const parityPercent =
              card.parity > 0 ? `${Math.round((testRate / card.parity) * 100)}%` : '—';

            return (
              <div
                key={card.label}
                className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm shadow-slate-900/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      Break-even at {formatRate(card.parity)}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-rose-600' : 'text-slate-600'
                      }`}
                    >
                      {status}: {describeMargin(margin)}
                    </p>
                  </div>
                  <span
                    className={`badge-label ${
                      margin > 0 ? 'border-emerald-200 text-emerald-600' : margin < 0 ? 'border-rose-200 text-rose-600' : ''
                    }`}
                  >
                    {margin > 0 ? 'Below parity' : margin < 0 ? 'Above parity' : 'Exact parity'}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      margin >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Your slider rate is {parityPercent} of the break-even point.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Break-even map
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              Electricity vs gas price combinations
            </h3>
            <p className="text-sm text-slate-500">
              The diagonal line is the break-even equation. Points show your actual gas + electricity
              combos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-label">Hover for values</span>
            <div className="inline-flex rounded-full border border-slate-200 bg-white/80 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={handleZoomIn}
                className="px-3 py-1 hover:bg-slate-100 rounded-full"
              >
                Zoom in
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="px-3 py-1 hover:bg-slate-100 rounded-full"
              >
                Zoom out
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-3 py-1 hover:bg-slate-100 rounded-full"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        <div
          className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={points}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <defs>
                <linearGradient id="evZone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="gasPrice"
                domain={gasDomain}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5f5' }}
                label={{
                  value: 'Gas price ($/gal)',
                  position: 'insideBottomRight',
                  offset: 0,
                  fill: '#475569',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                domain={electricDomain}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5f5' }}
                label={{
                  value: 'Electricity price ($/kWh)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 15,
                  fill: '#475569',
                  fontSize: 12,
                }}
              />
              <RechartTooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={inputs.homeElectricityPrice}
                stroke="#0ea5e9"
                strokeDasharray="4 4"
                label={{ value: 'Home rate', position: 'right', fill: '#0ea5e9' }}
              />
              <ReferenceLine
                y={inputs.fastChargingPrice}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{ value: 'Fast rate', position: 'right', fill: '#6366f1' }}
              />
              <Area
                type="monotone"
                dataKey="breakEven"
                stroke="none"
                fill="url(#evZone)"
                name="EV cheaper zone"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="breakEven"
                stroke="#ea580c"
                strokeWidth={3}
                dot={false}
                name="Break-even"
                fill="url(#evZone)"
              />
              {markerPoints
                .filter(
                  (point) =>
                    Number.isFinite(point.gasPrice) && Number.isFinite(point.electricityPrice)
                )
                .map((point) => (
                <ReferenceDot
                    key={point.label}
                    x={point.gasPrice}
                    y={point.electricityPrice}
                    r={5}
                    fill={point.color}
                    stroke="#0f172a"
                    strokeWidth={1}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          {markerPoints.map((point) => (
            <span
              key={point.label}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 font-semibold"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: point.color }}
              />
              {point.label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Points below the line live in the EV-cheaper zone; points above it indicate gas is cheaper
          for that pairing of fuel prices.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Cost per mile snapshot
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comparisonRows.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-slate-100 bg-white/85 p-4 text-sm text-slate-600"
            >
              <p className="font-semibold text-slate-500">{row.label}</p>
              <p className={`mt-2 text-xl font-semibold ${row.tone}`}>{formatPerMile(row.value)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Figures assume your EV efficiency of {inputs.evEfficiency.toFixed(1)} mi/kWh and gas efficiency of{' '}
          {inputs.gasEfficiency.toFixed(0)} mpg.
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fast charging outlook
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          Fast charging costs {describeMargin(gasRegularCostPerMile - fastCostPerMile)} vs regular gas and{' '}
          {describeMargin(gasPremiumCostPerMile - fastCostPerMile)} vs premium.
        </p>
        <p className="text-sm text-slate-500">
          Fast charging only undercuts regular gas if station rates drop below {formatRate(parityRegular)},
          and it would take {formatRate(parityPremium)} or less to beat premium gas.
        </p>
      </div>
    </section>
  );
}

