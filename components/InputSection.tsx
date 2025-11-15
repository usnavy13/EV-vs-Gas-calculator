'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { CalculatorInputs, UsageScale } from '@/types';
import Tooltip from './Tooltip';
import PriceLookup from './PriceLookup';
import FuelEconomyVehicleSelect, {
  EfficiencyMode,
  VehicleSelectionSummary,
} from './FuelEconomyVehicleSelect';

interface InputSectionProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
  usageScale: UsageScale;
  onUsageScaleChange: (scale: UsageScale) => void;
  displayDistance: number;
  onDistanceChange: (value: number) => void;
  onResetInputs: () => void;
}

const usageOptions: { value: UsageScale; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

const EFFICIENCY_MODES: EfficiencyMode[] = ['combined', 'city', 'highway'];
const MODE_LABELS: Record<EfficiencyMode, string> = {
  combined: 'Combined',
  city: 'City',
  highway: 'Highway',
};

export default function InputSection({
  inputs,
  onChange,
  usageScale,
  onUsageScaleChange,
  displayDistance,
  onDistanceChange,
  onResetInputs,
}: InputSectionProps) {
  const [selectedEV, setSelectedEV] = useState<VehicleSelectionSummary | null>(null);
  const [selectedGas, setSelectedGas] = useState<VehicleSelectionSummary | null>(null);
  const [autoFlags, setAutoFlags] = useState({
    evEfficiency: false,
    gasEfficiency: false,
  });
  const [evRatingMode, setEvRatingMode] = useState<EfficiencyMode>('combined');
  const [gasRatingMode, setGasRatingMode] = useState<EfficiencyMode>('combined');
  const [evLookupKey, setEvLookupKey] = useState(0);
  const [gasLookupKey, setGasLookupKey] = useState(0);
  const [localDistanceValue, setLocalDistanceValue] = useState<string>(() => {
    const displayValue = Number.isFinite(displayDistance) ? displayDistance : 0;
    return displayValue.toString();
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);

  const distanceLabel = useMemo(() => {
    const option = usageOptions.find((opt) => opt.value === usageScale);
    return option ? option.label.toLowerCase() : 'day';
  }, [usageScale]);

  // Sync local value with displayDistance when it changes externally (e.g., scale change)
  useEffect(() => {
    if (!isTypingRef.current) {
      const displayValue = Number.isFinite(displayDistance) ? displayDistance : 0;
      setLocalDistanceValue(displayValue.toString());
    }
  }, [displayDistance, usageScale]);

  // Debounce: update parent after user stops typing
  useEffect(() => {
    if (!isTypingRef.current) return;
    if (localDistanceValue === '') return;
    const numeric = parseFloat(localDistanceValue);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    const id = window.setTimeout(() => {
      onDistanceChange(numeric);
    }, 600);
    return () => window.clearTimeout(id);
  }, [localDistanceValue, onDistanceChange]);

  const handleChange = (
    field: keyof CalculatorInputs,
    value: string | number,
    fromPreset = false
  ) => {
    let constrainedValue = value;
    if (typeof value === 'number') {
      switch (field) {
        case 'evEfficiency':
          constrainedValue = Math.max(0.1, Math.min(10.0, value));
          break;
        case 'gasEfficiency':
          constrainedValue = Math.max(1, Math.min(100, value));
          break;
        case 'regularGasPrice':
        case 'premiumGasPrice':
          constrainedValue = Math.max(0, Math.min(20, value));
          break;
        case 'homeElectricityPrice':
        case 'fastChargingPrice':
          constrainedValue = Math.max(0, Math.min(2, value));
          break;
        case 'baseDistance':
          constrainedValue = Math.max(0, Math.min(1000, value));
          break;
      }
    }

    onChange({
      ...inputs,
      [field]: constrainedValue,
    });

    if (field === 'evEfficiency' || field === 'gasEfficiency') {
      setAutoFlags((prev) => ({
        ...prev,
        [field]: fromPreset,
      }));
    }
  };

  const handleDistanceInput = (value: string) => {
    // Update local state only while typing - don't update parent yet
    setLocalDistanceValue(value);
    isTypingRef.current = true;
  };

  const handleDistanceBlur = () => {
    isTypingRef.current = false;
    const numeric = parseFloat(localDistanceValue);
    if (Number.isFinite(numeric) && numeric >= 0) {
      onDistanceChange(numeric);
      setLocalDistanceValue(numeric.toString());
    } else if (localDistanceValue === '') {
      // If empty, set to 0
      onDistanceChange(0);
      setLocalDistanceValue('0');
    } else {
      // Reset to displayDistance if invalid
      const displayValue = Number.isFinite(displayDistance) ? displayDistance : 0;
      setLocalDistanceValue(displayValue.toString());
      onDistanceChange(displayValue);
    }
  };

  const handleDistanceKeyDown = (e: { key: string; currentTarget: HTMLInputElement }) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const applySelectionEfficiency = (
    field: 'evEfficiency' | 'gasEfficiency',
    selection: VehicleSelectionSummary,
    mode: EfficiencyMode
  ) => {
    const value = selection.efficiencies[mode];
    if (isValidEfficiencyValue(value)) {
      handleChange(field, value as number, true);
    }
  };

  const handleVehicleSelection = (
    type: 'ev' | 'gas',
    selection: VehicleSelectionSummary | null
  ) => {
    if (type === 'ev') {
      setSelectedEV(selection);
      if (selection) {
        const mode = resolvePreferredMode(selection, evRatingMode);
        setEvRatingMode(mode);
        applySelectionEfficiency('evEfficiency', selection, mode);
      } else {
        setAutoFlags((prev) => ({ ...prev, evEfficiency: false }));
      }
    } else {
      setSelectedGas(selection);
      if (selection) {
        const mode = resolvePreferredMode(selection, gasRatingMode);
        setGasRatingMode(mode);
        applySelectionEfficiency('gasEfficiency', selection, mode);
      } else {
        setAutoFlags((prev) => ({ ...prev, gasEfficiency: false }));
      }
    }
  };

  const handleRatingModeChange = (type: 'ev' | 'gas', mode: EfficiencyMode) => {
    if (type === 'ev') {
      setEvRatingMode(mode);
      if (selectedEV) {
        const resolved = resolvePreferredMode(selectedEV, mode);
        setEvRatingMode(resolved);
        applySelectionEfficiency('evEfficiency', selectedEV, resolved);
      }
    } else {
      setGasRatingMode(mode);
      if (selectedGas) {
        const resolved = resolvePreferredMode(selectedGas, mode);
        setGasRatingMode(resolved);
        applySelectionEfficiency('gasEfficiency', selectedGas, resolved);
      }
    }
  };

  const clearAuto = (field: 'evEfficiency' | 'gasEfficiency') => {
    setAutoFlags((prev) => ({ ...prev, [field]: false }));
  };

  const handleReset = () => {
    setSelectedEV(null);
    setSelectedGas(null);
    setEvLookupKey((prev) => prev + 1);
    setGasLookupKey((prev) => prev + 1);
    setEvRatingMode('combined');
    setGasRatingMode('combined');
    setAutoFlags({ evEfficiency: false, gasEfficiency: false });
    onResetInputs();
  };

  return (
    <section className="rounded-[28px] border border-white/20 bg-white/95 p-6 text-slate-900 shadow-lg shadow-indigo-900/5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Inputs</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Set your inputs
          </h2>
          <p className="text-sm text-slate-500">
            Choose a vehicle baseline, pick the timeframe you care about, and
            paste in your local fuel prices.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Reset inputs
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <CollapsibleSection
          title="Vehicle"
          description="Choose presets and fine-tune efficiency."
          helper="Most EVs fall between 2.5–4.5 mi/kWh. Most gas sedans are ~30 mpg."
        >
            <div className="grid gap-4 sm:grid-cols-2">
              <FuelEconomyVehicleSelect
                key={`ev-selector-${evLookupKey}`}
                label="EV lookup"
                kind="ev"
                selected={selectedEV}
                ratingMode={evRatingMode}
                availableModes={getAvailableModesForSelection(selectedEV)}
                onRatingModeChange={(mode) => handleRatingModeChange('ev', mode)}
                onVehicleResolved={(selection) => handleVehicleSelection('ev', selection)}
              />
              <FuelEconomyVehicleSelect
                key={`gas-selector-${gasLookupKey}`}
                label="Gas / hybrid lookup"
                kind="gas"
                selected={selectedGas}
                ratingMode={gasRatingMode}
                availableModes={getAvailableModesForSelection(selectedGas)}
                onRatingModeChange={(mode) => handleRatingModeChange('gas', mode)}
                onVehicleResolved={(selection) => handleVehicleSelection('gas', selection)}
              />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <EfficiencyField
                label="EV efficiency"
                tooltip="Miles per kilowatt-hour. Higher is better."
                value={inputs.evEfficiency}
                placeholder="3.5"
                suffix="mi/kWh"
                isAuto={autoFlags.evEfficiency}
                autoSource={selectedEV?.description}
                autoModeLabel={MODE_LABELS[evRatingMode]}
                onChange={(val) =>
                  handleChange('evEfficiency', parseFloat(val) || 0)
                }
                onEdit={() => clearAuto('evEfficiency')}
              />
              <EfficiencyField
                label="Gas efficiency"
                tooltip="Miles per gallon. Hybrids ~55 mpg, trucks ~20 mpg."
                value={inputs.gasEfficiency}
                placeholder="25"
                suffix="mpg"
                isAuto={autoFlags.gasEfficiency}
                autoSource={selectedGas?.description}
                autoModeLabel={MODE_LABELS[gasRatingMode]}
                onChange={(val) =>
                  handleChange('gasEfficiency', parseFloat(val) || 0)
                }
                onEdit={() => clearAuto('gasEfficiency')}
              />
            </div>
        </CollapsibleSection>

        <div className="grid gap-4 lg:grid-cols-[2fr,2fr,1fr]">
          <CollapsibleSection
            title="Prices"
            description="Paste in rates or use the lookup tool."
            helper="Use current electricity and gas prices for your ZIP so results stay relevant."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Home charging rate"
                tooltip="¢/kWh from your utility bill."
                value={inputs.homeElectricityPrice}
                suffix="$ / kWh"
                step="0.01"
                onChange={(value) =>
                  handleChange(
                    'homeElectricityPrice',
                    parseFloat(value) || 0
                  )
                }
                placeholder="0.18"
              />
              <LabeledInput
                label="Fast charging rate"
                tooltip="Public DC fast charging price per kWh."
                value={inputs.fastChargingPrice}
                suffix="$ / kWh"
                step="0.01"
                onChange={(value) =>
                  handleChange('fastChargingPrice', parseFloat(value) || 0)
                }
                placeholder="0.50"
              />
              <LabeledInput
                label="Gas (regular)"
                tooltip="Local regular unleaded price per gallon."
                value={inputs.regularGasPrice}
                suffix="$ / gal"
                step="0.01"
                onChange={(value) =>
                  handleChange('regularGasPrice', parseFloat(value) || 0)
                }
                placeholder="3.09"
              />
              <LabeledInput
                label="Gas (premium)"
                tooltip="Premium unleaded price per gallon."
                value={inputs.premiumGasPrice}
                suffix="$ / gal"
                step="0.01"
                onChange={(value) =>
                  handleChange('premiumGasPrice', parseFloat(value) || 0)
                }
                placeholder="3.94"
              />
            </div>
          </CollapsibleSection>
          <div>
            <PriceLookup
              onUpdate={(updates) => onChange({ ...inputs, ...updates })}
            />
          </div>
          <CollapsibleSection
            title="Usage"
            description="Tell us how far you drive."
            helper="We scale this distance across daily, weekly, monthly, and yearly scenarios automatically."
          >
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-[180px]">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Distance per {distanceLabel}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="number"
                    min={0}
                    value={localDistanceValue}
                    onChange={(e) => handleDistanceInput(e.target.value)}
                    onBlur={handleDistanceBlur}
                    onKeyDown={handleDistanceKeyDown}
                    className="form-input-shell pr-16"
                    placeholder="30"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
                    mi
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Timeframe
                </label>
                <div className="segmented-control">
                  {usageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`segmented-control__item ${
                        usageScale === option.value ? 'is-active' : ''
                      }`}
                      onClick={() => onUsageScaleChange(option.value)}
                      aria-pressed={usageScale === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </section>
  );
}

function CollapsibleSection({
  title,
  description,
  helper,
  children,
}: {
  title: string;
  description: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {title}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">
          {description}
        </h3>
        <p className="text-sm text-slate-500">{helper}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function EfficiencyField({
  label,
  tooltip,
  value,
  placeholder,
  suffix,
  isAuto,
  autoSource,
  autoModeLabel,
  onChange,
  onEdit,
}: {
  label: string;
  tooltip: string;
  value: number;
  placeholder: string;
  suffix: string;
  isAuto: boolean;
  autoSource?: string;
  autoModeLabel?: string;
  onChange: (value: string) => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
          <Tooltip content={tooltip} />
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isAuto ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isAuto ? 'Auto' : 'Custom'}
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="form-input-shell pr-16"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
          {suffix}
        </span>
      </div>
      {isAuto && autoSource && (
        <p className="mt-2 text-xs text-slate-500">
          Autofilled from FuelEconomy.gov
          {autoModeLabel ? ` (${autoModeLabel})` : ''} for {autoSource}.{' '}
          <button
            type="button"
            onClick={onEdit}
            className="font-semibold text-slate-700 underline"
          >
            Edit
          </button>
        </p>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  tooltip,
  value,
  suffix,
  step,
  onChange,
  placeholder,
}: {
  label: string;
  tooltip: string;
  value: number;
  suffix: string;
  step: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        <Tooltip content={tooltip} />
      </div>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={value.toFixed(2)}
          onChange={(event) => onChange(event.target.value)}
          className="form-input-shell pr-20"
          placeholder={placeholder}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[11px] font-semibold text-slate-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function getAvailableModesForSelection(selection: VehicleSelectionSummary | null): EfficiencyMode[] {
  if (!selection) return [];
  return EFFICIENCY_MODES.filter((mode) => isValidEfficiencyValue(selection.efficiencies[mode]));
}

function resolvePreferredMode(
  selection: VehicleSelectionSummary,
  preferred: EfficiencyMode
): EfficiencyMode {
  const order: EfficiencyMode[] = [preferred, ...EFFICIENCY_MODES];
  for (const mode of order) {
    if (isValidEfficiencyValue(selection.efficiencies[mode])) {
      return mode;
    }
  }
  return preferred;
}

function isValidEfficiencyValue(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

