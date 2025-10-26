import React, { useState } from 'react';
import { startOfMonthUTC, parseISODateToUTC } from './utils/dateUtils'; // adjust import path as needed

const FilterComponent = () => {
  const [fromParts, setFromParts] = useState({ month: '', day: '', year: '' });
  const [toParts, setToParts] = useState({ month: '', day: '', year: '' });
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date());

  const updateFromPart = (field, value) => {
    setFromParts((prev) => ({ ...prev, [field]: value }));
  };

  const updateToPart = (field, value) => {
    setToParts((prev) => ({ ...prev, [field]: value }));
  };

  const combineDateParts = (parts) => {
    if (!parts.year || !parts.month || !parts.day) return null;
    return `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`;
  };

  const handleApplyFilters = () => {
    const appliedFrom = combineDateParts(fromParts);
    const appliedTo = combineDateParts(toParts);

    if (appliedFrom && appliedTo && appliedTo < appliedFrom) {
      alert("'To' date must be after the 'From' date.");
      return;
    }

    setFromDate(appliedFrom);
    setToDate(appliedTo);
    
    if (appliedFrom) {
      const targetMonth = startOfMonthUTC(parseISODateToUTC(appliedFrom));
      setViewMonth(targetMonth);
    }

    setFromInput(appliedFrom);
    setToInput(appliedTo);
  };

  return (
    <div className="date-filter">
      <div className="date-range-inputs">
        <div className="date-input-group">
          <label>From:</label>
          <input
            id="filter-from-month"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="MM"
            maxLength={2}
            value={fromParts.month}
            onChange={(e) => updateFromPart('month', e.target.value)}
            autoComplete="off"
            aria-label="From month"
          />
          <input
            id="filter-from-day"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="DD"
            maxLength={2}
            value={fromParts.day}
            onChange={(e) => updateFromPart('day', e.target.value)}
            autoComplete="off"
            aria-label="From day"
          />
          <input
            id="filter-from-year"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="YYYY"
            maxLength={4}
            value={fromParts.year}
            onChange={(e) => updateFromPart('year', e.target.value)}
            autoComplete="off"
            aria-label="From year"
          />
        </div>

        <div className="date-input-group">
          <label>To:</label>
          <input
            id="filter-to-month"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="MM"
            maxLength={2}
            value={toParts.month}
            onChange={(e) => updateToPart('month', e.target.value)}
            autoComplete="off"
            aria-label="To month"
          />
          <input
            id="filter-to-day"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="DD"
            maxLength={2}
            value={toParts.day}
            onChange={(e) => updateToPart('day', e.target.value)}
            autoComplete="off"
            aria-label="To day"
          />
          <input
            id="filter-to-year"
            className="schedule-input schedule-input--segment"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="YYYY"
            maxLength={4}
            value={toParts.year}
            onChange={(e) => updateToPart('year', e.target.value)}
            autoComplete="off"
            aria-label="To year"
          />
        </div>
      </div>

      <button 
        className="apply-filter-btn"
        onClick={handleApplyFilters}
      >
        Apply Filters
      </button>
    </div>
  );
};

export default FilterComponent;
