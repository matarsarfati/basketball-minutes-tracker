/* eslint no-use-before-define: ["error", { "functions": true, "classes": true, "variables": true }] */
// src/PracticeLive.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

const globalStyles = `
  .live-wrap { display: grid; grid-template-columns: 280px 1fr 320px; gap: 16px; }
  .planned-list, .active-drill, .history-list, .survey-card { background: rgba(255,255,255,0.95); border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
  .timers { display: flex; gap: 12px; flex-wrap: wrap; }
  .timer-box { flex: 1 1 160px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; background: #f8fafc; }
  .controls button { margin-right: 6px; }
  .player-mini { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; margin: 6px 0; background: #fff; }
  .bench-box { margin-top: 12px; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px; background: #fff; }
  .history-list .item { border-bottom: 1px solid #eef2f7; padding: 8px 0; }
  .history-list .item:last-child { border-bottom: 0; }
  .survey-card table { width: 100%; border-collapse: collapse; }
  .survey-card th, .survey-card td { border-bottom: 1px solid #eef2f7; padding: 6px; text-align: left; }
`;

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

const loadRoster = () => {
  const parsed = safeParse(ROSTER_KEY, []);
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

const buildPracticePdf = ({
  session,
  summaries,
  survey,
  surveyRecords,
  averages,
}) => {
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const sessionDate = session?.date || "";
  const sessionTime = session?.startTime || session?.slot || "";
  const headerTitleParts = ["Practice Report"];
  if (sessionDate) headerTitleParts.push(`— ${sessionDate}`);
  if (sessionTime) headerTitleParts.push(sessionTime);

  doc.setFontSize(18);
  doc.text(headerTitleParts.join(" ").trim(), 14, 20);

  doc.setFontSize(11);
  doc.text(`Date: ${sessionDate || "—"}`, 14, 30);
  doc.text(`Slot: ${session?.slot || "—"}`, 14, 36);
  doc.text(`Type: ${session?.type || "Practice"}`, 14, 42);
  if (session?.title) {
    doc.text(`Title: ${session.title}`, 14, 48);
  }

  const totals = summarizeSessionTotals(summaries);
  doc.text(
    `Totals • Total ${formatMsDuration(totals.totalMs)} • Useful ${formatMsDuration(
      totals.usefulMs
    )} • Courts ${totals.totalCourts}`,
    14,
    session?.title ? 54 : 48
  );

  const drillSummaries = summaries
    .filter(summary => summary?.kind !== "break")
    .sort((a, b) => (a?.startedAt || 0) - (b?.startedAt || 0));

  let currentY = session?.title ? 60 : 54;

  if (drillSummaries.length > 0) {
    const drillRows = drillSummaries.map((summary, index) => [
      (index + 1).toString(),
      summary?.title || "Drill",
      formatTimestampToHM(summary?.startedAt),
      formatTimestampToHM(summary?.endedAt),
      formatMsDuration(summary?.totalMs),
      formatMsDuration(summary?.usefulMs),
      summary?.courts != null ? String(summary.courts) : "",
      truncateNote(summary?.note),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Title", "Start", "End", "Total", "Useful", "Courts", "Notes"]],
      body: drillRows,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 16 },
      },
      didDrawPage: data => {
        currentY = data.cursor.y + 10;
      },
    });
    currentY = doc.lastAutoTable?.finalY
      ? doc.lastAutoTable.finalY + 12
      : currentY + 12;
  }

  const { rows: surveyRows, highlightIndices } = buildSurveyRows(
    survey,
    surveyRecords
  );

  if (surveyRows.length > 0) {
    const avgRpe = Number(averages?.rpe ?? averages?.avgRpe ?? 0);
    const avgLegs = Number(averages?.legs ?? averages?.avgLegs ?? 0);
    const averagesLine = `Avg RPE: ${avgRpe ? avgRpe.toFixed(1) : "—"} • Avg Legs: ${
      avgLegs ? avgLegs.toFixed(1) : "—"
    }`;

    doc.setFontSize(13);
    doc.text("Survey", 14, currentY);
    doc.setFontSize(11);
    doc.text(averagesLine, 14, currentY + 6);

    const highlightSet = new Set(highlightIndices);

    autoTable(doc, {
      startY: currentY + 10,
      head: [["Player", "RPE", "Legs", "Notes"]],
      body: surveyRows,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 },
      didParseCell: data => {
        if (data.section === "body" && highlightSet.has(data.row.index)) {
          data.cell.styles.fillColor = [255, 235, 238];
        }
      },
    });
  }

  const fileDate = sanitizeFileNamePart(sessionDate) || sanitizeFileNamePart(getTodayISO());
  const fileName = `practice_${fileDate || "report"}.pdf`;
  return { doc, fileName };
};

export default function PracticeLive({ sessionId: sessionIdProp }) {
  const params = useParams();
  const sessionIdParam = params?.sessionId ?? "";
  const sessionId = sessionIdProp ?? sessionIdParam;
  const numericSessionId = Number(sessionId);

const [sessionsData, setSessionsData] = useState(() => loadSessions());
const [roster, setRoster] = useState(() => loadRoster());
const [muted, setMuted] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    title: "",
    plannedMin: "",
      plannedIntensity: "",
      plannedCourts: "",
    });
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const audioCtxRef = useRef(null);
  const triggerBeepRef = useRef(() => {});
const [surveyStore, setSurveyStore] = useState(() => getSurveyStore());
const [quickRosterName, setQuickRosterName] = useState("");
const [toastMessage, setToastMessage] = useState("");
const [sessionSummaries, setSessionSummaries] = useState(() => {
  const parsed = safeParse("sessionSummaries", []);
  return Array.isArray(parsed) ? parsed : [];
});
const [waterBreak, setWaterBreak] = useState({ isOn: false, startedAt: null });
const [breakNow, setBreakNow] = useState(() => Date.now());
const [summaryEdits, setSummaryEdits] = useState({});
  
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
const executedDrills = useMemo(
  () => (Array.isArray(session?.executedDrills) ? session.executedDrills : []),
  [session?.executedDrills]
);
const activeDrill = executedDrills.find(drill => drill.isActive);
const plannedParts = useMemo(() => {
  if (!session) return [];
  if (!Array.isArray(session.parts)) return [];
  return session.parts;
}, [session]);

const derivedSessionId = session
  ? `${session.date || "unknown"}-${session.slot || "AM"}`
  : "";
const effectiveSessionId = sessionId || derivedSessionId;

const surveyUrl = useMemo(() => {
  if (typeof window === "undefined" || !effectiveSessionId) return "";
  return `${window.location.origin}/survey/${encodeURIComponent(effectiveSessionId)}`;
}, [effectiveSessionId]);

const sessionSurveyRecords = useMemo(() => {
  if (!effectiveSessionId) return {};
  return surveyStore[effectiveSessionId] || {};
}, [surveyStore, effectiveSessionId]);

const rosterPlayerNames = useMemo(
  () => roster.map(player => player.name).filter(Boolean),
  [roster]
);

const survey = session?.survey;
const surveyAverages = survey?.averages;
const averages = useMemo(
  () => (surveyAverages ? surveyAverages : { rpe: 0, legs: 0 }),
  [surveyAverages]
);

const withSessionUpdated = useCallback(
  updater => {
    setSessionsData(prev => {
      const idx = prev.findIndex(matchSession);
      if (idx === -1) return prev;
      const currentSession = prev[idx];
      const updatedSession = updater(currentSession);
      if (!updatedSession || updatedSession === currentSession) return prev;
      const next = [...prev];
      next[idx] = updatedSession;
      return next;
    });
  },
  [matchSession]
);

const pushSummary = useCallback(
  summary => {
    setSessionSummaries(prev => {
      const next = [...prev, summary];
      next.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      return next;
    });
  },
  [setSessionSummaries]
);

