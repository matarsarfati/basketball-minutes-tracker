import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { scheduleService } from './services/scheduleService';
import { practiceDataService } from './services/practiceDataService';

// Helper function to calculate average RPE from survey responses
const calculateAverageRPE = (surveyResponses) => {
  if (!surveyResponses || typeof surveyResponses !== 'object') {
    return null;
  }

  const rpeValues = Object.values(surveyResponses)
    .filter(response => response && typeof response.rpe === 'number')
    .map(response => response.rpe);

  if (rpeValues.length === 0) {
    return null;
  }

  const sum = rpeValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / rpeValues.length) * 10) / 10;
};

export default function RPEWeeklyReport() {
  console.log('🎯 RPE Report component loaded!');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    return from.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    const to = new Date(today);
    to.setDate(today.getDate() + 7);
    return to.toISOString().split('T')[0];
  });

  // Filter controls state
  const [visibleMetrics, setVisibleMetrics] = useState({
    duration: true,
    intensity: true,
    courtRPE: true,
    gymRPE: true
  });

  const [showPlanned, setShowPlanned] = useState(true);
  const [showActual, setShowActual] = useState(true);

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching RPE data from Firebase...');

        // Get all schedule events
        const sessions = await scheduleService.getScheduleEvents();
        console.log('Loaded sessions:', sessions.length);

        // Sort sessions by date and slot
        sessions.sort((a, b) => {
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          // Sort by slot: AM before PM
          const slotA = a.slot || 'AM';
          const slotB = b.slot || 'AM';
          return slotA.localeCompare(slotB);
        });

        // Count sessions per date to identify double practice days
        const sessionCountByDate = new Map();
        sessions.forEach(session => {
          const count = sessionCountByDate.get(session.date) || 0;
          sessionCountByDate.set(session.date, count + 1);
        });

        // Build session data array - keep each session separate
        const sessionDataArray = await Promise.all(
          sessions.map(async (session) => {
            // Get actual RPE data directly from practiceDataService
            let courtSurvey = null;
            let gymSurvey = null;

            try {
              courtSurvey = await practiceDataService.getSurveyData(session.id);
            } catch (error) {
              console.warn(`Failed to fetch court survey for ${session.id}:`, error);
            }

            try {
              gymSurvey = await practiceDataService.getGymSurveyData(session.id);
            } catch (error) {
              console.warn(`Failed to fetch gym survey for ${session.id}:`, error);
            }

            // Handle Day Off - set all metrics to 0
            const isDayOff = session.type === 'DayOff';

            // Check if this date has multiple sessions
            const hasMultipleSessions = sessionCountByDate.get(session.date) > 1;
            const slot = session.slot || 'AM';

            // For Gym RPE: only show in PM session if multiple sessions per day
            const showGymRPE = !hasMultipleSessions || slot === 'PM';

            // Calculate averages, use 0 instead of null for graph continuity
            const courtRPE = calculateAverageRPE(courtSurvey) || 0;
            const gymRPE = calculateAverageRPE(gymSurvey) || 0;

            return {
              sessionId: session.id,
              date: session.date,
              sessionType: session.type || 'Practice',
              slot: slot,
              hasMultipleSessions: hasMultipleSessions,
              // For graph x-axis: use date + slot for unique identification
              dateSlot: `${session.date}-${slot}`,
              // Duration - use 0 instead of null for continuity
              plannedDuration: isDayOff ? 0 : (Number(session.totalMinutes) || 0),
              actualDuration: 0, // Not tracked in current system
              // Intensity - use 0 instead of null
              plannedIntensity: isDayOff ? 0 : (Number(session.highIntensityMinutes) || 0),
              actualIntensity: 0, // Not tracked in current system
              // Court RPE - use 0 instead of null
              plannedCourtRPE: isDayOff ? 0 : (Number(session.rpeCourtPlanned) || 0),
              actualCourtRPE: courtRPE,
              // Gym RPE - show only in PM session for double days, use 0 instead of null
              plannedGymRPE: isDayOff ? 0 : (showGymRPE ? (Number(session.rpeGymPlanned) || 0) : 0),
              actualGymRPE: showGymRPE ? gymRPE : 0
            };
          })
        );

        console.log('Session data loaded:', sessionDataArray.length, 'sessions');
        console.log('Multi-session days:', Array.from(sessionCountByDate.entries()).filter(([_, count]) => count > 1).length);
        setData(sessionDataArray);
      } catch (error) {
        console.error('Failed to load RPE data:', error);
        alert('Failed to load data from Firebase. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data by date range
  const filteredData = data.filter(item => {
    return item.date >= fromDate && item.date <= toDate;
  });

  const resetToDefault = () => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    const to = new Date(today);
    to.setDate(today.getDate() + 7);
    
    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
  };

  // Calculate statistics
  const calculateStats = (type) => {
    const planned = filteredData.map(d => d[`planned${type}RPE`]).filter(v => v);
    const actual = filteredData.map(d => d[`actual${type}RPE`]).filter(v => v);
    
    const avgPlanned = planned.length ? (planned.reduce((a,b) => a + b, 0) / planned.length).toFixed(1) : 0;
    const avgActual = actual.length ? (actual.reduce((a,b) => a + b, 0) / actual.length).toFixed(1) : 0;
    const variance = (avgActual - avgPlanned).toFixed(1);
    
    return { avgPlanned, avgActual, variance };
  };

  const courtStats = calculateStats('Court');
  const gymStats = calculateStats('Gym');

  const durationStats = {
    avgPlanned: filteredData.filter(d => d.plannedDuration).length ? 
      Math.round(filteredData.reduce((sum, d) => sum + (d.plannedDuration || 0), 0) / filteredData.filter(d => d.plannedDuration).length) : 0,
    avgActual: filteredData.filter(d => d.actualDuration).length ? 
      Math.round(filteredData.reduce((sum, d) => sum + (d.actualDuration || 0), 0) / filteredData.filter(d => d.actualDuration).length) : 0
  };
  durationStats.variance = durationStats.avgActual - durationStats.avgPlanned;

  const intensityStats = calculateStats('Intensity');

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('RPE Weekly Report', 14, 20);

    // Date range
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 30);

    // Summary stats
    doc.setFontSize(12);
    doc.text('Summary Statistics', 14, 45);

    const summaryRows = [];
    if (visibleMetrics.courtRPE) {
      summaryRows.push(['Court RPE - Avg Planned', courtStats.avgPlanned]);
      summaryRows.push(['Court RPE - Avg Actual', courtStats.avgActual]);
      summaryRows.push(['Court RPE - Variance', courtStats.variance]);
    }
    if (visibleMetrics.gymRPE) {
      summaryRows.push(['Gym RPE - Avg Planned', gymStats.avgPlanned]);
      summaryRows.push(['Gym RPE - Avg Actual', gymStats.avgActual]);
      summaryRows.push(['Gym RPE - Variance', gymStats.variance]);
    }
    if (visibleMetrics.duration) {
      summaryRows.push(['Duration - Avg Planned', `${durationStats.avgPlanned} min`]);
      summaryRows.push(['Duration - Avg Actual', `${durationStats.avgActual} min`]);
      summaryRows.push(['Duration - Variance', `${durationStats.variance} min`]);
    }
    if (visibleMetrics.intensity) {
      summaryRows.push(['Intensity - Avg Planned', intensityStats.avgPlanned]);
      summaryRows.push(['Intensity - Avg Actual', intensityStats.avgActual]);
      summaryRows.push(['Intensity - Variance', intensityStats.variance]);
    }

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryRows,
    });

    // Data table
    doc.text('Detailed Data', 14, doc.lastAutoTable.finalY + 15);

    const formatValue = (val) => {
      if (val === 0) return '0';
      if (!val) return '-';
      return typeof val === 'number' ? val.toFixed(1) : val;
    };

    const tableHeaders = ['Multi', 'Date', 'Type', 'Slot']; // Added Multi column and Slot column
    const tableRows = filteredData.map(d => {
      const row = [
        d.hasMultipleSessions ? '{' : '', // Bracket indicator
        d.date,
        d.sessionType,
        d.slot
      ];

      if (visibleMetrics.duration) {
        if (showPlanned) row.push(formatValue(d.plannedDuration));
        if (showActual) row.push(formatValue(d.actualDuration));
      }
      if (visibleMetrics.intensity) {
        if (showPlanned) row.push(formatValue(d.plannedIntensity));
        if (showActual) row.push(formatValue(d.actualIntensity));
      }
      if (visibleMetrics.courtRPE) {
        if (showPlanned) row.push(formatValue(d.plannedCourtRPE));
        if (showActual) row.push(formatValue(d.actualCourtRPE));
      }
      if (visibleMetrics.gymRPE) {
        if (showPlanned) row.push(formatValue(d.plannedGymRPE));
        if (showActual) row.push(formatValue(d.actualGymRPE));
      }

      return row;
    });

    if (visibleMetrics.duration) {
      if (showPlanned) tableHeaders.push('Plan Dur');
      if (showActual) tableHeaders.push('Act Dur');
    }
    if (visibleMetrics.intensity) {
      if (showPlanned) tableHeaders.push('Plan Int');
      if (showActual) tableHeaders.push('Act Int');
    }
    if (visibleMetrics.courtRPE) {
      if (showPlanned) tableHeaders.push('Plan Court');
      if (showActual) tableHeaders.push('Act Court');
    }
    if (visibleMetrics.gymRPE) {
      if (showPlanned) tableHeaders.push('Plan Gym');
      if (showActual) tableHeaders.push('Act Gym');
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [tableHeaders],
      body: tableRows,
    });

    doc.save(`rpe-report-${fromDate}-to-${toDate}.pdf`);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', paddingTop: '48px' }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading RPE data from Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/schedule"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            marginBottom: '16px'
          }}
        >
          ← Back to Schedule
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          📊 RPE Weekly Report
        </h1>
      </div>

      {/* Date Range & Export */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>
        <button
          onClick={exportToPDF}
          style={{
            marginTop: '20px',
            padding: '8px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          📄 Export to PDF
        </button>
        <button
          onClick={resetToDefault}
          style={{
            marginTop: '20px',
            padding: '8px 24px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            marginLeft: '8px'
          }}
        >
          Reset to Default (±7 days)
        </button>
      </div>

      {/* Filter Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>📊 Display Filters</h3>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Metrics Selection */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Metrics to Display:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.duration}
                  onChange={(e) => setVisibleMetrics(prev => ({ ...prev, duration: e.target.checked }))}
                />
                <span style={{ fontSize: '14px' }}>Duration</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.intensity}
                  onChange={(e) => setVisibleMetrics(prev => ({ ...prev, intensity: e.target.checked }))}
                />
                <span style={{ fontSize: '14px' }}>Intensity</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.courtRPE}
                  onChange={(e) => setVisibleMetrics(prev => ({ ...prev, courtRPE: e.target.checked }))}
                />
                <span style={{ fontSize: '14px' }}>Court RPE</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.gymRPE}
                  onChange={(e) => setVisibleMetrics(prev => ({ ...prev, gymRPE: e.target.checked }))}
                />
                <span style={{ fontSize: '14px' }}>Gym RPE</span>
              </label>
            </div>
          </div>

          {/* Data Type Selection */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Data Types:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showPlanned}
                  onChange={(e) => setShowPlanned(e.target.checked)}
                />
                <span style={{ fontSize: '14px' }}>Planned Data</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showActual}
                  onChange={(e) => setShowActual(e.target.checked)}
                />
                <span style={{ fontSize: '14px' }}>Actual Data</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Planned Court RPE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{courtStats.avgPlanned}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Actual Court RPE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{courtStats.avgActual}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Court Variance</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: courtStats.variance > 0 ? '#ef4444' : '#10b981' }}>
            {courtStats.variance > 0 ? '+' : ''}{courtStats.variance}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Planned Gym RPE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{gymStats.avgPlanned}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Actual Gym RPE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{gymStats.avgActual}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Gym Variance</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: gymStats.variance > 0 ? '#ef4444' : '#10b981' }}>
            {gymStats.variance > 0 ? '+' : ''}{gymStats.variance}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Planned Duration</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{durationStats.avgPlanned} min</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Actual Duration</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{durationStats.avgActual} min</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Duration Variance</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: durationStats.variance > 0 ? '#ef4444' : '#10b981' }}>
            {durationStats.variance > 0 ? '+' : ''}{durationStats.variance}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Planned Intensity</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{intensityStats.avgPlanned}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Actual Intensity</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{intensityStats.avgActual}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Intensity Variance</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: intensityStats.variance > 0 ? '#ef4444' : '#10b981' }}>
            {intensityStats.variance > 0 ? '+' : ''}{intensityStats.variance}
          </p>
        </div>
      </div>

      {/* Charts */}
      {/* Duration Chart */}
      {visibleMetrics.duration && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Duration Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 150]} />
              <Tooltip
                labelFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <Legend />
              {showPlanned && <Line type="monotone" dataKey="plannedDuration" stroke="#10b981" strokeDasharray="5 5" name="Planned" />}
              {showActual && <Line type="monotone" dataKey="actualDuration" stroke="#f97316" name="Actual" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Intensity Chart */}
      {visibleMetrics.intensity && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Intensity Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip
                labelFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <Legend />
              {showPlanned && <Line type="monotone" dataKey="plannedIntensity" stroke="#6366f1" strokeDasharray="5 5" name="Planned" />}
              {showActual && <Line type="monotone" dataKey="actualIntensity" stroke="#e11d48" name="Actual" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Court RPE Chart */}
      {visibleMetrics.courtRPE && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Court RPE Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip
                labelFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <Legend />
              {showPlanned && <Line type="monotone" dataKey="plannedCourtRPE" stroke="#3b82f6" strokeDasharray="5 5" name="Planned" />}
              {showActual && <Line type="monotone" dataKey="actualCourtRPE" stroke="#ef4444" name="Actual" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gym RPE Chart */}
      {visibleMetrics.gymRPE && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Gym RPE Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip
                labelFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <Legend />
              {showPlanned && <Line type="monotone" dataKey="plannedGymRPE" stroke="#8b5cf6" strokeDasharray="5 5" name="Planned" />}
              {showActual && <Line type="monotone" dataKey="actualGymRPE" stroke="#f59e0b" name="Actual" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Table */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Detailed Data</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px 4px', textAlign: 'center', width: '40px' }}>Multi</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Slot</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Plan Dur</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Act Dur</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Plan Int</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Act Int</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Plan Court</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Act Court</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Plan Gym</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Act Gym</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const formatValue = (val) => {
                if (val === 0) return '0';
                if (!val) return '-';
                return typeof val === 'number' ? val.toFixed(1) : val;
              };

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{
                    padding: '12px 4px',
                    textAlign: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#6b7280',
                    width: '40px'
                  }}>
                    {row.hasMultipleSessions ? '{' : ''}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {(() => {
                      const d = new Date(row.date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    })()}
                  </td>
                  <td style={{ padding: '12px' }}>{row.sessionType}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{row.slot}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.plannedDuration)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.actualDuration)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.plannedIntensity)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.actualIntensity)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.plannedCourtRPE)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.actualCourtRPE)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.plannedGymRPE)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{formatValue(row.actualGymRPE)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}