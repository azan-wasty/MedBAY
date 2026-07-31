'use client';

import React, { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type DatePresetValue =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

export interface DateFilterState {
  preset: DatePresetValue;
  dateFrom: string;
  dateTo: string;
}

const PRESETS: { value: DatePresetValue; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function DateFilterBar({
  value,
  onChange,
  activeRangeLabel,
}: {
  value: DateFilterState;
  onChange: (val: DateFilterState) => void;
  activeRangeLabel?: string;
}) {
  const [customFrom, setCustomFrom] = useState(value.dateFrom || '');
  const [customTo, setCustomTo] = useState(value.dateTo || '');

  const handlePresetSelect = (preset: DatePresetValue) => {
    if (preset === 'custom') {
      onChange({ preset: 'custom', dateFrom: customFrom, dateTo: customTo });
    } else {
      onChange({ preset, dateFrom: '', dateTo: '' });
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFrom && customTo) {
      onChange({ preset: 'custom', dateFrom: customFrom, dateTo: customTo });
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-ink-100 bg-white p-4 shadow-soft-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-ink-900">Analytics Timeframe Filter</div>
            {activeRangeLabel && (
              <div className="text-[11.5px] font-medium text-brand-700">
                Active Period: {activeRangeLabel}
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePresetSelect(p.value)}
              className={
                value.preset === p.value
                  ? 'rounded-full bg-brand-700 px-3.5 py-1 text-[12px] font-semibold text-white transition-colors'
                  : 'rounded-full border border-ink-200 bg-white px-3.5 py-1 text-[12px] font-medium text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50'
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {value.preset === 'custom' && (
        <form onSubmit={handleApplyCustom} className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-ink-600">From:</label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs w-[140px]"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-ink-600">To:</label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs w-[140px]"
              required
            />
          </div>
          <Button type="submit" variant="brand" size="sm" className="h-8 text-xs px-3">
            <Filter className="mr-1 h-3 w-3" /> Apply Filter
          </Button>
        </form>
      )}
    </div>
  );
}
