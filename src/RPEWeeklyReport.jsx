import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mock data for demonstration
const mockData = (() => {
  const today = new Date();
  const data = [];
  const DAYS_BACK = 90;  // 3 months back
  const DAYS_FORWARD = 90;  // 3 months forward
  
  for (let i = -DAYS_BACK; i <= DAYS_FORWARD; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Base values with weekly patterns
    const baseCourtRPE = 6.5 + Math.sin(i / 7) * 1.5;
    const baseGymRPE = 5.5 + Math.cos(i / 7) * 1.0;
    const baseDuration = 75 + Math.sin(i / 7) * 15;  // 60-90 minutes
    const baseIntensity = 6.0 + Math.cos(i / 7) * 2.0;  // 4-8 scale
    
    const isPast = i < 0;
    
    data.push({
      date: date.toISOString().split('T')[0],
      sessionType: i % 7 === 0 ? 'Game' : 'Practice',
      // Duration (minutes)
      plannedDuration: Math.round(Math.max(45, Math.min(120, baseDuration))),
      actualDuration: isPast ? Math.round(Math.max(45, Math.min(120, baseDuration + (Math.random() - 0.5) * 10))) : null,
      // Intensity (1-10 scale)
      plannedIntensity: Math.max(3, Math.min(9, baseIntensity)),
      actualIntensity: isPast ? Math.max(3, Math.min(9, baseIntensity + (Math.random() - 0.5))) : null,
      // Court RPE
      plannedCourtRPE: Math.max(4, Math.min(9, baseCourtRPE)),
      actualCourtRPE: isPast ? Math.max(4, Math.min(9, baseCourtRPE + (Math.random() - 0.5))) : null,
      // Gym RPE
      plannedGymRPE: Math.max(3, Math.min(8, baseGymRPE)),
      actualGymRPE: isPast ? Math.max(3, Math.min(8, baseGymRPE + (Math.random() - 0.5) * 0.8)) : null
    });
  }
  
  return data;
})();

export default function RPEWeeklyReport() {
  console.log('🎯 RPE Report component loaded!');
  console.log('Mock data:', mockData);

  const [data] = useState(mockData);
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
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Court RPE', 'Gym RPE']],
      body: [
        ['Avg Planned', courtStats.avgPlanned, gymStats.avgPlanned],
        ['Avg Actual', courtStats.avgActual, gymStats.avgActual],
        ['Variance', courtStats.variance, gymStats.variance],
      ],
    });
    
    // Data table
    doc.text('Detailed Data', 14, doc.lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Type', 'Planned Court', 'Actual Court', 'Planned Gym', 'Actual Gym']],
      body: filteredData.map(d => [
        d.date,
        d.sessionType,
        d.plannedCourtRPE?.toFixed(1) || '-',
        d.actualCourtRPE?.toFixed(1) || '-',
        d.plannedGymRPE?.toFixed(1) || '-',
        d.actualGymRPE?.toFixed(1) || '-',
      ]),
    });
    
    doc.save(`rpe-report-${fromDate}-to-${toDate}.pdf`);
  };

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
            <Line type="monotone" dataKey="plannedDuration" stroke="#10b981" strokeDasharray="5 5" name="Planned" />
            <Line type="monotone" dataKey="actualDuration" stroke="#f97316" name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Intensity Chart */}
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
            <Line type="monotone" dataKey="plannedIntensity" stroke="#6366f1" strokeDasharray="5 5" name="Planned" />
            <Line type="monotone" dataKey="actualIntensity" stroke="#e11d48" name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Court RPE Chart */}
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
            <Line type="monotone" dataKey="plannedCourtRPE" stroke="#3b82f6" strokeDasharray="5 5" name="Planned" />
            <Line type="monotone" dataKey="actualCourtRPE" stroke="#ef4444" name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gym RPE Chart */}
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
            <Line type="monotone" dataKey="plannedGymRPE" stroke="#8b5cf6" strokeDasharray="5 5" name="Planned" />
            <Line type="monotone" dataKey="actualGymRPE" stroke="#f59e0b" name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Detailed Data</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
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
            {filteredData.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px' }}>
                  {(() => {
                    const d = new Date(row.date);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  })()}
                </td>
                <td style={{ padding: '12px' }}>{row.sessionType}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.plannedDuration || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.actualDuration || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.plannedIntensity?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.actualIntensity?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.plannedCourtRPE?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.actualCourtRPE?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.plannedGymRPE?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.actualGymRPE?.toFixed(1) || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}