const fmtTime = timestamp =>
  new Date(timestamp || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDuration = ms => {
  if (!Number.isFinite(ms)) return "00:00";
  const safe = Math.max(0, ms);
  return new Date(safe).toISOString().substring(14, 19);
};

const createSummaryEditState = summary => {
  const startParts = getTimeParts(summary.startedAt);
  const endParts = getTimeParts(summary.endedAt);
  return {
    title: summary.title || "",
    courts:
      summary.kind === "break"
        ? ""
        : summary.courts === undefined || summary.courts === null
        ? ""
        : String(summary.courts),
    note: summary.note || "",
    startHour: startParts.hour,
    startMinute: startParts.minute,
    endHour: endParts.hour,
    endMinute: endParts.minute,
  };
};

const beginEditSummary = useCallback(summary => {
  if (!summary) return;
  setSummaryEdits(prev => {
    if (prev[summary.id]) return prev;
    return { ...prev, [summary.id]: createSummaryEditState(summary) };
  });
}, []);

const cancelEditSummary = useCallback(id => {
  setSummaryEdits(prev => {
    if (prev[id] === undefined) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });
}, []);

const updateSummaryEditField = useCallback((id, field, value) => {
  setSummaryEdits(prev => {
    if (!prev[id]) return prev;
    return {
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    };
  });
}, []);

const updateSummaryTimeField = useCallback((id, field, value) => {
  setSummaryEdits(prev => {
    if (!prev[id]) return prev;
    return {
      ...prev,
      [id]: {
        ...prev[id],
        [field]: sanitizeTimeInput(value),
      },
    };
  });
}, []);

const normalizeSummaryTimeField = useCallback((id, field) => {
  setSummaryEdits(prev => {
    const edit = prev[id];
    if (!edit) return prev;
    const max = field.toLowerCase().includes("hour") ? 23 : 59;
    const normalized = normalizeTimePart(edit[field], max);
    if (normalized === edit[field]) return prev;
    return {
      ...prev,
      [id]: {
        ...edit,
        [field]: normalized,
      },
    };
  });
}, []);

const saveSummaryEdit = useCallback(
  summaryId => {
    const edit = summaryEdits[summaryId];
    if (!edit) return;
    let errorMessage = null;
    let didUpdate = false;
    setSessionSummaries(prev => {
      const idx = prev.findIndex(summary => summary.id === summaryId);
      if (idx === -1) return prev;
      const summary = prev[idx];
      const startMs = buildTimestampWithTime(
        summary.startedAt,
        normalizeTimePart(edit.startHour, 23),
        normalizeTimePart(edit.startMinute, 59)
      );
      const endMs = buildTimestampWithTime(
        summary.endedAt ?? summary.startedAt,
        normalizeTimePart(edit.endHour, 23),
        normalizeTimePart(edit.endMinute, 59)
      );
      if (endMs <= startMs) {
        errorMessage = "End time must be after start time";
        return prev;
      }
      const newTotalMs = endMs - startMs;
      const prevTotal = summary.totalMs || 0;
      const prevUseful = summary.usefulMs || 0;
      let newUsefulMs;
      if (prevTotal <= 0) {
        newUsefulMs = newTotalMs;
      } else {
        newUsefulMs = Math.round((prevUseful / prevTotal) * newTotalMs);
      }
      if (!Number.isFinite(newUsefulMs)) {
        newUsefulMs = newTotalMs;
      }
      newUsefulMs = Math.max(0, Math.min(newTotalMs, newUsefulMs));
      let courtsValue = summary.courts;
      if (summary.kind !== "break") {
        if (edit.courts === "") {
          courtsValue = undefined;
        } else {
          const parsedCourts = Number(edit.courts);
          courtsValue = Number.isFinite(parsedCourts)
            ? Math.max(0, parsedCourts)
            : summary.courts;
        }
      }
      const updated = {
        ...summary,
        title: edit.title.trim() || summary.title,
        courts: courtsValue,
        note: edit.note,
        startedAt: startMs,
        endedAt: endMs,
        totalMs: newTotalMs,
        usefulMs: newUsefulMs,
      };
      const next = [...prev];
      next[idx] = updated;
      next.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      didUpdate = true;
      return next;
    });
    if (errorMessage) {
      setToastMessage(errorMessage);
      return;
    }
    if (didUpdate) {
      setSummaryEdits(prev => {
        if (prev[summaryId] === undefined) return prev;
        const next = { ...prev };
        delete next[summaryId];
        return next;
      });
    }
  },
  [setSessionSummaries, setSummaryEdits, setToastMessage, summaryEdits]
);

const handleDeleteSummary = useCallback(
  id => {
    setSessionSummaries(prev => prev.filter(summary => summary.id !== id));
    setSummaryEdits(prev => {
      if (prev[id] === undefined) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  },
  [setSessionSummaries, setSummaryEdits]
);

const resumeSummary = useCallback(
  summary => {
    if (!summary || summary.kind === "break") return;
    setSessionSummaries(prev => prev.filter(item => item.id !== summary.id));
    setSummaryEdits(prev => {
      if (prev[summary.id] === undefined) return prev;
      const next = { ...prev };
      delete next[summary.id];
      return next;
    });
    const now = Date.now();
    withSessionUpdated(current => {
      const drills = Array.isArray(current.executedDrills)
        ? current.executedDrills
        : [];
      const targetId = summary.sourceDrillId;
      let resumedDrill = null;
      const updatedDrills = drills.map(drill => {
        if (targetId && String(drill.id) === String(targetId)) {
          const updated = {
            ...drill,
            name: summary.title || drill.name || "Drill",
            isActive: true,
            totalRunning: true,
            usefulRunning: true,
            totalSec: 0,
            usefulSec: 0,
            resumedFromMs: summary.totalMs || 0,
            resumedFromUsefulMs: summary.usefulMs || 0,
            startedAt: now,
            courtsCount:
              summary.courts !== undefined && summary.courts !== null
                ? summary.courts
                : drill.courtsCount ?? 0,
            notes: summary.note || drill.notes || "",
            bench: drill.bench
              ? { ...drill.bench, running: false, sec: 0, alertTriggered: false }
              : { running: false, sec: 0 },
            perPlayer: {},
            wasResumed: true,
            originalStartedAt: summary.startedAt || drill.originalStartedAt || drill.startedAt,
          };
          resumedDrill = updated;
          return updated;
        }
        if (
          drill.isActive ||
          drill.totalRunning ||
          drill.usefulRunning ||
          drill.bench?.running
        ) {
          const cleaned = {
            ...drill,
            isActive: false,
            totalRunning: false,
            usefulRunning: false,
            bench: drill.bench
              ? { ...drill.bench, running: false }
              : drill.bench,
          };
          if (drill.perPlayer && Object.keys(drill.perPlayer).length) {
            cleaned.perPlayer = Object.fromEntries(
              Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                pid,
                {
                  ...pdata,
                  runningTotal: false,
                  runningUseful: false,
                },
              ])
            );
          }
          return cleaned;
        }
        return drill;
      });
      if (!resumedDrill) {
        resumedDrill = {
          id: now,
          plannedPartId: summary.plannedPartId || null,
          name: summary.title || "Drill",
          plannedMin: null,
          plannedIntensity: null,
          plannedCourts:
            summary.courts !== undefined && summary.courts !== null
              ? summary.courts
              : null,
          startedAt: now,
          totalSec: 0,
          usefulSec: 0,
          totalRunning: true,
          usefulRunning: true,
          perPlayer: {},
          bench: { running: false, sec: 0 },
          notes: summary.note || "",
          courtsCount:
            summary.courts !== undefined && summary.courts !== null
              ? summary.courts
              : 0,
          resumedFromMs: summary.totalMs || 0,
          resumedFromUsefulMs: summary.usefulMs || 0,
          wasResumed: true,
          originalStartedAt: summary.startedAt || now,
        };
        updatedDrills.push(resumedDrill);
      }
      return {
        ...current,
        executedDrills: updatedDrills,
      };
    });
  },
  [setSessionSummaries, setSummaryEdits, withSessionUpdated]
);

const handleExportPdf = useCallback(() => {
  if (!session || typeof window === "undefined") return;
  const { doc, fileName } = buildPracticePdf({
    session,
    summaries: sessionSummaries,
    survey,
    surveyRecords: sessionSurveyRecords,
    averages,
  });
  doc.save(fileName);
}, [session, sessionSummaries, survey, sessionSurveyRecords, averages]);

const breakElapsedSec =
  waterBreak.isOn && waterBreak.startedAt
    ? Math.max(0, Math.floor((breakNow - waterBreak.startedAt) / 1000))
    : 0;

const handleWaterBreakToggle = useCallback(() => {
  if (!waterBreak.isOn) {
    const startedAt = Date.now();
    setWaterBreak({ isOn: true, startedAt });
    setBreakNow(startedAt);
    return;
  }
  const endedAt = Date.now();
  const startedAt = waterBreak.startedAt || endedAt;
  const duration = endedAt - startedAt;
  pushSummary({
    id: safeUUID(),
    kind: "break",
    title: "Water break",
    startedAt,
    endedAt,
    totalMs: duration,
    usefulMs: duration,
    courts: 0,
    note: "",
  });
  setWaterBreak({ isOn: false, startedAt: null });
  setBreakNow(endedAt);
}, [pushSummary, waterBreak, setBreakNow, setWaterBreak]);

const submissionEntries = Object.entries(sessionSurveyRecords);
const submittedNames = submissionEntries.map(([name]) => name);
const submissionsFromRoster = rosterPlayerNames.filter(name => sessionSurveyRecords[name]);
const totalPlayers = rosterPlayerNames.length || submittedNames.length;
const submittedCount = rosterPlayerNames.length ? submissionsFromRoster.length : submittedNames.length;
const summaryAverages = calcAverages(submissionEntries.map(([, entry]) => entry));
const extraSubmitters = submittedNames.filter(name => !rosterPlayerNames.includes(name));

const summaryRosterNames = useMemo(() => {
  const storedNames = getRosterNames();
  if (storedNames.length) return storedNames;
  if (rosterPlayerNames.length) return rosterPlayerNames;
  return submittedNames;
}, [submittedNames, rosterPlayerNames]);

const handleCopyLink = async () => {
  if (!surveyUrl) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(surveyUrl);
    } else {
      const temp = document.createElement("textarea");
      temp.value = surveyUrl;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
    setToastMessage("הקישור הועתק");
  } catch (err) {
    console.error("Copy failed", err);
    setToastMessage("לא הצלחנו להעתיק, נסי ידנית");
  }
};

