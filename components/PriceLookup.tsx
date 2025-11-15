'use client';

import { useState } from 'react';
import {
  fetchGasPricesByZip,
  fetchElectricityRatesByZip,
  validateZipCode,
  reverseGeocode,
} from '@/lib/api-services';
import { CalculatorInputs } from '@/types';

interface PriceLookupProps {
  onUpdate: (updates: Partial<CalculatorInputs>) => void;
}

type LookupStatus = 'idle' | 'loading' | 'success' | 'error';

export default function PriceLookup({ onUpdate }: PriceLookupProps) {
  const [zipCode, setZipCode] = useState('');
  const [includeElectricity, setIncludeElectricity] = useState(true);
  const [includeGas, setIncludeGas] = useState(true);
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [sourceNotes, setSourceNotes] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  const isFetching = status === 'loading';

  const handleLookup = async () => {
    const trimmedZip = zipCode.trim();
    setMessage(null);

    if (!trimmedZip) {
      setStatus('error');
      setMessage('Please enter a ZIP code.');
      return;
    }

    if (!validateZipCode(trimmedZip)) {
      setStatus('error');
      setMessage('Invalid ZIP format. Use 5 digits or 5+4.');
      return;
    }

    if (!includeElectricity && !includeGas) {
      setStatus('error');
      setMessage('Select at least one data type.');
      return;
    }

    setStatus('loading');
    setSourceNotes([]);

    const updates: Partial<CalculatorInputs> = {};
    const sources: string[] = [];

    try {
      if (includeElectricity) {
        const data = await fetchElectricityRatesByZip(trimmedZip);
        if (data) {
          updates.homeElectricityPrice = data.residential;
          sources.push(`Electricity · ${data.source || 'API'}`);
        }
      }

      if (includeGas) {
        const data = await fetchGasPricesByZip(trimmedZip);
        if (data) {
          updates.regularGasPrice = data.regular;
          updates.premiumGasPrice = data.premium;
          sources.push(`Gas · ${data.source || 'API'}`);
        }
      }

      if (Object.keys(updates).length) {
        onUpdate(updates);
        setStatus('success');
        setMessage('Updated from latest data sources.');
        setSourceNotes(sources);
      } else {
        setStatus('error');
        setMessage('No data returned. Try another ZIP or enter manually.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Lookup failed. Please try again or enter manually.');
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation not supported in this browser.');
      return;
    }

    setIsLocating(true);
    setStatus('idle');
    setMessage('Detecting your location…');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const zip = await reverseGeocode(coords.latitude, coords.longitude);
          if (zip) {
            setZipCode(zip);
            setMessage('Location detected. Press look up to fetch prices.');
          } else {
            setStatus('error');
            setMessage('Could not find a ZIP for your location.');
          }
        } catch (error) {
          setStatus('error');
          setMessage('Location lookup failed. Please enter ZIP manually.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setStatus('error');
        setMessage('Location permission denied.');
      }
    );
  };

  const handleReset = () => {
    setZipCode('');
    setStatus('idle');
    setMessage(null);
    setSourceNotes([]);
    setIncludeElectricity(true);
    setIncludeGas(true);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Look up local prices
          </h3>
          <p className="text-sm text-slate-500">
            Pull regional electricity and gas data with one tap.
          </p>
        </div>
        <span className="badge-label">Optional</span>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              ZIP code
            </label>
            <input
              type="text"
              value={zipCode}
              onChange={(event) => setZipCode(event.target.value)}
              placeholder="12345"
              className="mt-2 form-input-shell"
              maxLength={10}
            />
          </div>
          <button
            type="button"
            onClick={handleUseLocation}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLocating}
          >
            {isLocating ? 'Locating…' : 'Use my location'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-white"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeElectricity}
              onChange={(event) => setIncludeElectricity(event.target.checked)}
              className="accent-emerald-500"
            />
            Electricity
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeGas}
              onChange={(event) => setIncludeGas(event.target.checked)}
              className="accent-amber-500"
            />
            Gas
          </label>
        </div>

        <button
          type="button"
          onClick={handleLookup}
          disabled={isFetching}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isFetching && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          Look up prices
        </button>

        {message && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              status === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : status === 'error'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {message}
            {sourceNotes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
                {sourceNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

