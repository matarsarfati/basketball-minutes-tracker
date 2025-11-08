import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Set the fonts
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

const loadFontAsBase64 = async (fontPath) => {
  try {
    const response = await fetch(fontPath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load font:', error);
    return null;
  }
};

const initializeFonts = async () => {
  const heeboRegular = await loadFontAsBase64('/fonts/Heebo-Regular.ttf');
  const heeboBold = await loadFontAsBase64('/fonts/Heebo-Bold.ttf');
  
  if (heeboRegular && heeboBold) {
    pdfMake.vfs['Heebo-Regular.ttf'] = heeboRegular.split(',')[1];
    pdfMake.vfs['Heebo-Bold.ttf'] = heeboBold.split(',')[1];
    
    pdfMake.fonts = {
      Heebo: {
        normal: 'Heebo-Regular.ttf',
        bold: 'Heebo-Bold.ttf',
        italics: 'Heebo-Regular.ttf',
        bolditalics: 'Heebo-Bold.ttf'
      },
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
  }
};

const formatSessionTime = (session) => {
  const time = session?.startTime || session?.time;
  if (!time) return "—";
  if (typeof time === 'string' && time.includes(':')) return time;
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return time;
  }
};

const getTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sanitizeFileNamePart = value =>
  (value || "")
    .toString()
    .trim()
    .replace(/[^0-9a-zA-Z_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const generatePrePracticePDF = async ({
  session,
  metrics,
  drillRows,
  attendance,
  wellnessData,
  roster
}) => {
  await initializeFonts();
  
  const docDefinition = {
    content: [
      // Header
      { 
        text: 'Pre-Practice Report', 
        style: 'header',
        color: '#1d4ed8'
      },

      // Session Info
      {
        margin: [0, 20, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: `Date: ${session?.date || '—'}` },
              { text: `Time: ${formatSessionTime(session)}` },
              { text: `Type: ${session?.type || 'Practice'}` }
            ]
          }
        ]
      },

      // Planned Metrics
      {
        margin: [0, 20, 0, 0],
        stack: [
          { text: 'Planned Practice Metrics', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*'],
              body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ['Total Time (min)', metrics?.planned?.totalTime?.toString() || '—'],
                ['High Intensity (min)', metrics?.planned?.highIntensity?.toString() || '—'],
                ['Courts Used', metrics?.planned?.courtsUsed?.toString() || '—']
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ]
      },

      // Team Wellness Summary
      {
        margin: [0, 20, 0, 0],
        stack: [
          { text: 'Team Wellness Summary', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'Metric', style: 'tableHeader' },
                  { text: 'Average', style: 'tableHeader' },
                  { text: 'Status', style: 'tableHeader' }
                ],
                [
                  'Sleep',
                  wellnessData.averages?.sleep?.toFixed(1) || '—',
                  getWellnessStatus('sleep', wellnessData.averages?.sleep)
                ],
                [
                  'Fatigue',
                  wellnessData.averages?.fatigue?.toFixed(1) || '—',
                  getWellnessStatus('fatigue', wellnessData.averages?.fatigue)
                ],
                [
                  'Soreness',
                  wellnessData.averages?.soreness?.toFixed(1) || '—',
                  getWellnessStatus('soreness', wellnessData.averages?.soreness)
                ]
              ]
            },
            layout: {
              fillColor: (i, node) => i === 0 ? '#1d4ed8' : null
            }
          }
        ]
      },

      // Player Wellness Details
      wellnessData?.responses && Object.keys(wellnessData.responses).length > 0 ? {
        margin: [0, 20, 0, 0],
        stack: [
          { text: 'Player Wellness Status', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', '*'],
              body: [
                [
                  { text: 'Player', style: 'tableHeader' },
                  { text: 'Sleep', style: 'tableHeader' },
                  { text: 'Fatigue', style: 'tableHeader' },
                  { text: 'Soreness', style: 'tableHeader' },
                  { text: 'Notes', style: 'tableHeader', alignment: 'right' }
                ],
                ...Object.entries(wellnessData.responses).map(([name, data]) => [
                  name,
                  data.sleep?.toString() || '—',
                  data.fatigue?.toString() || '—',
                  data.soreness?.toString() || '—',
                  { text: data.physioNotes || data.notes || '—', alignment: 'right', preserveLeadingSpaces: true }
                ])
              ]
            }
          }
        ]
      } : []
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5]
      },
      tableHeader: {
        bold: true,
        color: 'white',
        fillColor: '#1d4ed8'
      }
    },
    defaultStyle: {
      font: 'Heebo'
    }
  };

  const fileName = `pre_practice_${sanitizeFileNamePart(session?.date) || sanitizeFileNamePart(getTodayISO())}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
};

export const generatePracticePDF = async ({
  session,
  summaries,
  survey,
  surveyRecords,
  averages,
  attendance,
  drillRows,
  practiceMetrics,
  gymSurveyData,
  gymSurveyAverages
}) => {
  await initializeFonts();
  
  const docDefinition = {
    content: [
      // Header
      { text: 'Practice Report', style: 'header' },

      // Session Info
      {
        margin: [0, 20, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: `Date: ${session?.date || '—'}` },
              { text: `Time: ${formatSessionTime(session)}` },
              { text: `Type: ${session?.type || 'Practice' }` },
              session?.title ? { text: `Title: ${session.title}` } : []
            ]
          }
        ]
      },

      // Practice Metrics
      {
        margin: [0, 20, 0, 0],
        stack: [
          { text: 'Practice Metrics', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*', '*', '*'],
              body: [
                [
                  { text: 'Metric', style: 'tableHeader' },
                  { text: 'Total Time', style: 'tableHeader' },
                  { text: 'High Intensity', style: 'tableHeader' },
                  { text: 'Courts Used', style: 'tableHeader' },
                  { text: 'Court RPE', style: 'tableHeader' },
                  { text: 'Gym RPE', style: 'tableHeader' }
                ],
                [
                  'Planned',
                  practiceMetrics?.planned?.totalTime || '—',
                  practiceMetrics?.planned?.highIntensity || '—',
                  practiceMetrics?.planned?.courtsUsed || '0',
                  practiceMetrics?.planned?.rpeCourt || '—',
                  practiceMetrics?.planned?.rpeGym || '—'
                ],
                [
                  'Actual',
                  practiceMetrics?.actual?.totalTime || '—',
                  practiceMetrics?.actual?.highIntensity || '—',
                  practiceMetrics?.actual?.courtsUsed || '0',
                  practiceMetrics?.actual?.rpeCourt || '—',
                  practiceMetrics?.actual?.rpeGym || '—'
                ]
              ]
            }
          }
        ]
      },

      // Drill Details
      {
        margin: [0, 20, 0, 0],
        stack: [
          { text: 'Drill Details', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Drill Name', style: 'tableHeader' },
                  { text: 'Total Time', style: 'tableHeader' },
                  { text: 'High Intensity', style: 'tableHeader' },
                  { text: 'Courts', style: 'tableHeader' }
                ],
                ...drillRows.map(row => [
                  row.name || 'Untitled',
                  row.totalTime?.toString() || '—',
                  row.highIntensity?.toString() || '—',
                  row.courts?.toString() || '—'
                ])
              ]
            }
          }
        ]
      },

      // Survey Results 
      buildSurveySection(surveyRecords, averages, gymSurveyData, gymSurveyAverages)
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5]
      },
      tableHeader: {
        bold: true,
        color: 'white',
        fillColor: '#1d4ed8'
      }
    },
    defaultStyle: {
      font: 'Heebo'
    }
  };

  const fileName = `practice_${sanitizeFileNamePart(session?.date) || sanitizeFileNamePart(getTodayISO())}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
};

