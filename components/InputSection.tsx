'use client';

import { useMemo, useState } from 'react';
import { CalculatorInputs, UsageScale } from '@/types';
import Tooltip from './Tooltip';
import PriceLookup from './PriceLookup';
import { EV_PRESETS, GAS_PRESETS, VehiclePreset } from './VehiclePresets';

type SectionKey = 'vehicle' | 'usage' | 'prices';

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

export default function InputSection({
  inputs,
  onChange,
  usageScale,
  onUsageScaleChange,
  displayDistance,
  onDistanceChange,
  onResetInputs,
}: InputSectionProps) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    vehicle: true,
    usage: true,
    prices: true,
  });
  const [selectedEV, setSelectedEV] = useState<VehiclePreset | null>(null);
  const [selectedGas, setSelectedGas] = useState<VehiclePreset | null>(null);
  const [autoFlags, setAutoFlags] = useState({
    evEfficiency: false,
    gasEfficiency: false,
  });

  const distanceLabel = useMemo(() => {
    const option = usageOptions.find((opt) => opt.value === usageScale);
    return option ? option.label.toLowerCase() : 'day';
  }, [usageScale]);

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
    const numeric = parseFloat(value);
    onDistanceChange(Number.isFinite(numeric) ? numeric : 0);
  };

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePresetChange = (type: 'ev' | 'gas', presetName: string) => {
    if (type === 'ev') {
      const preset = EV_PRESETS.find((p) => p.name === presetName) || null;
      setSelectedEV(preset);
      if (preset) {
        handleChange('evEfficiency', preset.efficiency, true);
      }
    } else {
      const preset = GAS_PRESETS.find((p) => p.name === presetName) || null;
      setSelectedGas(preset);
      if (preset) {
        handleChange('gasEfficiency', preset.efficiency, true);
      }
    }
  };

  const clearAuto = (field: 'evEfficiency' | 'gasEfficiency') => {
    setAutoFlags((prev) => ({ ...prev, [field]: false }));
  };

  const handleReset = () => {
    setSelectedEV(null);
    setSelectedGas(null);
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
          isOpen={openSections.vehicle}
          onToggle={() => toggleSection('vehicle')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <PresetSelect
              label="EV model"
              value={selectedEV?.name || ''}
              options={EV_PRESETS}
              placeholder="Select EV"
              onChange={(value) => handlePresetChange('ev', value)}
            />
            <PresetSelect
              label="Gas model"
              value={selectedGas?.name || ''}
              options={GAS_PRESETS}
              placeholder="Select gas car"
              onChange={(value) => handlePresetChange('gas', value)}
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
              presetName={selectedEV?.name}
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
              presetName={selectedGas?.name}
              onChange={(val) =>
                handleChange('gasEfficiency', parseFloat(val) || 0)
              }
              onEdit={() => clearAuto('gasEfficiency')}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Usage"
          description="Tell us how far you drive."
          helper="We scale this distance across daily, weekly, monthly, and yearly scenarios automatically."
          isOpen={openSections.usage}
          onToggle={() => toggleSection('usage')}
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Distance per {distanceLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(displayDistance) ? displayDistance : 0}
                  onChange={(e) => handleDistanceInput(e.target.value)}
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

        <CollapsibleSection
          title="Prices"
          description="Paste in rates or use the lookup tool."
          helper="Use current electricity and gas prices for your ZIP so results stay relevant."
          isOpen={openSections.prices}
          onToggle={() => toggleSection('prices')}
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
              placeholder="0.12"
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
              placeholder="0.40"
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
              placeholder="3.50"
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
              placeholder="4.00"
            />
          </div>
          <div className="mt-6">
            <PriceLookup
              onUpdate={(updates) => onChange({ ...inputs, ...updates })}
            />
          </div>
        </CollapsibleSection>
      </div>
    </section>
  );
}

function CollapsibleSection({
  title,
  description,
  helper,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  helper: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {title}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {description}
          </h3>
          <p className="text-sm text-slate-500">{helper}</p>
        </div>
        <span className="badge-label mt-1">
          {isOpen ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {isOpen && <div className="mt-5 space-y-5">{children}</div>}
    </div>
  );
}

function PresetSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: VehiclePreset[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 form-input-shell"
      >
        <option value="">{placeholder}</option>
        {options.map((preset) => (
          <option key={preset.name} value={preset.name}>
            {preset.name} ({preset.efficiency})
          </option>
        ))}
      </select>
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
  presetName,
  onChange,
  onEdit,
}: {
  label: string;
  tooltip: string;
  value: number;
  placeholder: string;
  suffix: string;
  isAuto: boolean;
  presetName?: string;
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
      {isAuto && presetName && (
        <p className="mt-2 text-xs text-slate-500">
          Autofilled from {presetName}.{' '}
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
          value={value}
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

