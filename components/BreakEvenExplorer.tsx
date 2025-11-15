'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type TouchEvent as ReactTouchEvent,
} from 'react';
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

const formatGasPrice = (value: number) =>
  Number.isFinite(value) ? `$${value.toFixed(2)}/gal` : '—';

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

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampDomainWithinBounds = (
  domain: [number, number],
  bounds: [number, number]
): [number, number] => {
  const span = Math.max(domain[1] - domain[0], 1e-6);
  const [boundMin, boundMax] = bounds;
  if (span >= boundMax - boundMin) {
    return [boundMin, boundMax];
  }
  let [min, max] = domain;
  if (min < boundMin) {
    min = boundMin;
    max = min + span;
  }
  if (max > boundMax) {
    max = boundMax;
    min = max - span;
  }
  return [Number(min.toFixed(4)), Number(max.toFixed(4))];
};

const getZoomedDomain = (
  currentDomain: [number, number],
  factor: number,
  focalValue: number,
  bounds: [number, number],
  minSpan: number,
  maxSpan: number
): [number, number] => {
  const [currentMin, currentMax] = currentDomain;
  const boundedFactor = clampValue(factor, 0.05, 20);
  const currentSpan = Math.max(currentMax - currentMin, 1e-6);
  const nextSpan = clampValue(currentSpan * boundedFactor, minSpan, maxSpan);
  const safeFocal = Number.isFinite(focalValue)
    ? clampValue(focalValue, bounds[0], bounds[1])
    : currentMin + currentSpan / 2;
  const normalized = currentSpan > 0 ? (safeFocal - currentMin) / currentSpan : 0.5;
  let nextMin = safeFocal - nextSpan * normalized;
  let nextMax = nextMin + nextSpan;

  if (nextMin < bounds[0]) {
    nextMin = bounds[0];
    nextMax = nextMin + nextSpan;
  }
  if (nextMax > bounds[1]) {
    nextMax = bounds[1];
    nextMin = nextMax - nextSpan;
  }

  return [Number(nextMin.toFixed(4)), Number(nextMax.toFixed(4))];
};

type ReferenceLineLabelProps = { viewBox?: { x: number; y: number; width: number } };

const createLineLabel = (
  text: string,
  color: string,
  offsetY = 0
): ((props: ReferenceLineLabelProps) => ReactElement) => {
  const LabelComponent = ({ viewBox }: ReferenceLineLabelProps): ReactElement => {
    const { x = 0, y = 0, width = 0 } = viewBox ?? {};
    const labelX = x + width - 10;
    const labelY = y + offsetY;
    const estimatedWidth = Math.max(48, text.length * 6.5);
    const rectWidth = estimatedWidth + 16;
    const rectHeight = 26;
    const rectX = labelX - rectWidth + 4;
    const rectY = labelY - rectHeight / 2;

    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect
          x={rectX}
          y={rectY}
          width={rectWidth}
          height={rectHeight}
          rx={rectHeight / 2}
          ry={rectHeight / 2}
          fill="rgba(255,255,255,0.9)"
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={1}
        />
        <text
          x={labelX - 6}
          y={labelY + 4}
          fill={color}
          fontSize={12}
          fontWeight={600}
          textAnchor="end"
          style={{ paintOrder: 'stroke' }}
        >
          {text}
        </text>
      </g>
    );
  };
  LabelComponent.displayName = `ReferenceLineLabel(${text})`;
  return LabelComponent;
};

