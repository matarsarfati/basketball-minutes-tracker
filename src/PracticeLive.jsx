/* eslint no-use-before-define: ["error", { "functions": true, "classes": true, "variables": true }] */
// src/PracticeLive.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import './styles.css';
import { rosterService } from './services/rosterService';
import { practiceDataService } from './services/practiceDataService';
import { wellnessService } from './services/wellnessService';

const safeParse = (key, defaultValue) => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

const TYPE_COLORS = {
  Practice: { color: "#f59e0b", background: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.35)" },
  Game: { color: "#dc2626", background: "rgba(220,38,38,.12)", border: "rgba(220,38,38,.35)" },
  DayOff: { color: "#ef4444", background: "rgba(239,68,68,.10)", border: "rgba(239,68,68,.30)" },
  SplitPractice: { color: "#f59e0b", background: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.30)" },
  Meeting: { color: "#3b82f6", background: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.35)" },
  Recovery: { color: "#10b981", background: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.35)" },
  Travel: { color: "#8b5cf6", background: "rgba(139,92,246,.12)", border: "rgba(139,92,246,.35)" },
  Default: { color: "#6b7280", background: "rgba(107,114,128,.10)", border: "rgba(107,114,128,.30)" },
};

const ROSTER_KEY = "teamRosterV1";
const paletteFor = type => TYPE_COLORS[type] || TYPE_COLORS.Default;

const SURVEY_STORE_KEY = "practiceSurveysV1";