const handleOpenSurvey = () => {
  if (!surveyUrl) return;
  window.open(surveyUrl, "_blank", "noopener");
};

const handleQuickAddName = () => {
  const trimmed = quickRosterName.trim();
  if (!trimmed) {
    setToastMessage("אנא הזיני שם שחקנית");
    return;
  }
  if (roster.some(player => player.name === trimmed)) {
    setToastMessage("השם כבר קיים ברשימה");
    return;
  }
  setRoster(prev => [
    ...prev,
    { id: Date.now(), name: trimmed, number: "" },
  ]);
  setQuickRosterName("");
  setToastMessage("השם נוסף לרשימה");
};

    useEffect(() => {
      if (typeof window === "undefined") return;
      const handle = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(sessionsData));
        } catch (err) {
          console.error("Failed saving sessions", err);
        }
      }, 400);
      return () => clearTimeout(handle);
    }, [sessionsData]);
  
    useEffect(() => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
      } catch (err) {
        console.error("Failed saving roster", err);
      }
    }, [roster]);
  
    useEffect(() => {
      if (!session) return;
      if (Array.isArray(session.executedDrills)) return;
      setSessionsData(prev => {
        if (sessionIndex === -1) return prev;
        const next = [...prev];
        next[sessionIndex] = { ...session, executedDrills: [] };
        return next;
      });
    }, [session, sessionIndex]);
  
    useEffect(() => {
      if (!session) return;
      if (Array.isArray(session.parts)) return;
      setSessionsData(prev => {
        if (sessionIndex === -1) return prev;
        const next = [...prev];
        next[sessionIndex] = { ...session, parts: [] };
        return next;
      });
    }, [session, sessionIndex]);
  
    useEffect(() => {
      if (!session) return;
      if (!Array.isArray(session.parts)) return;
      const needsId = session.parts.some(
        part => part.id === undefined || part.id === null
      );
      if (!needsId) return;
      setSessionsData(prev => {
        if (sessionIndex === -1) return prev;
        const current = prev[sessionIndex];
        const updatedParts = (current.parts || []).map(part =>
          part.id === undefined || part.id === null
            ? { ...part, id: createId() }
            : part
        );
        const next = [...prev];
        next[sessionIndex] = { ...current, parts: updatedParts };
        return next;
      });
    }, [session, sessionIndex]);
  
    useEffect(() => {
      if (!session) return;
      setSessionsData(prev => {
        const idx = prev.findIndex(matchSession);
        if (idx === -1) return prev;
        const current = prev[idx];
        const currentSurvey = current.survey;
        const rosterPlayers = roster;
        const playersMap = currentSurvey?.players
          ? new Map(
              currentSurvey.players.map(p => [String(p.id), { ...p }])
            )
          : new Map();
        let changed = false;
        const updatedPlayers = rosterPlayers.map(player => {
          const key = String(player.id);
          if (playersMap.has(key)) {
            const data = playersMap.get(key);
            if (data.name !== player.name) {
              changed = true;
              return { ...data, name: player.name };
            }
            return data;
          }
          changed = true;
          return { id: player.id, name: player.name, rpe: 5, legs: 5 };
        });
        if (
          currentSurvey?.players?.length &&
          currentSurvey.players.length !== updatedPlayers.length
        ) {
          changed = true;
        }
        if (!changed && currentSurvey) return prev;
        const survey = {
          rosterVersion: Date.now(),
          players: updatedPlayers,
          averages: calcSurveyAverages(updatedPlayers),
          savedAt: currentSurvey?.savedAt || "",
        };
        const next = [...prev];
        next[idx] = { ...current, survey };
        return next;
      });
    }, [roster, session, matchSession]);
  
    const triggerBeep = useCallback(() => {
      if (muted || typeof window === "undefined") return;
      try {
        if (!audioCtxRef.current) {
          const AudioContext =
            window.AudioContext || window.webkitAudioContext || null;
          if (!AudioContext) return;
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (err) {
        console.error("Beep error", err);
      }
    }, [muted]);
  
useEffect(() => {
  triggerBeepRef.current = triggerBeep;
}, [triggerBeep]);

useEffect(() => {
  const handleStorage = event => {
    if (!event || event.key === null || event.key === SURVEY_STORE_KEY) {
      setSurveyStore(getSurveyStore());
    }
  };
  const handleFocus = () => {
    setSurveyStore(getSurveyStore());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    }
  };
}, []);

useEffect(() => {
  if (!toastMessage) return;
  const timeout = setTimeout(() => setToastMessage(""), 2200);
  return () => clearTimeout(timeout);
}, [toastMessage]);

useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sessionSummaries", JSON.stringify(sessionSummaries));
  } catch (err) {
    console.error("Failed to persist sessionSummaries", err);
  }
}, [sessionSummaries]);

