import React from 'react';

const FilterComponent = ({
  fromParts,
  toParts,
  updateFromPart,
  updateToPart,
  handleApplyFilters,
  clearFilters
}) => {
  return (
    <div className="filters" data-auto-root>
      <div className="filter-field">
        <div className="date-inputs">
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
            data-auto-field="filter-from-day"
            aria-label="From day"
          />
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
            data-auto-field="filter-from-month"
            aria-label="From month"
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
            data-auto-field="filter-from-year"
            aria-label="From year"
          />
        </div>
      </div>
      
      <div className="filter-field">
        <label className="filter-label" htmlFor="filter-to-day">
          To
        </label>
        <div className="date-inputs">
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
            data-auto-field="filter-to-day"
            aria-label="To day"
          />
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
            data-auto-field="filter-to-month"
            aria-label="To month"
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
            data-auto-field="filter-to-year"
            aria-label="To year"
          />
        </div>
      </div>
      
      <div className="filter-actions">
        <button type="button" className="btn btn-primary" onClick={handleApplyFilters}>
          Apply
        </button>
        <button type="button" className="btn btn-ghost" onClick={clearFilters}>
          Clear
        </button>
      </div>
    </div>
  );
};

export default FilterComponent;
