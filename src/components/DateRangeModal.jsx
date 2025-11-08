// src/components/DateRangeModal.jsx
import React, { useState, useEffect } from 'react';

/**
 * Date Range Selection Modal
 * Allows users to select a date range before exporting
 */
const DateRangeModal = ({
  isOpen,
  onClose,
  onConfirm,
  defaultStartDate,
  defaultEndDate,
  sessionCount = 0,
  onDatesChange
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Format Date object to YYYY-MM-DD for input
  const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse YYYY-MM-DD to UTC Date
  const parseDateFromInput = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  // Initialize dates when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate(formatDateForInput(defaultStartDate));
      setEndDate(formatDateForInput(defaultEndDate));
      setError('');
    }
  }, [isOpen, defaultStartDate, defaultEndDate]);

  // Notify parent when dates change (for session count calculation)
  useEffect(() => {
    if (startDate && endDate && onDatesChange) {
      const start = parseDateFromInput(startDate);
      const end = parseDateFromInput(endDate);
      if (start && end && start <= end) {
        onDatesChange({ startDate: start, endDate: end });
      }
    }
  }, [startDate, endDate, onDatesChange]);

  const handleQuickPreset = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start, end;

    switch (preset) {
      case 'current':
        // Current month
        start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      case 'next':
        // Next month
        start = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
        end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 2, 0));
        break;
      default:
        return;
    }

    setStartDate(formatDateForInput(start));
    setEndDate(formatDateForInput(end));
    setError('');
  };

  const handleConfirm = () => {
    // Validate dates
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = parseDateFromInput(startDate);
    const end = parseDateFromInput(endDate);

    if (!start || !end) {
      setError('Invalid date format');
      return;
    }

    if (start > end) {
      setError('End date must be after start date');
      return;
    }

    // Call the confirm handler with parsed dates
    onConfirm({ startDate: start, endDate: end });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#111827'
          }}
        >
          Export Date Range
        </h2>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '20px'
          }}
        >
          Select the date range for your schedule export
        </p>

        {/* Quick Presets */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}
          >
            Quick Presets
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickPreset('current')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('next')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
            >
              Next Month
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="start-date"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}
            >
              From Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}
            >
              To Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Session Count Preview */}
        {sessionCount > 0 && !error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                color: '#1e40af',
                fontWeight: '500'
              }}
            >
              {sessionCount} session{sessionCount !== 1 ? 's' : ''} will be included in the export
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                color: '#991b1b',
                fontWeight: '500'
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              color: 'white',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;