useEffect(() => {
  if (!waterBreak.isOn) return undefined;
  const interval = setInterval(() => setBreakNow(Date.now()), 1000);
  return () => clearInterval(interval);
}, [waterBreak.isOn]);

    useEffect(() => {
      const interval = setInterval(() => {
        let beepNeeded = false;
        setSessionsData(prev => {
          const idx = prev.findIndex(matchSession);
          if (idx === -1) return prev;
          const current = prev[idx];
          const drills = current?.executedDrills;
          if (!Array.isArray(drills) || drills.length === 0) return prev;
          let sessionChanged = false;
          const updatedDrills = drills.map(drill => {
            let drillChanged = false;
            let updated = drill;
            const shouldTick =
              drill.isActive || drill.totalRunning || drill.usefulRunning;
            if (shouldTick) {
              updated = { ...drill };
              if (drill.totalRunning) {
                updated.totalSec = (updated.totalSec || 0) + 1;
                drillChanged = true;
              }
              if (drill.usefulRunning) {
                updated.usefulSec = (updated.usefulSec || 0) + 1;
                drillChanged = true;
              }
              if (drill.perPlayer && Object.keys(drill.perPlayer).length) {
                const perPlayer = {};
                let playersChanged = false;
                Object.entries(drill.perPlayer).forEach(([pid, pdata]) => {
                  const player = { ...pdata };
                  let playerChanged = false;
                  if (pdata.runningTotal) {
                    player.totalSec = (player.totalSec || 0) + 1;
                    playerChanged = true;
                  }
                  if (pdata.runningUseful) {
                    player.usefulSec = (player.usefulSec || 0) + 1;
                    playerChanged = true;
                  }
                  const limitSec =
                    player.limits?.maxMin !== undefined
                      ? player.limits.maxMin * 60
                      : null;
                  if (
                    limitSec &&
                    player.usefulSec >= limitSec &&
                    !player.limitAlerted
                  ) {
                    player.limitAlerted = true;
                    beepNeeded = true;
                    playerChanged = true;
                  }
                  if (playerChanged) playersChanged = true;
                  perPlayer[pid] = playerChanged ? player : pdata;
                });
                if (playersChanged) {
                  updated.perPlayer = perPlayer;
                  drillChanged = true;
                }
              }
              if (drill.bench?.running) {
                const bench = {
                  ...drill.bench,
                  sec: (drill.bench.sec || 0) + 1,
                };
                if (
                  bench.alertAtSec &&
                  bench.sec >= bench.alertAtSec &&
                  !bench.alertTriggered
                ) {
                  bench.alertTriggered = true;
                  beepNeeded = true;
                }
                updated.bench = bench;
                drillChanged = true;
              }
            } else if (drill.bench?.running) {
              updated = {
                ...drill,
                bench: { ...drill.bench, running: false },
              };
              drillChanged = true;
            }
            if (drillChanged) {
              sessionChanged = true;
              return updated;
            }
            return drill;
          });
          if (!sessionChanged) return prev;
          const next = [...prev];
          next[idx] = { ...current, executedDrills: updatedDrills };
          return next;
        });
        if (beepNeeded) triggerBeepRef.current();
      }, 1000);
      return () => clearInterval(interval);
    }, [matchSession]);
  
    const startDrill = useCallback(
      part => {
        withSessionUpdated(current => {
          const existingDrills = Array.isArray(current.executedDrills)
            ? current.executedDrills.map(drill => ({
                ...drill,
                isActive: false,
                totalRunning: false,
                usefulRunning: false,
                perPlayer: drill.perPlayer
                  ? Object.fromEntries(
                      Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                        pid,
                        {
                          ...pdata,
                          runningTotal: false,
                          runningUseful: false,
                        },
                      ])
                    )
                  : {},
                bench: drill.bench
                  ? { ...drill.bench, running: false }
                  : drill.bench,
              }))
            : [];
          const now = Date.now();
          const newDrill = {
            id: now,
            plannedPartId: part?.id,
            name:
              part?.title ||
              part?.name ||
              part?.label ||
              `Drill ${existingDrills.length + 1}`,
            plannedMin:
              part?.plannedMin ??
              part?.minutes ??
              part?.plannedMinutes ??
              null,
            plannedIntensity:
              part?.plannedIntensity ?? part?.intensity ?? null,
            plannedCourts:
              part?.plannedCourts ?? part?.courts ?? part?.plannedCourts ?? null,
            startedAt: now,
            totalSec: 0,
            usefulSec: 0,
            totalRunning: true,
            usefulRunning: true,
            courtsCount: part?.plannedCourts ?? part?.courts ?? 1,
            perPlayer: {},
            bench: { running: false, sec: 0, alertAtSec: undefined, alertTriggered: false },
            notes: "",
            isActive: true,
          };
          const updatedDrills = [...existingDrills, newDrill];
          return { ...current, executedDrills: updatedDrills };
        });
      },
      [withSessionUpdated]
    );
  
    const startEmptyDrill = useCallback(() => {
      startDrill(undefined);
    }, [startDrill]);
  
    const updateDrill = useCallback(
      (drillId, updater) => {
        withSessionUpdated(current => {
          const drills = Array.isArray(current.executedDrills)
            ? current.executedDrills
            : [];
          const idx = drills.findIndex(drill => drill.id === drillId);
          if (idx === -1) return current;
          const updatedDrill = updater({ ...drills[idx] });
          if (!updatedDrill) return current;
          const updatedDrills = drills.map((drill, index) =>
            index === idx ? updatedDrill : drill
          );
          return { ...current, executedDrills: updatedDrills };
        });
      },
      [withSessionUpdated]
    );
  
    const setExclusiveActive = useCallback(
      drillId => {
        withSessionUpdated(current => {
          const drills = Array.isArray(current.executedDrills)
            ? current.executedDrills
            : [];
          let changed = false;
          const updatedDrills = drills.map(drill => {
            if (drill.id === drillId) {
              if (drill.isActive) return drill;
              changed = true;
              return {
                ...drill,
                isActive: true,
              };
            }
            if (
              drill.isActive ||
              drill.totalRunning ||
              drill.usefulRunning ||
              drill.bench?.running
            ) {
              changed = true;
              const cleaned = {
                ...drill,
                isActive: false,
                totalRunning: false,
                usefulRunning: false,
                bench: drill.bench
                  ? { ...drill.bench, running: false }
                  : drill.bench,
              };
              if (drill.perPlayer) {
                cleaned.perPlayer = Object.fromEntries(
                  Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                    pid,
                    { ...pdata, runningTotal: false, runningUseful: false },
                  ])
                );
              }
              return cleaned;
            }
            return drill;
          });
          if (!changed) return current;
          return { ...current, executedDrills: updatedDrills };
        });
      },
      [withSessionUpdated]
    );
  
    const toggleMaster = useCallback(
      (drillId, running) => {
        if (running) setExclusiveActive(drillId);
        updateDrill(drillId, drill => {
          const updated = {
            ...drill,
            isActive: running ? true : drill.isActive,
            totalRunning: running,
            usefulRunning: running,
            startedAt: drill.startedAt || (running ? Date.now() : drill.startedAt),
          };
          if (drill.perPlayer) {
            updated.perPlayer = Object.fromEntries(
              Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                pid,
                {
                  ...pdata,
                  runningTotal: running,
                  runningUseful: running,
                },
              ])
            );
          }
          if (drill.bench) {
            updated.bench = { ...drill.bench, running };
          }
          return updated;
        });
      },
      [setExclusiveActive, updateDrill]
    );
  
    const toggleTimer = useCallback(
      (drillId, key, running) => {
        if (running) setExclusiveActive(drillId);
        updateDrill(drillId, drill => {
          const updated = { ...drill };
          if (key === "total") {
            updated.totalRunning = running;
          } else if (key === "useful") {
            updated.usefulRunning = running;
          }
          if (running) {
            updated.isActive = true;
            updated.startedAt = updated.startedAt || Date.now();
          }
          return updated;
        });
      },
      [setExclusiveActive, updateDrill]
    );
  
    const resetTimer = useCallback(
      (drillId, key) => {
        updateDrill(drillId, drill => {
          const updated = { ...drill };
          if (key === "total") {
            updated.totalSec = 0;
            updated.totalRunning = false;
          } else if (key === "useful") {
            updated.usefulSec = 0;
            updated.usefulRunning = false;
          } else if (key === "both") {
            updated.totalSec = 0;
            updated.usefulSec = 0;
            updated.totalRunning = false;
            updated.usefulRunning = false;
          }
          return updated;
        });
      },
      [updateDrill]
    );
  
    const adjustCourts = useCallback(
      (drillId, delta) => {
        updateDrill(drillId, drill => {
          const nextCount = Math.max(0, (drill.courtsCount || 0) + delta);
          return { ...drill, courtsCount: nextCount };
        });
      },
      [updateDrill]
    );
  
    const togglePlayerInDrill = useCallback(
      (drillId, playerId) => {
        updateDrill(drillId, drill => {
          const perPlayer = { ...(drill.perPlayer || {}) };
          if (perPlayer[playerId]) {
            delete perPlayer[playerId];
          } else {
            perPlayer[playerId] = {
              totalSec: 0,
              usefulSec: 0,
              courtsCount: drill.courtsCount || 1,
              runningTotal: drill.totalRunning || false,
              runningUseful: drill.usefulRunning || false,
              limits: {},
            };
          }
          return { ...drill, perPlayer };
        });
      },
      [updateDrill]
    );
  
    const togglePlayerTimer = useCallback(
      (drillId, playerId, key, running) => {
        if (running) setExclusiveActive(drillId);
        updateDrill(drillId, drill => {
          const perPlayer = { ...(drill.perPlayer || {}) };
          if (!perPlayer[playerId]) return drill;
          const player = { ...perPlayer[playerId] };
          if (key === "total") {
            player.runningTotal = running;
          } else if (key === "useful") {
            player.runningUseful = running;
          }
          perPlayer[playerId] = player;
          return { ...drill, perPlayer };
        });
      },
      [setExclusiveActive, updateDrill]
    );
  
    const incrementPlayerCourts = useCallback(
      (drillId, playerId, delta) => {
        updateDrill(drillId, drill => {
          const perPlayer = { ...(drill.perPlayer || {}) };
          if (!perPlayer[playerId]) return drill;
          const player = { ...perPlayer[playerId] };
          player.courtsCount = Math.max(
            0,
            (player.courtsCount || 0) + delta
          );
          perPlayer[playerId] = player;
          return { ...drill, perPlayer };
        });
      },
      [updateDrill]
    );
  
    const updatePlayerLimit = useCallback(
      (drillId, playerId, minutesValue) => {
        updateDrill(drillId, drill => {
          const perPlayer = { ...(drill.perPlayer || {}) };
          if (!perPlayer[playerId]) return drill;
          const player = { ...perPlayer[playerId] };
          const minutes =
            minutesValue === "" ? undefined : Math.max(0, Number(minutesValue));
          player.limits = { ...(player.limits || {}) };
          if (minutes === undefined || Number.isNaN(minutes)) {
            delete player.limits.maxMin;
          } else {
            player.limits.maxMin = minutes;
          }
          player.limitAlerted = false;
          perPlayer[playerId] = player;
          return { ...drill, perPlayer };
        });
      },
      [updateDrill]
    );
  
    const toggleBench = useCallback(
      (drillId, running) => {
        updateDrill(drillId, drill => {
          const bench = drill.bench
            ? { ...drill.bench, running }
            : { running, sec: 0 };
          if (!running) {
            bench.running = false;
          }
          return { ...drill, bench };
        });
      },
      [updateDrill]
    );
  
    const setBenchAlert = useCallback(
      (drillId, minutesValue) => {
        updateDrill(drillId, drill => {
          const bench = { ...(drill.bench || { running: false, sec: 0 }) };
          const minutes =
            minutesValue === "" ? undefined : Math.max(0, Number(minutesValue));
          bench.alertAtSec =
            minutes === undefined || Number.isNaN(minutes)
              ? undefined
              : minutes * 60;
          bench.alertTriggered = false;
          return { ...drill, bench };
        });
      },
      [updateDrill]
    );
  
    const resetBench = useCallback(
      drillId => {
        updateDrill(drillId, drill => ({
          ...drill,
          bench: {
            running: false,
            sec: 0,
            alertAtSec: drill.bench?.alertAtSec,
            alertTriggered: false,
          },
        }));
      },
      [updateDrill]
    );
  
    const setDrillNotes = useCallback(
      (drillId, value) => {
        updateDrill(drillId, drill => ({ ...drill, notes: value }));
      },
      [updateDrill]
    );
  