const getSurveyStore = () => {
  const parsed = safeParse(SURVEY_STORE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
};

const calcAverages = records => {
  if (!records || records.length === 0) {
    return { avgRpe: null, avgLegs: null };
  }
  const totals = records.reduce(
    (acc, entry) => {
      acc.rpe += Number(entry?.rpe || 0);
      acc.legs += Number(entry?.legs || 0);
      return acc;
    },
    { rpe: 0, legs: 0 }
  );
  return {
    avgRpe: Number((totals.rpe / records.length).toFixed(1)),
    avgLegs: Number((totals.legs / records.length).toFixed(1)),
  };
};

const getRosterNames = () => {
  const raw = safeParse(ROSTER_KEY, []);
  return Array.isArray(raw)
    ? raw
        .map(player =>
          typeof player === "string" ? player : player?.name || ""
        )
        .filter(Boolean)
    : [];
};
  
const STORAGE_KEY_V2 = "teamScheduleV2";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loadSessions = () => {
  const parsed = safeParse(STORAGE_KEY_V2, []);
  return Array.isArray(parsed) ? parsed : [];
};
  
  const calcSurveyAverages = players => {
    if (!players || players.length === 0) {
      return { rpe: 0, legs: 0 };
    }
    const totals = players.reduce(
      (acc, player) => {
        acc.rpe += Number(player.rpe || 0);
        acc.legs += Number(player.legs || 0);
        return acc;
      },
      { rpe: 0, legs: 0 }
    );
    return {
      rpe: Number((totals.rpe / players.length).toFixed(2)),
      legs: Number((totals.legs / players.length).toFixed(2)),
    };
  };
  
  const formatSeconds = sec => {
    const total = Math.max(0, Math.floor(sec || 0));
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (total % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };
  
  const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  
const safeUUID = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getTimeParts = timestamp => {
  if (!timestamp) return { hour: "00", minute: "00" };
  const date = new Date(timestamp);
  return {
    hour: String(date.getHours()).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
  };
};

const sanitizeTimeInput = value => value.replace(/\D/g, "").slice(0, 2);

const normalizeTimePart = (value, max) => {
  if (value === "") return "00";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "00";
  const clamped = Math.max(0, Math.min(max, numeric));
  return String(clamped).padStart(2, "0");
};

const buildTimestampWithTime = (reference, hourStr, minuteStr) => {
  const base = new Date(reference || Date.now());
  const hour = Math.max(0, Math.min(23, Number(hourStr) || 0));
  const minute = Math.max(0, Math.min(59, Number(minuteStr) || 0));
  base.setHours(hour, minute, 0, 0);
  return base.getTime();
};

const getDrillDisplaySeconds = (drill, key) => {
  const baseSeconds = key === "total" ? drill.totalSec || 0 : drill.usefulSec || 0;
  const resumedMs =
    key === "total" ? drill.resumedFromMs || 0 : drill.resumedFromUsefulMs || 0;
  return baseSeconds + Math.floor(resumedMs / 1000);
};

const NOTE_TRUNCATE_LIMIT = 120;

const formatMsDuration = ms => {
  if (!Number.isFinite(ms)) return "00:00";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const formatTimestampToHM = timestamp => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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

const truncateNote = note => {
  if (!note) return "";
  const trimmed = note.trim();
  if (trimmed.length <= NOTE_TRUNCATE_LIMIT) return trimmed;
  return `${trimmed.slice(0, NOTE_TRUNCATE_LIMIT - 1)}…`;
};

const summarizeSessionTotals = summaries =>
  summaries.reduce(
    (acc, summary) => {
      const total = Number(summary?.totalMs || 0);
      const useful = Number(summary?.usefulMs || 0);
      acc.totalMs += total;
      acc.usefulMs += useful;
      if (summary?.kind !== "break") {
        acc.totalCourts += Number(summary?.courts || 0);
      }
      return acc;
    },
    { totalMs: 0, usefulMs: 0, totalCourts: 0 }
  );

const buildSurveyRows = (survey, surveyRecords) => {
  const rows = [];
  const highlightIndices = new Set();
  const seen = new Set();
  const players = Array.isArray(survey?.players) ? survey.players : [];

  players.forEach(player => {
    const name = player.name || (player.id != null ? `Player ${player.id}` : "");
    const record = surveyRecords?.[name] || null;
    const rpeValue = Number(player.rpe ?? record?.rpe ?? 0) || 0;
    const legsValue = Number(player.legs ?? record?.legs ?? 0) || 0;
    const note = record?.note || record?.notes || player.note || "";
    const rowIndex = rows.length;
    rows.push([
      name,
      rpeValue ? rpeValue.toString() : "",
      legsValue ? legsValue.toString() : "",
      truncateNote(note),
    ]);
    if (rpeValue >= 7 || legsValue >= 7) {
      highlightIndices.add(rowIndex);
    }
    if (name) {
      seen.add(name.toLowerCase());
    }
  });

  if (surveyRecords) {
    Object.entries(surveyRecords).forEach(([name, record]) => {
      const key = name ? name.toLowerCase() : "";
      if (key && seen.has(key)) return;
      const rpeValue = Number(record?.rpe ?? 0) || 0;
      const legsValue = Number(record?.legs ?? 0) || 0;
      const note = record?.note || record?.notes || "";
      const rowIndex = rows.length;
      rows.push([
        name,
        rpeValue ? rpeValue.toString() : "",
        legsValue ? legsValue.toString() : "",
        truncateNote(note),
      ]);
      if (rpeValue >= 7 || legsValue >= 7) {
        highlightIndices.add(rowIndex);
      }
    });
  }

  return { rows, highlightIndices };
};

const sanitizeFileNamePart = value =>
  (value || "")
    .toString()
    .trim()
    .replace(/[^0-9a-zA-Z_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const validatePrePracticeData = (data) => {
  if (!data.session) {
    throw new Error('Session data is required');
  }
  if (!data.metrics?.planned) {
    throw new Error('Practice metrics (planned) are required');
  }
  if (!Array.isArray(data.roster) || data.roster.length === 0) {
    throw new Error('Invalid roster');
  }
};

const buildPracticePdf = ({
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
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  let currentY = 20;

  // 1. Header (enhanced)
  doc.setFontSize(18);
  doc.text("Practice Report", 14, currentY);
  
  currentY += 16;
  doc.setFontSize(11);
  doc.text(`Date: ${session?.date || "—"}`, 14, currentY);
  doc.text(`Time: ${session?.startTime || "—"}`, 14, currentY + 6);
  doc.text(`Type: ${session?.type || "Practice"}`, 14, currentY + 12);
  if (session?.title) {
    doc.text(`Title: ${session.title}`, 14, currentY + 18);
    currentY += 24;
  } else {
    currentY += 18;
  }

  // 2. Practice Summary Metrics
  currentY += 10;
  doc.setFontSize(13);
  doc.text("Practice Metrics", 14, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [["Metric", "Total Time", "High Intensity", "Courts Used"]],
    body: [
      ["Planned", 
       `${practiceMetrics?.planned?.totalTime || "—"}`,
       `${practiceMetrics?.planned?.highIntensity || "—"}`,
       `${practiceMetrics?.planned?.courtsUsed || "0"}`],
      ["Actual", 
       `${practiceMetrics?.actual?.totalTime || "—"}`,
       `${practiceMetrics?.actual?.highIntensity || "—"}`,
       `${practiceMetrics?.actual?.courtsUsed || "0"}`]
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [29, 78, 216], textColor: 255 },
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // 3. Drill Details Summary
  doc.setFontSize(13);
  doc.text("Drill Details", 14, currentY);
  currentY += 6;

  const drillTableRows = drillRows.map(row => [
    row.name || "Untitled",
    row.courts?.toString() || "—",
    row.totalTime?.toString() || "—"
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Drill Name", "Courts", "Total Time (min)"]],
    body: drillTableRows,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [29, 78, 216], textColor: 255 }
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // 4. Attendance Report
  doc.setFontSize(13);
  doc.text("Attendance", 14, currentY);
  currentY += 6;

  const presentPlayers = [];
  const absentPlayers = [];
  Object.entries(attendance).forEach(([name, record]) => {
    if (record.present) {
      presentPlayers.push(name);
    } else {
      const reason = record.reason === 'Other' 
        ? `${record.reason} - ${record.reasonDetails}` 
        : record.reason || 'No reason given';
      absentPlayers.push([name, reason]);
    }
  });

  // Present Players
  doc.setFontSize(11);
  doc.text(`Present Players (${presentPlayers.length})`, 14, currentY);
  currentY += 6;

  const presentText = presentPlayers.join(", ");
  const splitPresent = doc.splitTextToSize(presentText, 180);
  doc.setFontSize(10);
  doc.text(splitPresent, 14, currentY);
  currentY += (splitPresent.length * 5) + 8;

  // Absent Players
  if (absentPlayers.length > 0) {
    doc.setFontSize(11);
    doc.text(`Absent Players (${absentPlayers.length})`, 14, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [["Player", "Reason"]],
      body: absentPlayers,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [229, 231, 235], textColor: 0 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // 5. Survey Results
  doc.setFontSize(13);
  doc.text("Player Feedback Survey", 14, currentY);
  currentY += 6;

  // Only include survey responses from present players
  const presentPlayerSet = new Set(presentPlayers);
  const filteredSurveyRows = Object.entries(surveyRecords)
    .filter(([name]) => presentPlayerSet.has(name))
    .map(([name, data]) => [
      name,
      data.rpe?.toString() || "—",
      data.legs?.toString() || "—",
      gymSurveyData?.[name]?.rpe?.toString() || "—",
      data.notes || "—"
    ]);

  const responseCount = filteredSurveyRows.length;
  const avgRpe = averages?.rpe?.toFixed(1) || "—";
  const avgLegs = averages?.legs?.toFixed(1) || "—";
  const avgGymRpe = gymSurveyAverages?.rpe?.toFixed(1) || "—";

  doc.setFontSize(11);
  doc.text(`Averages: RPE ${avgRpe} • Legs ${avgLegs} • Gym RPE ${avgGymRpe}`, 14, currentY);
  currentY += 6;

  if (filteredSurveyRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Player", "RPE", "Legs", "Gym RPE", "Notes"]],
      body: filteredSurveyRows,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 },
      didParseCell: data => {
        if (data.section === 'body') {
          const rpe = Number(data.row.cells[1].text);
          const legs = Number(data.row.cells[2].text);
          if (rpe >= 7 || legs >= 7) {
            data.cell.styles.fillColor = [254, 226, 226];
          }
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  doc.setFontSize(10);
  doc.text(
    `${responseCount} out of ${presentPlayers.length} present players completed survey`,
    14,
    currentY
  );

  // 6. Session Timeline (existing)
  currentY += 12;
  // ...existing timeline code...

  const fileDate = sanitizeFileNamePart(session?.date) || sanitizeFileNamePart(getTodayISO());
  const fileName = `practice_${fileDate || "report"}.pdf`;
  return { doc, fileName };
};

const WELLNESS_COLORS = {
  good: [16, 185, 129],     // rgb(16, 185, 129)  - green
  moderate: [245, 158, 11], // rgb(245, 158, 11)  - yellow
  poor: [239, 68, 68]       // rgb(239, 68, 68)   - red
};

const getWellnessColor = (value, metric) => {
  if (!value || typeof value !== 'number') return [255, 255, 255]; // white for no data

  switch (metric) {
    case 'sleep':
      if (value >= 7) return WELLNESS_COLORS.good;
      if (value >= 5) return WELLNESS_COLORS.moderate;
      return WELLNESS_COLORS.poor;
      
    case 'fatigue':
    case 'soreness':
      if (value <= 4) return WELLNESS_COLORS.good;
      if (value <= 6) return WELLNESS_COLORS.moderate;
      return WELLNESS_COLORS.poor;
      
    default:
      return [255, 255, 255];
  }
};

const checkWellnessData = (wellnessData) => {
  if (!wellnessData) return false;
  if (!wellnessData.responses) return false;
  if (!wellnessData.averages) return false;
  
  const hasResponses = Object.keys(wellnessData.responses).length > 0;
  const hasValidAverages = Object.values(wellnessData.averages).some(v => v > 0);
  
  return hasResponses || hasValidAverages;
};

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

const buildPrePracticePdf = ({
  session,
  metrics,
  drillRows,
  attendance,
  wellnessData,
  roster
}) => {
  try {
    validatePrePracticeData({ session, metrics, roster });

    const doc = new jsPDF({ orientation: "portrait", format: "a4" });
    let currentY = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(29, 78, 216);
    doc.text("Pre-Practice Report", 14, currentY);
    currentY += 24;

    // Session Info
    const dateStr = new Date(session?.date || new Date()).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(dateStr, 14, currentY);
    currentY += 8;
    doc.text(`Start Time: ${formatSessionTime(session)}`, 14, currentY);
    currentY += 8;
    doc.text(`Session Type: ${session?.type || "Practice"}`, 14, currentY);
    currentY += 24;

    // Planned Metrics Table
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216);
    doc.text("Planned Practice Metrics", 14, currentY);
    currentY += 12;

    autoTable(doc, {
      startY: currentY,
      head: [["Metric", "Value"]],
      body: [
        ["Total Time (min)", metrics?.planned?.totalTime?.toString() || "—"],
        ["High Intensity (min)", metrics?.planned?.highIntensity?.toString() || "—"],
        ["Courts Used", metrics?.planned?.courtsUsed?.toString() || "—"]
      ],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 }
    });

    currentY = doc.lastAutoTable.finalY + 16;

    // Add Team Wellness Summary section
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216);
    doc.text("Team Wellness Summary", 14, currentY);
    currentY += 12;

    // Calculate team averages
    const teamAverages = {
      sleep: wellnessData.averages?.sleep?.toFixed(1) || '—',
      fatigue: wellnessData.averages?.fatigue?.toFixed(1) || '—',
      soreness: wellnessData.averages?.soreness?.toFixed(1) || '—'
    };

    // Calculate response rates
    const totalPlayers = roster.length;
    const respondedPlayers = Object.keys(wellnessData.responses || {}).length;
    const responseRate = ((respondedPlayers / totalPlayers) * 100).toFixed(0);

    // Add team summary table
    autoTable(doc, {
      startY: currentY,
      head: [["Metric", "Team Average"]],
      body: [
        ["Sleep", teamAverages.sleep],
        ["Fatigue", teamAverages.fatigue],
        ["Soreness", teamAverages.soreness],
        ["Response Rate", `${responseRate}% (${respondedPlayers}/${totalPlayers})`]
      ],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Wellness Data Table
    if (wellnessData?.responses && Object.keys(wellnessData.responses).length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(29, 78, 216);
      doc.text("Player Wellness Status", 14, currentY);
      currentY += 12;

      const wellnessRows = Object.entries(wellnessData.responses).map(([name, data]) => [
        name,
        data.sleep?.toString() || "—",
        data.fatigue?.toString() || "—",
        data.soreness?.toString() || "—",
        data.notes || "—"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Player", "Sleep", "Fatigue", "Soreness", "Notes"]],
        body: wellnessRows,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [29, 78, 216], textColor: 255 },
        didParseCell: data => {
          if (data.section === 'body') {
            const row = data.row.cells;
            const sleep = Number(row[1].text);
            const fatigue = Number(row[2].text);
            const soreness = Number(row[3].text);
            
            if (
              (fatigue >= 7 || soreness >= 7) || // High fatigue/soreness
              (sleep <= 3 && !isNaN(sleep))      // Poor sleep quality
            ) {
              for (let i = 0; i < row.length; i++) {
                data.cell.styles.fillColor = [254, 226, 226]; // Light red
              }
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 20;
    }

    // Generate filename
    const fileDate = sanitizeFileNamePart(session?.date) || sanitizeFileNamePart(getTodayISO());
    const fileName = `pre_practice_${fileDate}.pdf`;

    // Return both doc and fileName
    return { doc, fileName };
    
  } catch (error) {
    console.error('Failed to generate pre-practice PDF:', error);
    throw new Error('PDF generation failed. Please try again.');
  }
};

const ATTENDANCE_KEY = "practiceAttendanceV1";

const buildAttendanceSection = (doc, attendance, startY) => {
  const present = [];
  const absent = [];

  Object.entries(attendance).forEach(([name, record]) => {
    if (record.present) {
      present.push(name);
    } else {
      const reason = record.reason === 'Other' 
        ? `${record.reason} - ${record.reasonDetails}` 
        : record.reason || 'No reason given';
      absent.push([name, reason]);
    }
  });

  doc.setFontSize(13);
  doc.text('Attendance', 14, startY);
  
  let currentY = startY + 8;

  if (present.length > 0) {
    doc.setFontSize(11);
    doc.text(`Present (${present.length}):`, 14, currentY);
    currentY += 6;

    doc.setFontSize(10);
    const presentText = present.join(', ');
    const splitPresent = doc.splitTextToSize(presentText, 180);
    doc.text(splitPresent, 14, currentY);
    currentY += (splitPresent.length * 5) + 8;
  }

  if (absent.length > 0) {
    doc.setFontSize(11);
    doc.text(`Absent (${absent.length}):`, 14, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [['Player', 'Reason']],
      body: absent,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [229, 231, 235], textColor: 0 },
      margin: { left: 14 },
      tableWidth: 180,
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  return currentY;
};

const PRACTICE_DATA_KEY = "practiceData_";

function PracticeLive({ sessionId: sessionIdProp }) {
  const params = useParams();
  const sessionIdParam = params?.sessionId ?? "";
  const sessionId = sessionIdProp ?? sessionIdParam;
  const numericSessionId = Number(sessionId);

  // 1. Load sessions first
  const [sessionsData, setSessionsData] = useState(() => loadSessions());

  // 2. Define session-related logic immediately
  const matchSession = useCallback(
    session =>
      session &&
      (Number(session.id) === numericSessionId ||
        String(session.id) === String(sessionId)),
    [numericSessionId, sessionId]
  );
  const sessionIndex = useMemo(
    () => sessionsData.findIndex(matchSession),
    [sessionsData, matchSession]
  );
  const session = sessionIndex >= 0 ? sessionsData[sessionIndex] : null;

  // 3. Initialize roster and other basic state
  const [roster, setRoster] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [muted, setMuted] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    title: "",
    plannedMin: "",
    plannedIntensity: "",
    plannedCourts: "",
  });
  const [toastMessage, setToastMessage] = useState('');

  // 4. Initialize session-dependent state
  const [metrics, setMetrics] = useState(() => {
    if (!session?.id) return {
      planned: { totalTime: 0, highIntensity: 0, courtsUsed: 0 },
      actual: { totalTime: 0, highIntensity: 0, courtsUsed: 0 }
    };
    
    try {
      const stored = localStorage.getItem(`${PRACTICE_DATA_KEY}${session.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        return data.metrics || {
          planned: { totalTime: 0, highIntensity: 0, courtsUsed: 0 },
          actual: { totalTime: 0, highIntensity: 0, courtsUsed: 0 }
        };
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
    return {
      planned: { totalTime: 0, highIntensity: 0, courtsUsed: 0 },
      actual: { totalTime: 0, highIntensity: 0, courtsUsed: 0 }
    };
  });

  const [drillRows, setDrillRows] = useState(() => {
    if (!session?.id) return [];
    try {
      const stored = localStorage.getItem(`${PRACTICE_DATA_KEY}${session.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        return data.drillRows || [];
      }
    } catch (err) {
      console.error('Failed to load drill rows:', err);
    }
    return [];
  });

  const [attendance, setAttendance] = useState(() => {
    if (!session?.id) return {};
    try {
      const stored = localStorage.getItem(`${PRACTICE_DATA_KEY}${session.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        return data.attendance || {};
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
    return {};
  });

  const [surveyCompleted, setSurveyCompleted] = useState(() => {
    if (!session?.id) return false;
    try {
      const stored = localStorage.getItem(`${PRACTICE_DATA_KEY}${session.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        return data.surveyCompleted || false;
      }
    } catch (err) {
      console.error('Failed to load survey status:', err);
    }
    return false;
  });

  // 5. Initialize survey-related state
  const [surveyData, setSurveyData] = useState(null);
  const [surveyAverages, setSurveyAverages] = useState({ rpe: 0, legs: 0 });
  const [gymSurveyData, setGymSurveyData] = useState(null);
  const [gymSurveyAverages, setGymSurveyAverages] = useState({ rpe: 0 });
  const [wellnessData, setWellnessData] = useState({
    averages: { sleep: 0, fatigue: 0, soreness: 0 },
    responses: {}
  });
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const audioCtxRef = useRef(null);
  const triggerBeepRef = useRef(() => {});
  const [surveyStore, setSurveyStore] = useState(() => getSurveyStore());
  const [quickRosterName, setQuickRosterName] = useState("");
  // Remove duplicate toastMessage state here
  const [sessionSummaries, setSessionSummaries] = useState(() => {
    const parsed = safeParse("sessionSummaries", []);
    return Array.isArray(parsed) ? parsed : [];
  });

  const [summaryEdits, setSummaryEdits] = useState({});
  const [timers, setTimers] = useState([]);

  useEffect(() => {
    const fetchRoster = async () => {
      setIsLoadingRoster(true);
      try {
        const players = await rosterService.getPlayers();
        setRoster(players);
      } catch (error) {
        console.error('Failed to load roster:', error);
        // Fall back to localStorage,
        const localRoster = safeParse(ROSTER_KEY, []);
        setRoster(Array.isArray(localRoster) ? localRoster : []);
      } finally {
        setIsLoadingRoster(false);
      }
    };
    fetchRoster();
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    try {
      const surveyStore = localStorage.getItem(SURVEY_STORE_KEY);
      if (surveyStore) {
        const allSurveys = JSON.parse(surveyStore);
        const sessionSurveys = allSurveys[session.id] || {};
        setSurveyData(sessionSurveys);
        // Add gym survey data loading
        const gymSurveys = allSurveys[`${session.id}_gym`] || {};
        setGymSurveyData(gymSurveys);

        const responses = Object.values(sessionSurveys);
        if (responses.length > 0) {
          const totals = responses.reduce((acc, response) => ({
            rpe: acc.rpe + (Number(response.rpe) || 0),
            legs: acc.legs + (Number(response.legs) || 0)
          }), { rpe: 0, legs: 0 });

          setSurveyAverages({
            rpe: Number((totals.rpe / responses.length).toFixed(1)),
            legs: Number((totals.legs / responses.length).toFixed(1))
          });
        }

        // Add gym survey averages calculation
        const gymResponses = Object.values(gymSurveys);
        if (gymResponses.length > 0) {
          const gymTotal = gymResponses.reduce((acc, response) => 
            acc + (Number(response.rpe) || 0), 0);
          setGymSurveyAverages({
            rpe: Number((gymTotal / gymResponses.length).toFixed(1))
          });
        }
      }
    } catch (err) {
      console.error('Failed to load survey data:', err);
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    try {
      const practiceData = {
        metrics,
        drillRows,
        attendance,
        surveyCompleted,
      };
      localStorage.setItem(
        `${PRACTICE_DATA_KEY}${session.id}`, 
        JSON.stringify(practiceData)
      );
    } catch (err) {
      console.error('Failed to save practice data:', err);
    }
  }, [session?.id, metrics, drillRows, attendance, surveyCompleted]);

  // Load practice data from Firebase
  useEffect(() => {
    const loadPracticeData = async () => {
      if (!session?.id) return;
      try {
        const practiceData = await practiceDataService.getPracticeData(session.id);
        if (practiceData) {
          setMetrics(practiceData.metrics || {
            planned: { totalTime: 0, highIntensity: 0, courtsUsed: 0 },
            actual: { totalTime: 0, highIntensity: 0, courtsUsed: 0 }
          });
          setDrillRows(practiceData.drillRows || []);
          setAttendance(practiceData.attendance || {});
          setSurveyData(practiceData.surveyData || null);
          setSurveyAverages(practiceData.surveyAverages || { rpe: 0, legs: 0 });
          
          // Load gym survey data
          setGymSurveyData(practiceData.gymSurveyData || null);
          setGymSurveyAverages(practiceData.gymSurveyAverages || { rpe: 0 });
        }
      } catch (error) {
        console.error('Failed to load practice data:', error);
        // Fallback to localStorage if Firebase fails
        const stored = localStorage.getItem(`${PRACTICE_DATA_KEY}${session.id}`);
        if (stored) {
          const data = JSON.parse(stored);
          setMetrics(data.metrics || {
            planned: { totalTime: 0, highIntensity: 0, courtsUsed: 0 },
            actual: { totalTime: 0, highIntensity: 0, courtsUsed: 0 }
          });
          setDrillRows(data.drillRows || []);
          setAttendance(data.attendance || {});
          setSurveyData(data.surveyData || null);
          setSurveyAverages(data.surveyAverages || { rpe: 0, legs: 0 });
          
          // Load gym survey data from localStorage fallback
          setGymSurveyData(data.gymSurveyData || null);
          setGymSurveyAverages(data.gymSurveyAverages || { rpe: 0 });
        }
      }
    };
    loadPracticeData();
  }, [session?.id]);

  // Save to Firebase with debouncing
  useEffect(() => {
    if (!session?.id) return;
    const savePracticeData = async () => {
      try {
        await practiceDataService.savePracticeData(session.id, {
          metrics,
          drillRows,
          attendance,
          surveyData,
          surveyAverages,
          gymSurveyData,
          gymSurveyAverages,
          surveyCompleted: Boolean(surveyData && Object.keys(surveyData).length > 0)
        });
      } catch (error) {
        console.error('Failed to save practice data:', error);
        // Fallback to localStorage if Firebase fails
        try {
          localStorage.setItem(`${PRACTICE_DATA_KEY}${session.id}`, JSON.stringify({
            metrics,
            drillRows,
            attendance,
            surveyData,
            surveyAverages,
            gymSurveyData,
            gymSurveyAverages
          }));
        } catch (localError) {
          console.error('Failed to save to localStorage:', localError);
        }
      }
    };
    const timer = setTimeout(savePracticeData, 1000);
    return () => clearTimeout(timer);
  }, [session?.id, metrics, drillRows, attendance, surveyData, surveyAverages, gymSurveyData, gymSurveyAverages]);

  useEffect(() => {
    const fetchWellnessData = async () => {
      try {
        const data = await wellnessService.getTodayWellness();
        setWellnessData(data || {
          averages: { sleep: 0, fatigue: 0, soreness: 0 },
          responses: {} 
        });
      } catch (error) {
        console.error('Failed to fetch wellness data:', error);
        setWellnessData({
          averages: { sleep: 0, fatigue: 0, soreness: 0 },
          responses: {},
          error: 'Failed to load wellness data'
        });
      }
    };
    
    fetchWellnessData();
  }, []);

  const updateMetrics = (type, field, value) => {
    setMetrics(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: Number(value) || 0
      }
    }));
  };

  const updateDrillRow = (index, field, value) => {
    setDrillRows(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'totalTime' ? Number(value) || 0 : value
      };
      return updated;
    });
  };

  const addNewTimer = (type = 'time') => {
    setTimers([...timers, {
      id: crypto.randomUUID(),
      type: type,
      value: 0,
      label: type === 'time' ? 'New Timer' : 'Court Counter',
      isRunning: false
    }]);
  };

  const handleTimerAction = (index, action) => {
    const newTimers = [...timers];
    switch(action) {
      case 'start':
        newTimers[index].isRunning = true;
        newTimers[index].interval = setInterval(() => {
          setTimers(prev => {
            const updated = [...prev];
            updated[index].value++;
            return updated;
          });
        }, 1000);
        break;
      case 'stop':
        clearInterval(newTimers[index].interval);
        newTimers[index].isRunning = false;
        break;
      case 'reset':
        clearInterval(newTimers[index].interval);
        newTimers[index].isRunning = false;
        newTimers[index].value = 0;
        break;
    }
    setTimers(newTimers);
  };

  const handleTimerClick = (index) => {
    const timer = timers[index];
    if (timer.type === 'count') {
      setTimers(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          value: updated[index].value + 1
        };
        return updated;
      });
    } else {
      handleTimerAction(index, timer.isRunning ? 'stop' : 'start');
    }
  };

  const handleDecrementCount = (index) => {
    setTimers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        value: Math.max(0, updated[index].value - 1)
      };
      return updated;
    });
  };

  const handleResetTimer = (index) => {
    if (window.confirm('Are you sure you want to reset this timer?')) {
      handleTimerAction(index, 'reset');
    }
  };

  const handleDeleteTimer = (index) => {
    if (window.confirm('Are you sure you want to remove this timer?')) {
      setTimers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addDrillRow = () => {
    setDrillRows([...drillRows, { name: '', courts: '', totalTime: '', highIntensity: '' }]);
  };

  const removeDrillRow = (index) => {
    setDrillRows(drillRows.filter((_, i) => i !== index));
  };

  const updateTimerLabel = (index, newLabel) => {
    setTimers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        label: newLabel
      };
      return updated;
    });
  };

  useEffect(() => {
    if (!session) return;
    
    const savedSummaries = localStorage.getItem(`summaries_${session.id}`);
    if (savedSummaries) {
      try {
        setSessionSummaries(JSON.parse(savedSummaries));
      } catch (err) {
        console.error('Failed to load session summaries:', err);
      }
    }
  }, [session]);

  useEffect(() => {
    if (!session || sessionSummaries.length === 0) return;
    localStorage.setItem(
      `summaries_${session.id}`,
      JSON.stringify(sessionSummaries)
    );
  }, [session, sessionSummaries]);

  useEffect(() => {
    if (!session?.id) return;
    try {
      const stored = localStorage.getItem(`attendance_${session.id}`);
      if (stored) {
        setAttendance(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    try {
      localStorage.setItem(`attendance_${session.id}`, JSON.stringify(attendance));
    } catch (err) {
      console.error('Failed to save attendance:', err);
    }
  }, [attendance, session?.id]);

  const handleExportPDF = () => {
    console.log('=== PDF Export Debug ===');
    console.log('metrics:', metrics);
    console.log('metrics.planned.courtsUsed:', metrics.planned.courtsUsed);
    console.log('metrics.actual.courtsUsed:', metrics.actual.courtsUsed);

    const { doc, fileName } = buildPracticePdf({
      session,
      summaries: sessionSummaries,
      survey: session.survey,
      surveyRecords: surveyData || {},
      averages: surveyAverages,
      attendance,
      drillRows,
      practiceMetrics: metrics,  // <-- Make sure this is correct
      gymSurveyData,
      gymSurveyAverages
    });
    doc.save(fileName);
  };

  const navigate = useNavigate();
    
  const handleOpenSurvey = () => {
    if (!session?.id) return;
    const practiceData = {
      metrics,
      drillRows,
      attendance,
      surveyCompleted: true
    };

    try {
      localStorage.setItem(
        `${PRACTICE_DATA_KEY}${session.id}`, 
        JSON.stringify(practiceData)
      );

      const presentPlayers = roster
        .filter(player => attendance[player.name]?.present)
        .map(player => ({
          id: player.id,
          name: player.name,
          number: player.number
        }));

      localStorage.setItem(
        `surveyPlayers_${session.id}`, 
        JSON.stringify(presentPlayers)
      );
      navigate(`/survey/${session.id}`);
    } catch (err) {
      console.error('Failed to prepare survey:', err);
    }
  };

  const handleOpenGymSurvey = () => {
    if (!session?.id) return;
    const practiceData = {
      metrics,
      drillRows,
      attendance,
      gymSurveyData,
      surveyCompleted: true
    };

    try {
      localStorage.setItem(
        `${PRACTICE_DATA_KEY}${session.id}`, 
        JSON.stringify(practiceData)
      );

      const presentPlayers = roster
        .filter(player => attendance[player.name]?.present)
        .map(player => ({
          id: player.id,
          name: player.name,
          number: player.number
        }));

      localStorage.setItem(
        `gymSurveyPlayers_${session.id}`, 
        JSON.stringify(presentPlayers)
      );
      navigate(`/gym-survey/${session.id}`);
    } catch (err) {
      console.error('Failed to prepare gym survey:', err);
    }
  };

  const handleAttendanceChange = (player, update) => {
    setAttendance(prev => ({
      ...prev,
      [player.name]: {
        ...prev[player.name],
        ...update
      }
    }));
  };

  const renderSurveyStatus = () => {
    if (!surveyData) return null;
    const presentCount = Object.values(attendance)
      .filter(record => record.present).length;
    const responseCount = Object.keys(surveyData).length;

    return (
      <div className="mb-4 text-sm">
        <p>
          Survey Responses: {responseCount} of {presentCount} players
          {responseCount === presentCount && ' ✓'}
        </p>
        {surveyAverages.rpe > 0 && (
          <p>Team Averages: RPE {surveyAverages.rpe} • Legs {surveyAverages.legs}</p>
        )}
        {gymSurveyAverages.rpe > 0 && (
          <p>Gym Averages: RPE {gymSurveyAverages.rpe}</p>
        )}
      </div>
    );
  };

  const handleExportPrePracticeReport = async () => {
    try {
      setToastMessage('Generating report...');
      validatePrePracticeData({ session, metrics, roster });
      
      const freshWellnessData = await wellnessService.getTodayWellness();
      
      if (!checkWellnessData(freshWellnessData)) {
        if (!window.confirm('No wellness survey responses available for today.\nWould you like to generate the report anyway?')) {
          setToastMessage('');
          return;
        }
      }
      
      const { doc, fileName } = buildPrePracticePdf({
        session, metrics, drillRows, attendance,
        wellnessData: freshWellnessData || { averages: { sleep: 0, fatigue: 0, soreness: 0 }, responses: {} },
        roster
      });
      
      doc.save(fileName);
      setToastMessage('Report generated successfully ✓');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate pre-practice report:', error);
      setToastMessage(error.message || 'Failed to generate report.');
      setTimeout(() => setToastMessage(''), 5000);
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

  if (isLoadingRoster) {
    return <div>Loading roster...</div>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Session not found</h2>
        <p className="mb-4">No session data available.</p>
        <Link to="/" className="text-blue-500 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  const PrePracticeButton = ({ onClick, isLoading }) => (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        py-2 px-4 rounded font-medium
        ${isLoading 
          ? 'bg-gray-100 text-gray-500 cursor-wait'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }
      `}
    >
      {isLoading ? 'Generating...' : 'Export Pre-Practice Report'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Practice Session</h1>
            <div className="text-gray-600">
              <p>Date: {session.date}</p>
              <p>Time: {formatSessionTime(session)}</p>
              {session.type && <p>Type: {session.type}</p>}
            </div>
          </div>
          <Link 
            to="/schedule" 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>←</span>
            <span>Back to Schedule</span>
          </Link>
        </header>

        <div className="practice-layout">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(player => {
                    const record = attendance[player.name] || { present: false };
                    
                    return (
                      <tr key={player.id} className="border-t">
                        <td className="py-2">
                          <span className="font-medium">{player.name}</span>
                          {player.number && (
                            <span className="ml-2 text-gray-500">#{player.number}</span>
                          )}
                        </td>
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={record.present}
                            onChange={e => handleAttendanceChange(player, { present: e.target.checked })}
                            className="mr-2"
                          />
                          <span>{record.present ? 'Present' : 'Absent'}</span>
                        </td>
                        <td className="py-2">
                          {!record.present && (
                            <div className="flex gap-2">
                              <select
                                value={record.reason || ''}
                                onChange={e => handleAttendanceChange(player, {
                                  present: false,
                                  reason: e.target.value,
                                  reasonDetails: e.target.value === 'Other' ? record.reasonDetails : ''
                                })}
                                className="border rounded px-2 py-1"
                              >
                                <option value="">Select reason...</option>
                                <option value="Injury">Injury</option>
                                <option value="Illness">Illness</option>
                                <option value="Personal">Personal</option>
                                <option value="Other">Other</option>
                              </select>
                              {record.reason === 'Other' && (
                                <input
                                  type="text"
                                  value={record.reasonDetails || ''}
                                  onChange={e => handleAttendanceChange(player, {
                                    present: false,
                                    reason: 'Other',
                                    reasonDetails: e.target.value
                                  })}
                                  placeholder="Details..."
                                  className="border rounded px-2 py-1 flex-1"
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Timers</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addNewTimer('time')}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Timer
                </button>
                <button
                  onClick={() => addNewTimer('count')}
                  className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  + Counter
                </button>
              </div>
            </div>
            
            <div className="timer-grid">
              {timers.map((timer, index) => (
                <div key={timer.id} className="timer-container">
                  <div 
                    className={`timer-circle type-${timer.type} ${timer.isRunning ? 'running' : ''}`}
                    onClick={() => handleTimerClick(index)}
                  >
                    <div className="timer-icon">
                      {timer.type === 'time' ? '⏱️' : '🏀'}
                    </div>
                    <div className="timer-value">
                      {timer.type === 'time' 
                        ? formatSeconds(timer.value)
                        : timer.value}
                    </div>
                    <div className="timer-label">
                      <input
                        type="text"
                        value={timer.label}
                        onChange={(e) => updateTimerLabel(index, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="timer-controls">
                    {timer.type === 'count' && (
                      <button onClick={() => handleDecrementCount(index)}>-</button>
                    )}
                    <button onClick={() => handleResetTimer(index)}>Reset</button>
                    <button 
                      onClick={() => handleDeleteTimer(index)}
                      className="danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="practice-main bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-8">Practice Summary</h2>
              
            <div className="mb-10">
              <h3 className="font-semibold mb-4 text-gray-700">Practice Metrics</h3>
              <table className="practice-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Metric</th>
                    <th style={{ width: '28%' }}>Total Time</th>
                    <th style={{ width: '28%' }}>High Intensity</th>
                    <th style={{ width: '29%' }}>Courts Used</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium">Planned</td>
                    <td>
                      <input 
                        type="number" 
                        value={metrics.planned.totalTime}
                        onChange={e => updateMetrics('planned', 'totalTime', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={metrics.planned.highIntensity}
                        onChange={e => updateMetrics('planned', 'highIntensity', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={metrics.planned.courtsUsed}
                        onChange={e => updateMetrics('planned', 'courtsUsed', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">Actual</td>
                    <td>
                      <input 
                        type="number"
                        value={metrics.actual.totalTime}
                        onChange={e => updateMetrics('actual', 'totalTime', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={metrics.actual.highIntensity}
                        onChange={e => updateMetrics('actual', 'highIntensity', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number"
                        value={metrics.actual.courtsUsed}
                        onChange={e => updateMetrics('actual', 'courtsUsed', e.target.value)}
                        className="table-input" 
                        min="0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-10">
              <h3 className="font-semibold mb-4 text-gray-700">Drill Details</h3>
              <table className="practice-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Name</th>
                    <th style={{ width: '22%' }}>Total Time (min)</th>
                    <th style={{ width: '22%' }}>High Intensity (min)</th>
                    <th style={{ width: '16%' }}>Courts</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {drillRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateDrillRow(index, 'name', e.target.value)}
                          className="table-input"
                          placeholder="Drill name..."
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.totalTime || ''}
                          onChange={(e) => updateDrillRow(index, 'totalTime', e.target.value)}
                          className="table-input"
                          placeholder=""
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.highIntensity || ''}
                          onChange={(e) => updateDrillRow(index, 'highIntensity', e.target.value)}
                          className="table-input"
                          placeholder=""
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.courts || ''}
                          onChange={(e) => updateDrillRow(index, 'courts', e.target.value)}
                          className="table-input"
                          placeholder=""
                        />
                      </td>
                      <td className="text-center">
                        <button
                          onClick={(() => removeDrillRow(index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addDrillRow}
                className="mt-4 w-full px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium"
              >
                + Add Drill
              </button>
            </div>

            <div className="practice-controls">
              {renderSurveyStatus()}
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/wellness')}
                  className="py-2 px-4 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded font-medium flex items-center gap-2"
                >
                  <span>💪</span>
                  <span>Daily Wellness Check</span>
                </button>
                <PrePracticeButton 
                  onClick={handleExportPrePracticeReport}
                  isLoading={toastMessage === 'Generating report...'}
                />
                <button
                  onClick={handleExportPDF}
                  className="py-2 px-4 bg-green-100 text-green-700 hover:bg-green-200 rounded font-medium"
                >
                  Export Summary PDF
                </button>
              </div>
              <button
                onClick={handleOpenSurvey}
                className="py-3 px-6 bg-green-500 text-white hover:bg-green-600 rounded-lg font-semibold text-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>
                  {Object.keys(surveyData || {}).length > 0 
                    ? 'Continue Court Survey' 
                    : 'Start Court Survey'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={handleOpenGymSurvey}
                className="py-3 px-6 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-semibold text-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>
                  {Object.keys(gymSurveyData || {}).length > 0 
                    ? 'Continue Gym Survey' 
                    : 'Start Gym Survey'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && (
        <div className="fixed bottom-4 right-4 py-2 px-4 bg-gray-800 text-white rounded-lg shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default PracticeLive;