type PanState = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  startGasDomain: [number, number];
  startElectricDomain: [number, number];
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
  const [testHomeRate, setTestHomeRate] = useState(inputs.homeElectricityPrice);
  const [testFastRate, setTestFastRate] = useState(inputs.fastChargingPrice);

  useEffect(() => {
    setTestHomeRate(inputs.homeElectricityPrice);
  }, [inputs.homeElectricityPrice]);

  useEffect(() => {
    setTestFastRate(inputs.fastChargingPrice);
  }, [inputs.fastChargingPrice]);

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
  const sliderHomeCostPerMile = calculateEVCostPerMileHome(inputs.evEfficiency, testHomeRate);
  const sliderFastCostPerMile = calculateEVCostPerMileHome(inputs.evEfficiency, testFastRate);
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
    const minGasPadding = Math.max(2, minGasCandidate * 0.4);
    const minGas = Math.max(0.5, Math.min(minGasCandidate * 0.6, minGasCandidate - minGasPadding));
    const maxGas = Math.min(12, Math.max(3, maxGasCandidate * 1.3));
    const desiredStep = 0.01;
    const steps = Math.min(1600, Math.max(80, Math.ceil((maxGas - minGas) / desiredStep)));
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
    { label: 'Fast (slider)', value: sliderFastCostPerMile, tone: 'text-purple-600' },
    { label: 'Home (your input)', value: actualHomeCostPerMile, tone: 'text-emerald-600' },
    { label: 'Fast charging', value: fastCostPerMile, tone: 'text-indigo-500' },
    { label: 'Gas (Regular)', value: gasRegularCostPerMile, tone: 'text-amber-600' },
    { label: 'Gas (Premium)', value: gasPremiumCostPerMile, tone: 'text-rose-600' },
  ];

  const sliderCards = [
    {
      label: 'Home charging',
      type: 'home',
      sliderCost: sliderHomeCostPerMile,
      testRate: testHomeRate,
      comparisons: [
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
      ],
    },
    {
      label: 'Fast charging',
      type: 'fast',
      sliderCost: sliderFastCostPerMile,
      testRate: testFastRate,
      comparisons: [
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
      ],
    },
  ];

  const markerPoints = [
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
  ];

  const { points, baseGasDomain, baseElectricDomain } = chartConfig;
  const [gasDomain, setGasDomain] = useState<[number, number]>(baseGasDomain);
  const [electricDomain, setElectricDomain] =
    useState<[number, number]>(baseElectricDomain);
  const [baseGasMin, baseGasMax] = baseGasDomain;
  const baseGasSpan = baseGasMax - baseGasMin || 1;
  const [baseElectricMin, baseElectricMax] = baseElectricDomain;
  const baseElectricSpan = baseElectricMax - baseElectricMin || 1;
  const gasBounds = useMemo<[number, number]>(() => {
    const padding = Math.max(baseGasSpan * 1.25, 1);
    const lower = Math.max(0.25, baseGasMin - padding);
    const upper = Math.min(20, baseGasMax + padding);
    return [lower, Math.max(lower + 0.1, upper)];
  }, [baseGasMin, baseGasMax, baseGasSpan]);
  const electricBounds = useMemo<[number, number]>(() => {
    const padding = Math.max(baseElectricSpan * 1.25, 0.1);
    const lower = Math.max(0, baseElectricMin - padding);
    const upper = Math.min(2.5, baseElectricMax + padding);
    return [lower, Math.max(lower + 0.05, upper)];
  }, [baseElectricMin, baseElectricMax, baseElectricSpan]);
  const minGasSpan = Math.min(Math.max(baseGasSpan * 0.05, 0.1), gasBounds[1] - gasBounds[0]);
  const maxGasSpan = Math.max(baseGasSpan, gasBounds[1] - gasBounds[0]);
  const minElectricSpan = Math.min(
    Math.max(baseElectricSpan * 0.05, 0.05),
    electricBounds[1] - electricBounds[0]
  );
  const maxElectricSpan = Math.max(baseElectricSpan, electricBounds[1] - electricBounds[0]);
  const pinchDistanceRef = useRef<number | null>(null);
  const chartSurfaceRef = useRef<HTMLDivElement | null>(null);
  const gasDomainRef = useRef(gasDomain);
  const electricDomainRef = useRef(electricDomain);
  const panStateRef = useRef<PanState | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    gasDomainRef.current = gasDomain;
  }, [gasDomain]);

  useEffect(() => {
    electricDomainRef.current = electricDomain;
  }, [electricDomain]);

  useEffect(() => {
    setGasDomain(baseGasDomain);
    setElectricDomain(baseElectricDomain);
  }, [baseGasDomain, baseElectricDomain]);

  const endPointerPan = useCallback((pointerId?: number) => {
    const panState = panStateRef.current;
    if (!panState) return;
    if (pointerId != null && panState.pointerId !== pointerId) return;
    const element = chartSurfaceRef.current;
    if (element && panState.pointerId != null && element.hasPointerCapture?.(panState.pointerId)) {
      element.releasePointerCapture(panState.pointerId);
    }
    panStateRef.current = null;
    setIsPanning(false);
  }, []);

  const applyZoom = useCallback(
    (factor: number, focalGas?: number, focalElectric?: number) => {
      setGasDomain((previous) => {
        const [prevMin, prevMax] = previous;
        const prevSpan = Math.max(prevMax - prevMin, 1e-6);
        const fallbackGas = prevMin + prevSpan / 2;
        return getZoomedDomain(
          previous,
          factor,
          Number.isFinite(focalGas) ? (focalGas as number) : fallbackGas,
          gasBounds,
          minGasSpan,
          maxGasSpan
        );
      });
      setElectricDomain((previous) => {
        const [prevMin, prevMax] = previous;
        const prevSpan = Math.max(prevMax - prevMin, 1e-6);
        const fallbackElectric = prevMin + prevSpan / 2;
        return getZoomedDomain(
          previous,
          factor,
          Number.isFinite(focalElectric) ? (focalElectric as number) : fallbackElectric,
          electricBounds,
          minElectricSpan,
          maxElectricSpan
        );
      });
    },
    [electricBounds, gasBounds, maxElectricSpan, maxGasSpan, minElectricSpan, minGasSpan]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const element = chartSurfaceRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const relativeX = clampValue((event.clientX - rect.left) / rect.width, 0, 1);
      const relativeY = clampValue((event.clientY - rect.top) / rect.height, 0, 1);
      const [gasMin, gasMax] = gasDomainRef.current;
      const [electricMin, electricMax] = electricDomainRef.current;
      const focalGas = gasMin + relativeX * (gasMax - gasMin);
      const focalElectric = electricMax - relativeY * (electricMax - electricMin);
      const factor = Math.exp((event.deltaY / 240) * Math.log(1.35));
      applyZoom(factor, focalGas, focalElectric);
    },
    [applyZoom]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.pointerType !== 'mouse') return;
      const element = chartSurfaceRef.current;
      if (!element) return;
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      panStateRef.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        startGasDomain: gasDomainRef.current,
        startElectricDomain: electricDomainRef.current,
      };
      setIsPanning(true);
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = panStateRef.current;
      if (!state || state.pointerId !== event.pointerId || state.pointerType !== 'mouse') return;
      const element = chartSurfaceRef.current;
      if (!element) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const gasSpan = state.startGasDomain[1] - state.startGasDomain[0];
      const electricSpan = state.startElectricDomain[1] - state.startElectricDomain[0];
      const nextGasDomain = clampDomainWithinBounds(
        [
          state.startGasDomain[0] - (dx / rect.width) * gasSpan,
          state.startGasDomain[1] - (dx / rect.width) * gasSpan,
        ],
        gasBounds
      );
      const nextElectricDomain = clampDomainWithinBounds(
        [
          state.startElectricDomain[0] + (dy / rect.height) * electricSpan,
          state.startElectricDomain[1] + (dy / rect.height) * electricSpan,
        ],
        electricBounds
      );
      setGasDomain(nextGasDomain);
      setElectricDomain(nextElectricDomain);
    },
    [electricBounds, gasBounds]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (panStateRef.current?.pointerId !== event.pointerId) return;
      event.preventDefault();
      endPointerPan(event.pointerId);
    },
    [endPointerPan]
  );

  const handlePointerLeave = useCallback(() => {
    endPointerPan();
  }, [endPointerPan]);

  useEffect(() => {
    const element = chartSurfaceRef.current;
    if (!element) return undefined;
    const listener = (event: WheelEvent) => handleWheel(event);
    element.addEventListener('wheel', listener, { passive: false });
    return () => {
      element.removeEventListener('wheel', listener);
    };
  }, [handleWheel]);

  const handleZoomIn = () => applyZoom(0.8);
  const handleZoomOut = () => applyZoom(1.25);
  const handleResetZoom = () => {
    setGasDomain(baseGasDomain);
    setElectricDomain(baseElectricDomain);
    pinchDistanceRef.current = null;
    endPointerPan();
  };

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2) {
        endPointerPan();
        event.preventDefault();
        pinchDistanceRef.current = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
      }
    },
    [endPointerPan]
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 2 || pinchDistanceRef.current == null) return;
      event.preventDefault();
      const element = chartSurfaceRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const midpointX =
        (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
      const midpointY =
        (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
      const relativeX = clampValue(midpointX / rect.width, 0, 1);
      const relativeY = clampValue(midpointY / rect.height, 0, 1);
      const [gasMin, gasMax] = gasDomainRef.current;
      const [electricMin, electricMax] = electricDomainRef.current;
      const focalGas = gasMin + relativeX * (gasMax - gasMin);
      const focalElectric = electricMax - relativeY * (electricMax - electricMin);
      const currentDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (!currentDistance || currentDistance === pinchDistanceRef.current) return;
      const factor = clampValue(pinchDistanceRef.current / currentDistance, 0.4, 2.5);
      applyZoom(factor, focalGas, focalElectric);
      pinchDistanceRef.current = currentDistance;
    },
    [applyZoom]
  );

  const handleTouchEnd = useCallback(() => {
    pinchDistanceRef.current = null;
  }, []);

  return (
    <section className="card-surface bg-white/95 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Break-even explorer</p>
        </div>
        <span className="badge-label">Interactive</span>
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
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          <div
            ref={chartSurfaceRef}
            className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 select-none ${
              isPanning ? 'cursor-grabbing' : 'cursor-grab'
            } lg:flex-1`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
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
                  allowDataOverflow
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
                  allowDataOverflow
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
                <ReferenceLine
                  y={inputs.homeElectricityPrice}
                  stroke="#0ea5e9"
                  strokeDasharray="4 4"
                  label={createLineLabel('Home Charging', '#0ea5e9', -16)}
                />
                <ReferenceLine
                  y={inputs.fastChargingPrice}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={createLineLabel('Fast Charging', '#6366f1', -2)}
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
          <div className="flex flex-col gap-4 lg:w-80">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p className="text-sm font-semibold text-slate-900">Home charging</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Regular gas:</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {formatPerMile(actualHomeCostPerMile - gasRegularCostPerMile)} vs regular
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Premium gas:</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {formatPerMile(actualHomeCostPerMile - gasPremiumCostPerMile)} vs premium
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Break‑even: Gas price &gt; {formatGasPrice((inputs.homeElectricityPrice * inputs.gasEfficiency) / inputs.evEfficiency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-semibold text-slate-900">Fast charging</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Regular gas:</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {formatPerMile(fastCostPerMile - gasRegularCostPerMile)} vs regular
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Premium gas:</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {formatPerMile(fastCostPerMile - gasPremiumCostPerMile)} vs premium
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Break‑even: Station rate &lt; {formatRate(parityRegular)} (regular)
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    &lt; {formatRate(parityPremium)} (premium)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          {markerPoints.map((point) => (
            <div
              key={point.label}
              className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
            >
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: point.color }}
                />
                {point.label}
              </span>
              <p className="mt-1 text-[11px] text-slate-500">
                Gas: {formatGasPrice(point.gasPrice)}
              </p>
              <p className="text-[11px] text-slate-500">
                Electric: {formatRate(point.electricityPrice)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Points below the line live in the EV-cheaper zone; points above it indicate gas is cheaper
          for that pairing of fuel prices.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Price testing
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              When does charging cost more than gas?
            </h3>
            <p className="text-sm text-slate-500">
              Use the slider to test different electricity prices and spot the exact point where
              charging surpasses gas for your inputs.
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Test home charging rate
                </p>
                <p className="text-3xl font-semibold text-slate-900">{formatRate(testHomeRate)}</p>
                <p className="text-sm text-slate-500">
                  Home charging cost at this rate: {formatPerMile(sliderHomeCostPerMile)}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Current input: {formatRate(inputs.homeElectricityPrice)}</p>
              </div>
            </div>
            <div className="mt-6">
              <input
                type="range"
                min={sliderBounds.min}
                max={sliderBounds.max}
                step={0.005}
                value={testHomeRate}
                onChange={(event) => setTestHomeRate(parseFloat(event.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>{formatRate(sliderBounds.min)}</span>
                <span>{formatRate(sliderBounds.max)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Test fast charging rate
                </p>
                <p className="text-3xl font-semibold text-slate-900">{formatRate(testFastRate)}</p>
                <p className="text-sm text-slate-500">
                  Fast charging cost at this rate: {formatPerMile(sliderFastCostPerMile)}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Current input: {formatRate(inputs.fastChargingPrice)}</p>
              </div>
            </div>
            <div className="mt-6">
              <input
                type="range"
                min={sliderBounds.min}
                max={sliderBounds.max}
                step={0.005}
                value={testFastRate}
                onChange={(event) => setTestFastRate(parseFloat(event.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>{formatRate(sliderBounds.min)}</span>
                <span>{formatRate(sliderBounds.max)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sliderCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm shadow-slate-900/5"
            >
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Test rate: {formatRate(card.testRate)}
                </p>
              </div>
              <div className="space-y-2">
                {card.comparisons.map((comparison) => {
                  const margin = comparison.gasCost - card.sliderCost;
                  const status =
                    margin > 0 ? 'Charging cheaper' : margin < 0 ? 'Charging more expensive' : 'At parity';
                  const barPercent =
                    comparison.parity > 0
                      ? Math.min(100, (card.testRate / comparison.parity) * 100)
                      : card.testRate > 0
                        ? 100
                        : 0;
                  const parityPercent =
                    comparison.parity > 0 ? `${Math.round((card.testRate / comparison.parity) * 100)}%` : '—';

                  return (
                    <div key={comparison.label}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                            {comparison.label}
                          </span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            Break-even: {formatRate(comparison.parity)}
                          </span>
                          <span
                            className={`text-xs font-medium whitespace-nowrap ${
                              margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-rose-600' : 'text-slate-600'
                            }`}
                          >
                            {status}: {describeMargin(margin)}
                          </span>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {parityPercent} of break-even
                          </span>
                        </div>
                        <span
                          className={`badge-label text-[10px] px-2 py-0.5 shrink-0 ${
                            margin > 0
                              ? 'border-emerald-200 text-emerald-600'
                              : margin < 0
                                ? 'border-rose-200 text-rose-600'
                                : ''
                          }`}
                        >
                          {margin > 0 ? 'Below' : margin < 0 ? 'Above' : 'At'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            margin >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

