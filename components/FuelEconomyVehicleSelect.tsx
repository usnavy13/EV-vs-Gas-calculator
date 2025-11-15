'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FuelEconomyMenuItem,
  FuelEconomyVehicleDetails,
  convertKwhPer100MilesToMilesPerKwh,
  getVehicleDetails,
  getVehicleMakes,
  getVehicleModels,
  getVehicleOptions,
  getVehicleYears,
  parseFuelEconomyNumber,
} from '@/lib/fueleconomy';

export type EfficiencyMode = 'combined' | 'city' | 'highway';

export interface VehicleSelectionSummary {
  id: string;
  description: string;
  year?: string;
  make?: string;
  model?: string;
  transmission?: string;
  fuelType?: string;
  comb08?: number | null;
  combE?: number | null;
  efficiencies: Record<EfficiencyMode, number | null>;
  efficiencyUnit: 'mpg' | 'mi/kWh';
  source: string;
}

interface VehicleDefaultSelection {
  year: string;
  make: string;
  model: string;
  optionId: string;
}

interface FuelEconomyVehicleSelectProps {
  label: string;
  kind: 'ev' | 'gas';
  onVehicleResolved: (selection: VehicleSelectionSummary | null) => void;
  selected?: VehicleSelectionSummary | null;
  ratingMode?: EfficiencyMode;
  availableModes?: EfficiencyMode[];
  onRatingModeChange?: (mode: EfficiencyMode) => void;
  defaultSelection?: VehicleDefaultSelection;
}