const endDrill = useCallback(
  drillId => {
    const drill = executedDrills.find(item => item.id === drillId);
    const endedAt = Date.now();
    let finalTotalMs = 0;
    let finalUsefulMs = 0;
    if (drill) {
      const resumedTotalMs = drill.resumedFromMs || 0;
      const resumedUsefulMs = drill.resumedFromUsefulMs || 0;
      const currentTotalMs = Math.max(0, (drill.totalSec || 0) * 1000);
      const currentUsefulMs = Math.max(0, (drill.usefulSec || 0) * 1000);
      finalTotalMs = resumedTotalMs + currentTotalMs;
      finalUsefulMs = resumedUsefulMs + currentUsefulMs;
      const baseNote = drill.notes || "";
      const note =
        resumedTotalMs || resumedUsefulMs
          ? baseNote
            ? `${baseNote}\n(resumed)`
            : "(resumed)"
          : baseNote;
      const summary = {
        id: safeUUID(),
        kind: "drill",
        title: drill.name || "Drill",
        startedAt: drill.originalStartedAt || drill.startedAt || endedAt,
        endedAt,
        totalMs: finalTotalMs,
        usefulMs: finalUsefulMs,
        courts: drill.courtsCount ?? drill.plannedCourts ?? 0,
        note,
        sourceDrillId: drill.id,
        plannedPartId: drill.plannedPartId ?? null,
      };
      pushSummary(summary);
    }
    updateDrill(drillId, drill => {
      const perPlayer = drill.perPlayer
        ? Object.fromEntries(
            Object.entries(drill.perPlayer).map(([pid, pdata]) => [
              pid,
              {
                ...pdata,
                runningTotal: false,
                runningUseful: false,
              },
            ])
          )
        : {};
      return {
        ...drill,
        isActive: false,
        totalRunning: false,
        usefulRunning: false,
        perPlayer,
        bench: drill.bench
          ? { ...drill.bench, running: false }
          : drill.bench,
        resumedFromMs: 0,
        resumedFromUsefulMs: 0,
        originalStartedAt: undefined,
        wasResumed: false,
        totalSec:
          finalTotalMs > 0 ? Math.floor(finalTotalMs / 1000) : drill.totalSec,
        usefulSec:
          finalUsefulMs > 0 ? Math.floor(finalUsefulMs / 1000) : drill.usefulSec,
      };
    });
  },
  [executedDrills, pushSummary, updateDrill]
);
  
    const deleteDrill = useCallback(
      drillId => {
        withSessionUpdated(current => {
          const drills = Array.isArray(current.executedDrills)
            ? current.executedDrills
            : [];
          const filtered = drills.filter(drill => drill.id !== drillId);
          if (filtered.length === drills.length) return current;
          return { ...current, executedDrills: filtered };
        });
      },
      [withSessionUpdated]
    );
  
    const reactivateDrill = useCallback(
      drillId => {
        withSessionUpdated(current => {
          const drills = Array.isArray(current.executedDrills)
            ? current.executedDrills
            : [];
          let changed = false;
          const updated = drills.map(drill => {
            if (drill.id === drillId) {
              changed = true;
              return {
                ...drill,
                isActive: true,
                totalRunning: false,
                usefulRunning: false,
                perPlayer: drill.perPlayer
                  ? Object.fromEntries(
                      Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                        pid,
                        {
                          ...pdata,
                          runningTotal: false,
                          runningUseful: false,
                        },
                      ])
                    )
                  : {},
                bench: drill.bench
                  ? { ...drill.bench, running: false }
                  : { running: false, sec: drill.bench?.sec || 0 },
              };
            }
            if (drill.isActive || drill.totalRunning || drill.usefulRunning) {
              changed = true;
              const cleaned = {
                ...drill,
                isActive: false,
                totalRunning: false,
                usefulRunning: false,
                bench: drill.bench
                  ? { ...drill.bench, running: false }
                  : drill.bench,
              };
              if (drill.perPlayer) {
                cleaned.perPlayer = Object.fromEntries(
                  Object.entries(drill.perPlayer).map(([pid, pdata]) => [
                    pid,
                    { ...pdata, runningTotal: false, runningUseful: false },
                  ])
                );
              }
              return cleaned;
            }
            return drill;
          });
          if (!changed) return current;
          return { ...current, executedDrills: updated };
        });
      },
      [withSessionUpdated]
    );
  
    const updateSurveyPlayer = useCallback(
      (playerId, field, value) => {
        const numeric = Math.max(1, Math.min(10, Number(value) || 0));
        withSessionUpdated(current => {
          const survey = current.survey || {
            rosterVersion: Date.now(),
            players: [],
            averages: { rpe: 0, legs: 0 },
            savedAt: "",
          };
          const players = survey.players.map(player =>
            String(player.id) === String(playerId)
              ? { ...player, [field]: numeric }
              : player
          );
          const averages = calcSurveyAverages(players);
          return { ...current, survey: { ...survey, players, averages } };
        });
      },
      [withSessionUpdated]
    );
  
    const saveSurvey = useCallback(() => {
      withSessionUpdated(current => {
        if (!current.survey) return current;
        return {
          ...current,
          survey: { ...current.survey, savedAt: new Date().toISOString() },
        };
      });
    }, [withSessionUpdated]);
  
    const addPlannedDrill = useCallback(
      evt => {
        if (evt) evt.preventDefault();
        const title = newPartForm.title.trim();
        if (!title) return;
        const plannedMin =
          newPartForm.plannedMin === ""
            ? undefined
            : Number(newPartForm.plannedMin);
        const plannedIntensity =
          newPartForm.plannedIntensity === ""
            ? undefined
            : Number(newPartForm.plannedIntensity);
        const plannedCourts =
          newPartForm.plannedCourts === ""
            ? undefined
            : Number(newPartForm.plannedCourts);
        withSessionUpdated(current => {
          const parts = Array.isArray(current.parts) ? current.parts : [];
          const updatedParts = [
            ...parts,
            {
              id: createId(),
              title,
              plannedMin: Number.isNaN(plannedMin) ? undefined : plannedMin,
              plannedIntensity: Number.isNaN(plannedIntensity)
                ? undefined
                : plannedIntensity,
              plannedCourts: Number.isNaN(plannedCourts)
                ? undefined
                : plannedCourts,
            },
          ];
          return { ...current, parts: updatedParts };
        });
        setNewPartForm({
          title: "",
          plannedMin: "",
          plannedIntensity: "",
          plannedCourts: "",
        });
      },
      [newPartForm, withSessionUpdated]
    );
  
    const updatePartField = useCallback(
      (partId, field, value) => {
        withSessionUpdated(current => {
          const parts = Array.isArray(current.parts) ? current.parts : [];
          const idx = parts.findIndex(part => String(part.id) === String(partId));
          if (idx === -1) return current;
          const nextParts = parts.map(part => {
            if (String(part.id) !== String(partId)) return part;
            const updated = { ...part };
            if (field === "title") {
              updated.title = value;
            } else if (field === "plannedMin") {
              updated.plannedMin =
                value === "" ? undefined : Number(value) || 0;
            } else if (field === "plannedIntensity") {
              updated.plannedIntensity =
                value === "" ? undefined : Number(value) || 0;
            } else if (field === "plannedCourts") {
              updated.plannedCourts =
                value === "" ? undefined : Number(value) || 0;
            }
            return updated;
          });
          return { ...current, parts: nextParts };
        });
      },
      [withSessionUpdated]
    );
  
    const deletePart = useCallback(
      partId => {
        withSessionUpdated(current => {
          const parts = Array.isArray(current.parts) ? current.parts : [];
          const filtered = parts.filter(part => String(part.id) !== String(partId));
          if (filtered.length === parts.length) return current;
          return { ...current, parts: filtered };
        });
      },
      [withSessionUpdated]
    );
  
    const handleAddRosterPlayer = useCallback(
      evt => {
        if (evt) evt.preventDefault();
        const name = newPlayerName.trim();
        if (!name) return;
        setRoster(prev => [
          ...prev,
          { id: Date.now(), name, number: newPlayerNumber.trim() || undefined },
        ]);
        setNewPlayerName("");
        setNewPlayerNumber("");
      },
      [newPlayerName, newPlayerNumber]
    );
  
    const updateRosterPlayer = useCallback((playerId, field, value) => {
      setRoster(prev =>
        prev.map(player =>
          player.id === playerId ? { ...player, [field]: value } : player
        )
      );
    }, []);
  
    const removeRosterPlayer = useCallback(playerId => {
      setRoster(prev => prev.filter(player => player.id !== playerId));
    }, []);
  
    if (!sessionId && !derivedSessionId) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "rgba(255,255,255,0.95)",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 24,
              textAlign: "center",
            }}
          >
            <h2>חסר מזהה אימון</h2>
            <p>אנא בקשי מהצוות קישור מעודכן.</p>
            <Link to="/schedule">חזרה ללוח השנה</Link>
          </div>
        </div>
      );
    }

    if (!session) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Practice session not found.</h2>
          <p>
            We couldn&apos;t find a session with id <strong>{sessionId}</strong>.
          </p>
          <Link to="/schedule">← Back to schedule</Link>
        </div>
      );
    }
  
    const sessionTypeColor = paletteFor(session.type);
    const history = [...executedDrills].sort(
      (a, b) => (b.startedAt || 0) - (a.startedAt || 0)
    );
  
    return (
      <div className="live-wrap" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <style>{globalStyles}</style>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <Link to="/schedule" style={{ display: "inline-block", marginBottom: 8 }}>
              ← Back to schedule
            </Link>
            <h1 style={{ marginBottom: 4 }}>Live Practice</h1>
            <div style={{ color: "#475569" }}>
              <div>
                <strong>Date:</strong> {session.date || "—"} {session.startTime || ""}
              </div>
              <div>
                <strong>Slot:</strong> {session.slot || "—"}
              </div>
              <div>
                <strong>Type:</strong>{" "}
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: sessionTypeColor.background,
                    border: `1px solid ${sessionTypeColor.border}`,
                    color: "#0f172a",
                  }}
                >
                  {session.type || "Practice"}
                </span>
              </div>
              {session.title && (
                <div>
                  <strong>Title:</strong> {session.title}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <label style={{ fontSize: 13, color: "#475569" }}>
              <input
                type="checkbox"
                checked={muted}
                onChange={e => setMuted(e.target.checked)}
              />{" "}
              Mute alerts
            </label>
          </div>
        </header>
  
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr 320px",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div className="planned-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Planned drills</h3>
              {plannedParts.length === 0 && (
                <p style={{ fontSize: 13, color: "#475569" }}>
                  No planned drills. Add one below or start an empty drill.
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plannedParts.map(part => {
                  const label =
                    part.title ||
                    part.name ||
                    part.label ||
                    `Part ${part.id?.toString().slice(-4) || ""}`;
                  return (
                    <div
                      key={part.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 8,
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 12 }}>
                          Title
                          <input
                            className="schedule-input"
                            style={{ marginTop: 2 }}
                            value={part.title || ""}
                            onChange={e =>
                              updatePartField(part.id, "title", e.target.value)
                            }
                          />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          <label style={{ fontSize: 12 }}>
                            Minutes
                            <input
                              className="schedule-input"
                              style={{ marginTop: 2 }}
                              type="number"
                              min="0"
                              value={
                                part.plannedMin ??
                                part.minutes ??
                                part.plannedMinutes ??
                                ""
                              }
                              onChange={e =>
                                updatePartField(part.id, "plannedMin", e.target.value)
                              }
                            />
                          </label>
                          <label style={{ fontSize: 12 }}>
                            Intensity
                            <input
                              className="schedule-input"
                              style={{ marginTop: 2 }}
                              type="number"
                              min="0"
                              max="10"
                              value={
                                part.plannedIntensity ??
                                part.intensity ??
                                part.plannedLoad ??
                                ""
                              }
                              onChange={e =>
                                updatePartField(
                                  part.id,
                                  "plannedIntensity",
                                  e.target.value
                                )
                              }
                            />
                          </label>
                          <label style={{ fontSize: 12 }}>
                            Courts
                            <input
                              className="schedule-input"
                              style={{ marginTop: 2 }}
                              type="number"
                              min="0"
                              value={
                                part.plannedCourts ??
                                part.courts ??
                                part.plannedCourts ??
                                ""
                              }
                              onChange={e =>
                                updatePartField(
                                  part.id,
                                  "plannedCourts",
                                  e.target.value
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "space-between",
                          marginTop: 6,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startDrill(part)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #1d4ed8",
                            background: "#2563eb",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePart(part.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #fecaca",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={addPlannedDrill}
                style={{
                  marginTop: 12,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <h4 style={{ margin: 0 }}>Add planned drill</h4>
                <input
                  className="schedule-input"
                  placeholder="Drill name"
                  value={newPartForm.title}
                  onChange={e =>
                    setNewPartForm(form => ({ ...form, title: e.target.value }))
                  }
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <input
                    className="schedule-input"
                    type="number"
                    min="0"
                    placeholder="Minutes"
                    value={newPartForm.plannedMin}
                    onChange={e =>
                      setNewPartForm(form => ({
                        ...form,
                        plannedMin: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="schedule-input"
                    type="number"
                    min="0"
                    max="10"
                    placeholder="Intensity"
                    value={newPartForm.plannedIntensity}
                    onChange={e =>
                      setNewPartForm(form => ({
                        ...form,
                        plannedIntensity: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="schedule-input"
                    type="number"
                    min="0"
                    placeholder="Courts"
                    value={newPartForm.plannedCourts}
                    onChange={e =>
                      setNewPartForm(form => ({
                        ...form,
                        plannedCourts: e.target.value,
                      }))
                    }
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #10b981",
                    background: "#22c55e",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Add planned drill
                </button>
              </form>
              <button
                type="button"
                onClick={startEmptyDrill}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px dashed #cbd5f5",
                  background: "#f8fafc",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Start empty drill
              </button>
            </section>
  
            <section
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Roster</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roster.map(player => (
                  <div
                    key={player.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: 6,
                    }}
                  >
                    <input
                      className="schedule-input"
                      style={{ width: 60 }}
                      placeholder="No."
                      value={player.number || ""}
                      onChange={e =>
                        updateRosterPlayer(player.id, "number", e.target.value)
                      }
                    />
                    <input
                      className="schedule-input"
                      placeholder="Player name"
                      value={player.name}
                      onChange={e =>
                        updateRosterPlayer(player.id, "name", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeRosterPlayer(player.id)}
                      style={{
                        padding: "6px",
                        borderRadius: 6,
                        border: "1px solid #fecaca",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleAddRosterPlayer}
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <h4 style={{ margin: 0 }}>Add player</h4>
                <input
                  className="schedule-input"
                  placeholder="Name"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <input
                  className="schedule-input"
                  placeholder="Number"
                  value={newPlayerNumber}
                  onChange={e => setNewPlayerNumber(e.target.value)}
                />
                <button
                  type="submit"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #1d4ed8",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Add to roster
                </button>
              </form>
            </section>
          </div>
  
          <div
            className="active-drill"
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 16px rgba(15, 23, 42, 0.06)",
              minHeight: 420,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Active drill</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={handleWaterBreakToggle}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: waterBreak.isOn
                    ? "1px solid #bfdbfe"
                    : "1px solid #0ea5e9",
                  background: waterBreak.isOn ? "#e0f2fe" : "#38bdf8",
                  color: waterBreak.isOn ? "#0f172a" : "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {waterBreak.isOn ? "End water break" : "Start water break"}
              </button>
              {waterBreak.isOn && (
                <span style={{ fontSize: 13, color: "#2563eb" }}>
                  Break: {formatSeconds(breakElapsedSec)}
                </span>
              )}
            </div>
            {!activeDrill ? (
              <div style={{ color: "#475569", fontSize: 14 }}>
                No active drill at the moment. Start one from the planned list or
                from history.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>{activeDrill.name}</h3>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      Planned:{" "}
                      {activeDrill.plannedMin != null
                        ? `${activeDrill.plannedMin} min`
                        : "—"}{" "}
                      · Intensity{" "}
                      {activeDrill.plannedIntensity != null
                        ? activeDrill.plannedIntensity
                        : "—"}{" "}
                      · Courts{" "}
                      {activeDrill.plannedCourts != null
                        ? activeDrill.plannedCourts
                        : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggleMaster(activeDrill.id, true)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #16a34a",
                        background: "#22c55e",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Start both
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaster(activeDrill.id, false)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #f59e0b",
                        background: "#fbbf24",
                        color: "#0f172a",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Pause both
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTimer(activeDrill.id, "both")}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #93c5fd",
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reset both
                    </button>
                    <button
                      type="button"
                      onClick={() => endDrill(activeDrill.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #ef4444",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      End drill
                    </button>
                  </div>
                </div>
  
                <div className="timers" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div
                    className="timer-box"
                    style={{
                      flex: "1 1 160px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Total</h4>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>
                      {formatSeconds(getDrillDisplaySeconds(activeDrill, "total"))}
                    </div>
                    <div className="controls" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => toggleTimer(activeDrill.id, "total", true)}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTimer(activeDrill.id, "total", false)}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => resetTimer(activeDrill.id, "total")}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div
                    className="timer-box"
                    style={{
                      flex: "1 1 160px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Useful</h4>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>
                      {formatSeconds(getDrillDisplaySeconds(activeDrill, "useful"))}
                    </div>
                    <div className="controls" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => toggleTimer(activeDrill.id, "useful", true)}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTimer(activeDrill.id, "useful", false)}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => resetTimer(activeDrill.id, "useful")}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: "1 1 120px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Courts</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                      {activeDrill.courtsCount ?? 0}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => adjustCourts(activeDrill.id, -1)}>
                        −
                      </button>
                      <button type="button" onClick={() => adjustCourts(activeDrill.id, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
  
                <section>
                  <h3>Players</h3>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {roster.map(player => {
                      const key = String(player.id);
                      const selected = !!(activeDrill.perPlayer && activeDrill.perPlayer[key]);
                      return (
                        <label
                          key={player.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 13,
                            background: selected ? "#dbeafe" : "#fff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePlayerInDrill(activeDrill.id, key)}
                            style={{ marginRight: 6 }}
                          />
                          {player.number ? `#${player.number} ` : ""}
                          {player.name}
                        </label>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {activeDrill.perPlayer &&
                      Object.entries(activeDrill.perPlayer).map(([pid, pdata]) => {
                        const playerInfo = roster.find(
                          r => String(r.id) === String(pid)
                        );
                        const limitExceeded = pdata.limitAlerted;
                        return (
                          <div
                            key={pid}
                            className="player-mini"
                            style={{
                              border: limitExceeded
                                ? "2px solid #ef4444"
                                : "1px solid #cbd5f5",
                              borderRadius: 10,
                              padding: 10,
                              background: "#f8fafc",
                              minWidth: 200,
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {playerInfo
                                ? `${playerInfo.name}${
                                    playerInfo.number
                                      ? ` (#${playerInfo.number})`
                                      : ""
                                  }`
                                : `Player ${pid}`}
                            </div>
                            <div style={{ fontSize: 13, color: "#475569" }}>
                              Total: {formatSeconds(pdata.totalSec)} | Useful:{" "}
                              {formatSeconds(pdata.usefulSec)}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginTop: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  togglePlayerTimer(activeDrill.id, pid, "total", true)
                                }
                              >
                                Total start
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  togglePlayerTimer(activeDrill.id, pid, "total", false)
                                }
                              >
                                Total pause
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDrill(activeDrill.id, drill => {
                                    const perPlayer = { ...(drill.perPlayer || {}) };
                                    const player = { ...perPlayer[pid] };
                                    player.totalSec = 0;
                                    player.runningTotal = false;
                                    perPlayer[pid] = player;
                                    return { ...drill, perPlayer };
                                  })
                                }
                              >
                                Total reset
                              </button>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginTop: 4,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  togglePlayerTimer(activeDrill.id, pid, "useful", true)
                                }
                              >
                                Useful start
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  togglePlayerTimer(activeDrill.id, pid, "useful", false)
                                }
                              >
                                Useful pause
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDrill(activeDrill.id, drill => {
                                    const perPlayer = { ...(drill.perPlayer || {}) };
                                    const player = { ...perPlayer[pid] };
                                    player.usefulSec = 0;
                                    player.runningUseful = false;
                                    player.limitAlerted = false;
                                    perPlayer[pid] = player;
                                    return { ...drill, perPlayer };
                                  })
                                }
                              >
                                Useful reset
                              </button>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              Courts: {pdata.courtsCount || 0}{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  incrementPlayerCourts(activeDrill.id, pid, -1)
                                }
                              >
                                −
                              </button>{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  incrementPlayerCourts(activeDrill.id, pid, 1)
                                }
                              >
                                +
                              </button>
                            </div>
                            <label style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                              Minutes limit
                              <input
                                type="number"
                                min="0"
                                className="schedule-input"
                                value={
                                  pdata.limits?.maxMin !== undefined
                                    ? pdata.limits.maxMin
                                    : ""
                                }
                                onChange={e =>
                                  updatePlayerLimit(
                                    activeDrill.id,
                                    pid,
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </section>
  
                <section className="bench-box" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
                  <h3 style={{ marginTop: 0 }}>Bench timer</h3>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {formatSeconds(activeDrill.bench?.sec)}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => toggleBench(activeDrill.id, true)}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBench(activeDrill.id, false)}
                    >
                      Pause
                    </button>
                    <button type="button" onClick={() => resetBench(activeDrill.id)}>
                      Reset
                    </button>
                  </div>
                  <label style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                    Alert after (min)
                    <input
                      type="number"
                      min="0"
                      className="schedule-input"
                      value={
                        activeDrill.bench?.alertAtSec
                          ? activeDrill.bench.alertAtSec / 60
                          : ""
                      }
                      onChange={e => setBenchAlert(activeDrill.id, e.target.value)}
                    />
                  </label>
                  {activeDrill.bench?.alertTriggered && (
                    <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
                      Alert reached!
                    </div>
                  )}
                </section>
  
                <section>
                  <h3>Notes</h3>
                  <textarea
                    className="schedule-textarea"
                    style={{ width: "100%" }}
                    value={activeDrill.notes || ""}
                    onChange={e => setDrillNotes(activeDrill.id, e.target.value)}
                  />
                </section>
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Session summary</h3>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  aria-label="Export PDF"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #1d4ed8",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Export PDF
                </button>
              </div>
              {sessionSummaries.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Finished drills and breaks will appear here.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sessionSummaries.map(summary => {
                    const isBreak = summary.kind === "break";
                    const editState = summaryEdits[summary.id];
                    const isEditing = !!editState;
                    const displayTitle = isEditing
                      ? editState.title
                      : summary.title || (isBreak ? "Water break" : "Drill");
                    return (
                      <div
                        key={summary.id}
                        className="summary-card"
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: 12,
                          background: "#f8fafc",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          {isEditing ? (
                            <input
                              value={editState.title}
                              onChange={e =>
                                updateSummaryEditField(summary.id, "title", e.target.value)
                              }
                              className="schedule-input"
                              placeholder={isBreak ? "Break title" : "Drill title"}
                              style={{ minWidth: 180 }}
                            />
                          ) : (
                            <span
                              style={{
                                fontWeight: 600,
                                background: isBreak ? "#e0f2fe" : "#e2e8f0",
                                borderRadius: 999,
                                padding: "2px 10px",
                              }}
                            >
                              {displayTitle}
                            </span>
                          )}
                          <div className="summary-actions" style={{ display: "flex", gap: 8 }}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveSummaryEdit(summary.id)}
                                  aria-label="Save changes"
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #16a34a",
                                    background: "#22c55e",
                                    color: "#fff",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelEditSummary(summary.id)}
                                  aria-label="Cancel changes"
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #facc15",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEditSummary(summary)}
                                aria-label="Edit drill"
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #93c5fd",
                                  background: "#dbeafe",
                                  color: "#1d4ed8",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {!isBreak && (
                              <button
                                type="button"
                                onClick={() => resumeSummary(summary)}
                                aria-label="Resume drill"
                                disabled={isEditing}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #0ea5e9",
                                  background: isEditing ? "#e2e8f0" : "#38bdf8",
                                  color: "#0f172a",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: isEditing ? "not-allowed" : "pointer",
                                  opacity: isEditing ? 0.6 : 1,
                                }}
                              >
                                Resume
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSummary(summary.id)}
                              aria-label="Delete summary"
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "#fee2e2",
                                color: "#b91c1c",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {!isBreak && (
                              <label style={{ fontSize: 12 }}>
                                Courts
                                <input
                                  type="number"
                                  min="0"
                                  className="schedule-input"
                                  value={editState.courts}
                                  onChange={e =>
                                    updateSummaryEditField(
                                      summary.id,
                                      "courts",
                                      e.target.value
                                    )
                                  }
                                  style={{ marginTop: 2 }}
                                />
                              </label>
                            )}
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                              }}
                            >
                              <div className="time-inline" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#475569" }}>Start</span>
                                <input
                                  value={editState.startHour}
                                  onChange={e =>
                                    updateSummaryTimeField(
                                      summary.id,
                                      "startHour",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    normalizeSummaryTimeField(summary.id, "startHour")
                                  }
                                  className="schedule-input"
                                  style={{ width: 44 }}
                                  aria-label="Start hour"
                                />
                                <span>:</span>
                                <input
                                  value={editState.startMinute}
                                  onChange={e =>
                                    updateSummaryTimeField(
                                      summary.id,
                                      "startMinute",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    normalizeSummaryTimeField(summary.id, "startMinute")
                                  }
                                  className="schedule-input"
                                  style={{ width: 44 }}
                                  aria-label="Start minute"
                                />
                              </div>
                              <div className="time-inline" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "#475569" }}>End</span>
                                <input
                                  value={editState.endHour}
                                  onChange={e =>
                                    updateSummaryTimeField(
                                      summary.id,
                                      "endHour",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    normalizeSummaryTimeField(summary.id, "endHour")
                                  }
                                  className="schedule-input"
                                  style={{ width: 44 }}
                                  aria-label="End hour"
                                />
                                <span>:</span>
                                <input
                                  value={editState.endMinute}
                                  onChange={e =>
                                    updateSummaryTimeField(
                                      summary.id,
                                      "endMinute",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    normalizeSummaryTimeField(summary.id, "endMinute")
                                  }
                                  className="schedule-input"
                                  style={{ width: 44 }}
                                  aria-label="End minute"
                                />
                              </div>
                            </div>
                            <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                              Notes
                              <textarea
                                rows={2}
                                className="schedule-textarea"
                                value={editState.note}
                                onChange={e =>
                                  updateSummaryEditField(summary.id, "note", e.target.value)
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#475569",
                                display: "flex",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              <span>Total {fmtDuration(summary.totalMs)}</span>
                              <span>Useful {fmtDuration(summary.usefulMs)}</span>
                              {!isBreak && <span>Courts {summary.courts ?? 0}</span>}
                              <span>
                                {fmtTime(summary.startedAt)} — {fmtTime(summary.endedAt)}
                              </span>
                            </div>
                            {summary.note ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#334155",
                                  background: "#fff",
                                  borderRadius: 8,
                                  padding: 8,
                                  border: "1px solid #e2e8f0",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {summary.note}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        <div
          className="history-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <section
            className="survey-card"
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>משוב RPE לשחקניות</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                onClick={handleOpenSurvey}
                disabled={!surveyUrl}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: surveyUrl ? "pointer" : "not-allowed",
                }}
              >
                פתח טופס לשחקניות
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!surveyUrl}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5f5",
                  background: "#f8fafc",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  cursor: surveyUrl ? "pointer" : "not-allowed",
                }}
              >
                העתק קישור
              </button>
            </div>
            {toastMessage && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#0f766e",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {toastMessage}
              </div>
            )}
            <div style={{ fontSize: 14, color: "#334155", marginBottom: 8 }}>
              {totalPlayers
                ? `הושלמו ${submittedCount} מתוך ${totalPlayers}`
                : submittedNames.length
                ? `התקבלו ${submittedNames.length} משובים`
                : "אין עדיין משובים"}
            </div>
            {submissionEntries.length > 0 && summaryAverages.avgRpe !== null && (
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 10 }}>
                ממוצע RPE: <strong>{summaryAverages.avgRpe}</strong> · ממוצע רגליים: <strong>{summaryAverages.avgLegs}</strong>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {summaryRosterNames.map(name => {
                const submitted = !!sessionSurveyRecords[name];
                return (
                  <div key={name} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{submitted ? "✔" : "⏳"}</span>
                    <span>{name}</span>
                  </div>
                );
              })}
              {extraSubmitters.length > 0 && rosterPlayerNames.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  משובים נוספים: {extraSubmitters.join(", ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={quickRosterName}
                onChange={e => setQuickRosterName(e.target.value)}
                placeholder="הוסיפי שם לרשימה"
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #cbd5f5",
                  background: "#fff",
                }}
              />
              <button
                type="button"
                onClick={handleQuickAddName}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #10b981",
                  background: "#22c55e",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                הוסיפי
              </button>
            </div>
          </section>
          <section
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
            }}
          >
              <h3 style={{ marginTop: 0 }}>Drill history</h3>
              {history.length === 0 ? (
                <p style={{ fontSize: 13, color: "#475569" }}>No drills yet.</p>
              ) : (
                history.map(drill => (
                  <div
                    key={drill.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 8,
                      background: drill.isActive ? "#dbeafe" : "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{drill.name}</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          Total {formatSeconds(drill.totalSec)} · Useful{" "}
                          {formatSeconds(drill.usefulSec)} · Courts{" "}
                          {drill.courtsCount ?? "—"}
                        </div>
                        {drill.startedAt && (
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            Started {new Date(drill.startedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => reactivateDrill(drill.id)}
                        >
                          Reactivate
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDrill(drill.id)}
                          style={{
                            borderColor: "#fecaca",
                            background: "#fee2e2",
                            color: "#b91c1c",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="schedule-textarea"
                      style={{ width: "100%", marginTop: 6 }}
                      value={drill.notes || ""}
                      onChange={e => setDrillNotes(drill.id, e.target.value)}
                    />
                  </div>
                ))
              )}
            </section>
  
            <section
              className="survey-card"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Session survey</h3>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ borderBottom: "1px solid #e2e8f0", padding: 6, textAlign: "left" }}>
                        Player
                      </th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", padding: 6 }}>RPE</th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", padding: 6 }}>Legs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {survey?.players?.map(player => (
                      <tr key={player.id}>
                        <td style={{ borderBottom: "1px solid #e2e8f0", padding: 6 }}>
                          {player.name}
                        </td>
                        <td style={{ borderBottom: "1px solid #e2e8f0", padding: 6, textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={player.rpe ?? 0}
                            onChange={e =>
                              updateSurveyPlayer(player.id, "rpe", e.target.value)
                            }
                            style={{ width: 60 }}
                          />
                        </td>
                        <td style={{ borderBottom: "1px solid #e2e8f0", padding: 6, textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={player.legs ?? 0}
                            onChange={e =>
                              updateSurveyPlayer(player.id, "legs", e.target.value)
                            }
                            style={{ width: 60 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
                Averages — RPE: <strong>{averages.rpe}</strong>, Legs:{" "}
                <strong>{averages.legs}</strong>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={saveSurvey}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #1d4ed8",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save survey
                </button>
                {survey?.savedAt && (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Last saved {new Date(survey.savedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }
  