// Helper functions
const getWellnessStatus = (metric, value) => {
  if (!value || value === '—') return '—';

  switch (metric) {
    case 'sleep':
      if (value >= 7) return '✓ Good';
      if (value >= 5) return '⚠️ Moderate';
      return '❌ Poor';

    case 'fatigue':
    case 'soreness':
      if (value <= 4) return '✓ Good';
      if (value <= 6) return '⚠️ Moderate';
      return '❌ Poor';

    default:
      return '—';
  }
};

const buildSurveySection = (surveyRecords, averages, gymSurveyData, gymSurveyAverages) => {
  if (!surveyRecords || Object.keys(surveyRecords).length === 0) return [];

  return {
    margin: [0, 20, 0, 0],
    stack: [
      { text: 'Player Feedback Survey', style: 'subheader' },
      {
        text: `Averages: RPE ${averages?.rpe?.toFixed(1) || '—'} • ` +
              `Legs ${averages?.legs?.toFixed(1) || '—'} • ` +
              `Gym RPE ${gymSurveyAverages?.rpe?.toFixed(1) || '—'}`,
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', '*'],
          body: [
            [
              { text: 'Player', style: 'tableHeader' },
              { text: 'RPE', style: 'tableHeader' },
              { text: 'Legs', style: 'tableHeader' },
              { text: 'Gym RPE', style: 'tableHeader' },
              { text: 'Notes', style: 'tableHeader', alignment: 'right' }
            ],
            ...Object.entries(surveyRecords).map(([name, data]) => [
              name,
              data.rpe?.toString() || '—',
              data.legs?.toString() || '—',
              gymSurveyData?.[name]?.rpe?.toString() || '—',
              { text: data.notes || '—', alignment: 'right', preserveLeadingSpaces: true }
            ])
          ]
        }
      }
    ]
  };
};