export default function FuelEconomyVehicleSelect({
  label,
  kind,
  onVehicleResolved,
  selected,
  ratingMode,
  availableModes,
  onRatingModeChange,
  defaultSelection,
}: FuelEconomyVehicleSelectProps) {
  const [yearOptions, setYearOptions] = useState<FuelEconomyMenuItem[]>([]);
  const [makeOptions, setMakeOptions] = useState<FuelEconomyMenuItem[]>([]);
  const [modelOptions, setModelOptions] = useState<FuelEconomyMenuItem[]>([]);
  const [optionItems, setOptionItems] = useState<FuelEconomyMenuItem[]>([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedOption, setSelectedOption] = useState('');

  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isFetchingVehicle, setIsFetchingVehicle] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const defaultsAppliedRef = useRef(false);
  const onResolvedRef = useRef(onVehicleResolved);

  useEffect(() => {
    onResolvedRef.current = onVehicleResolved;
  }, [onVehicleResolved]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingYears(true);
    getVehicleYears()
      .then((items) => {
        if (!cancelled) {
          setYearOptions(items);
        }
      })
      .catch((err) => {
        console.error('Failed to load FuelEconomy.gov years', err);
        if (!cancelled) {
          setErrorMessage('Could not load model years from FuelEconomy.gov. Try again.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingYears(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

useEffect(() => {
  if (!defaultSelection || defaultsAppliedRef.current) return;
  let cancelled = false;

  const applyDefaults = async () => {
    defaultsAppliedRef.current = true;

    try {
      setSelectedYear(defaultSelection.year);
      setIsLoadingMakes(true);
      setStatusMessage('Loading makes…');
      const makes = await getVehicleMakes(defaultSelection.year);
      if (cancelled) return;
      setMakeOptions(makes);
      setSelectedMake(defaultSelection.make);
    } catch (error) {
      console.error('Default make load failed', error);
    } finally {
      if (!cancelled) {
        setIsLoadingMakes(false);
        setStatusMessage(null);
      }
    }

    try {
      setIsLoadingModels(true);
      setStatusMessage('Loading models…');
      const models = await getVehicleModels(defaultSelection.year, defaultSelection.make);
      if (cancelled) return;
      setModelOptions(models);
      setSelectedModel(defaultSelection.model);
    } catch (error) {
      console.error('Default model load failed', error);
    } finally {
      if (!cancelled) {
        setIsLoadingModels(false);
        setStatusMessage(null);
      }
    }

    try {
      setIsLoadingOptions(true);
      setStatusMessage('Loading trims…');
      const options = await getVehicleOptions(
        defaultSelection.year,
        defaultSelection.make,
        defaultSelection.model
      );
      if (cancelled) return;
      setOptionItems(options);
      setSelectedOption(defaultSelection.optionId);
    } catch (error) {
      console.error('Default option load failed', error);
    } finally {
      if (!cancelled) {
        setIsLoadingOptions(false);
        setStatusMessage(null);
      }
    }

    try {
      setIsFetchingVehicle(true);
      setStatusMessage('Fetching EPA data…');
      const details = await getVehicleDetails(defaultSelection.optionId);
      if (cancelled) return;
      const selection = buildSelection(details, kind);
      onResolvedRef.current(selection);
      setStatusMessage(null);
    } catch (error) {
      console.error('Default vehicle lookup failed', error);
    } finally {
      if (!cancelled) {
        setIsFetchingVehicle(false);
        setStatusMessage(null);
      }
    }
  };

  applyDefaults();

  return () => {
    cancelled = true;
  };
}, [defaultSelection, kind]);

  const resetSelections = (level: 'year' | 'make' | 'model') => {
    if (level === 'year') {
      setSelectedMake('');
      setSelectedModel('');
      setSelectedOption('');
      setMakeOptions([]);
      setModelOptions([]);
      setOptionItems([]);
    } else if (level === 'make') {
      setSelectedModel('');
      setSelectedOption('');
      setModelOptions([]);
      setOptionItems([]);
    } else if (level === 'model') {
      setSelectedOption('');
      setOptionItems([]);
    }
  };

  const handleYearChange = async (value: string) => {
    setSelectedYear(value);
    resetSelections('year');
    setErrorMessage(null);
    onVehicleResolved(null);

    if (!value) return;

    setIsLoadingMakes(true);
    setStatusMessage('Loading makes…');
    try {
      const items = await getVehicleMakes(value);
      setMakeOptions(items);
      setStatusMessage(null);
    } catch (error) {
      console.error('Failed to load makes', error);
      setStatusMessage(null);
      setErrorMessage('Unable to load makes for that year.');
    } finally {
      setIsLoadingMakes(false);
    }
  };

  const handleMakeChange = async (value: string) => {
    setSelectedMake(value);
    resetSelections('make');
    setErrorMessage(null);
    onVehicleResolved(null);

    if (!value || !selectedYear) return;

    setIsLoadingModels(true);
    setStatusMessage('Loading models…');
    try {
      const items = await getVehicleModels(selectedYear, value);
      setModelOptions(items);
      setStatusMessage(null);
    } catch (error) {
      console.error('Failed to load models', error);
      setStatusMessage(null);
      setErrorMessage('Unable to load models for that make.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = async (value: string) => {
    setSelectedModel(value);
    resetSelections('model');
    setErrorMessage(null);
    onVehicleResolved(null);

    if (!value || !selectedYear || !selectedMake) return;

    setIsLoadingOptions(true);
    setStatusMessage('Loading trims…');
    try {
      const items = await getVehicleOptions(selectedYear, selectedMake, value);
      setOptionItems(items);
      setStatusMessage(null);
    } catch (error) {
      console.error('Failed to load options', error);
      setStatusMessage(null);
      setErrorMessage('Unable to load trims/options for that model.');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOptionChange = async (value: string) => {
    setSelectedOption(value);
    setErrorMessage(null);

    if (!value) {
      onVehicleResolved(null);
      return;
    }

    setIsFetchingVehicle(true);
    setStatusMessage('Fetching EPA data…');
    try {
      const details = await getVehicleDetails(value);
      const selection = buildSelection(details, kind);
      onVehicleResolved(selection);
      setStatusMessage(null);
    } catch (error) {
      console.error('Vehicle lookup failed', error);
      onVehicleResolved(null);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to fetch EPA data for that option.');
      }
      setStatusMessage(null);
    } finally {
      setIsFetchingVehicle(false);
    }
  };

  const isSelectDisabled = {
    year: isLoadingYears,
    make: !selectedYear || isLoadingMakes,
    model: !selectedMake || isLoadingModels,
    option: !selectedModel || isLoadingOptions || isFetchingVehicle,
  };

  const helperText = (() => {
    if (errorMessage) return errorMessage;
    if (statusMessage) return statusMessage;
    return 'Data provided by FuelEconomy.gov';
  })();

  const helperClass = errorMessage
    ? 'text-red-600'
    : statusMessage
      ? 'text-slate-600'
      : 'text-slate-500';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white/70 p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={`text-xs ${helperClass}`}>{helperText}</p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Year"
            value={selectedYear}
            options={yearOptions}
            placeholder={isLoadingYears ? 'Loading…' : 'Select year'}
            onChange={handleYearChange}
            disabled={isSelectDisabled.year}
          />
          <SelectField
            label="Make"
            value={selectedMake}
            options={makeOptions}
            placeholder={isLoadingMakes ? 'Loading…' : 'Select make'}
            onChange={handleMakeChange}
            disabled={isSelectDisabled.make}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Model"
            value={selectedModel}
            options={modelOptions}
            placeholder={isLoadingModels ? 'Loading…' : 'Select model'}
            onChange={handleModelChange}
            disabled={isSelectDisabled.model}
          />
          <SelectField
            label="Trim / Option"
            value={selectedOption}
            options={optionItems}
            placeholder={isLoadingOptions ? 'Loading…' : 'Select trim'}
            onChange={handleOptionChange}
            disabled={isSelectDisabled.option}
          />
        </div>
      </div>

      {selected && (
        <SelectionSummaryCard
          selection={selected}
          ratingMode={ratingMode}
          availableModes={availableModes}
          onRatingModeChange={onRatingModeChange}
        />
      )}
    </div>
  );
}

function SelectionSummaryCard({
  selection,
  ratingMode,
  availableModes,
  onRatingModeChange,
}: {
  selection: VehicleSelectionSummary;
  ratingMode?: EfficiencyMode;
  availableModes?: EfficiencyMode[];
  onRatingModeChange?: (mode: EfficiencyMode) => void;
}) {
  const preferredMode = ratingMode && isValidEfficiencyValue(selection.efficiencies[ratingMode])
    ? ratingMode
    : MODE_ORDER.find((mode) => isValidEfficiencyValue(selection.efficiencies[mode]));
  const value = preferredMode ? selection.efficiencies[preferredMode] : null;
  const decimals = selection.efficiencyUnit === 'mpg' ? 1 : 2;

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
      <p className="font-semibold leading-tight text-slate-800">{selection.description}</p>
      {value ? (
        <p className="leading-snug text-slate-600">
          {value.toFixed(decimals)} {selection.efficiencyUnit} •{' '}
          {preferredMode ? MODE_LABELS[preferredMode] : 'EPA'} •{' '}
          {selection.fuelType ?? 'Fuel type unknown'}
        </p>
      ) : (
        <p className="leading-snug text-slate-600">
          {selection.fuelType ?? 'Fuel type unknown'}
        </p>
      )}
      <p className="text-xs leading-snug text-slate-500">Source: {selection.source}</p>
      {availableModes && availableModes.length > 0 && onRatingModeChange && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            EPA rating
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {MODE_ORDER.map((mode) => {
              const isEnabled = availableModes.includes(mode);
              const isActive = preferredMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={!isEnabled}
                  onClick={() => isEnabled && onRatingModeChange(mode)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  } ${!isEnabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {MODE_LABELS[mode]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function buildSelection(
  details: FuelEconomyVehicleDetails,
  kind: 'ev' | 'gas'
): VehicleSelectionSummary {
  const descriptionParts = [
    details.year,
    details.make,
    details.model,
  ].filter(Boolean);
  const baseDescription = descriptionParts.join(' ');
  const transmission = details.trany?.trim();
  const description = transmission ? `${baseDescription} (${transmission})` : baseDescription;
  const fuelType = details.fuelType1 ?? details.fuelType ?? details.fuelType2 ?? '';

  const efficiencies: Record<EfficiencyMode, number | null> = {
    combined: null,
    city: null,
    highway: null,
  };

  if (kind === 'ev') {
    const isElectric =
      (fuelType && fuelType.toLowerCase().includes('electric')) ||
      (details.atvType && details.atvType.toLowerCase().includes('ev'));

    efficiencies.combined = normalizeMilesPerKwh(details.combE);
    efficiencies.city = normalizeMilesPerKwh(details.cityE);
    efficiencies.highway = normalizeMilesPerKwh(details.highwayE);

    if (!isElectric || !efficiencies.combined) {
      throw new Error('Selected option is missing EV efficiency data.');
    }

    return {
      id: details.id,
      description: description || 'EV selection',
      year: details.year,
      make: details.make,
      model: details.model,
      transmission,
      fuelType,
      comb08: parseFuelEconomyNumber(details.comb08),
      combE: parseFuelEconomyNumber(details.combE),
      efficiencies,
      efficiencyUnit: 'mi/kWh',
      source: 'FuelEconomy.gov',
    };
  }

  const normalizedFuel = (fuelType || '').toLowerCase();
  const isGasLike = normalizedFuel.includes('gas') || normalizedFuel.includes('diesel');
  efficiencies.combined = normalizeMpg(details.comb08);
  efficiencies.city = normalizeMpg(details.city08);
  efficiencies.highway = normalizeMpg(details.highway08);

  if (!isGasLike || !efficiencies.combined) {
    throw new Error('Selected option is missing gasoline MPG data.');
  }

  return {
    id: details.id,
    description: description || 'Gas selection',
    year: details.year,
    make: details.make,
    model: details.model,
    transmission,
    fuelType,
    comb08: parseFuelEconomyNumber(details.comb08),
    combE: parseFuelEconomyNumber(details.combE),
    efficiencies,
    efficiencyUnit: 'mpg',
    source: 'FuelEconomy.gov',
  };
}

const MODE_ORDER: EfficiencyMode[] = ['combined', 'city', 'highway'];
const MODE_LABELS: Record<EfficiencyMode, string> = {
  combined: 'Combined',
  city: 'City',
  highway: 'Highway',
};

function normalizeMilesPerKwh(value?: string | number | null) {
  const milesPerKwh = convertKwhPer100MilesToMilesPerKwh(value ?? undefined);
  if (!milesPerKwh || !Number.isFinite(milesPerKwh) || milesPerKwh <= 0) {
    return null;
  }
  return Number(milesPerKwh.toFixed(2));
}

function normalizeMpg(value?: string | number | null) {
  const numeric = parseFuelEconomyNumber(value);
  if (!numeric || !Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Number(numeric.toFixed(1));
}

function isValidEfficiencyValue(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: FuelEconomyMenuItem[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={`${label}-${item.value}`} value={item.value}>
            {item.text}
          </option>
        ))}
      </select>
    </div>
  );
}

