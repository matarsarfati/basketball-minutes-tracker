// src/SchedulePlanner.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RosterManager from './RosterManager';
import { scheduleService } from './services/scheduleService';
import { practiceDataService } from './services/practiceDataService';
import FilterComponent from './FilterComponent';
import { exportScheduleToPDF, countSessionsInRange } from './services/scheduleExportService';
import DateRangeModal from './components/DateRangeModal';

const STORAGE_KEY_V1 = "teamScheduleV1";
const STORAGE_KEY_V2 = "teamScheduleV2";

const TYPES = [
  "Practice",
  "Game",
  "DayOff",
  "SplitPractice",
  "Meeting",
  "Recovery",
  "Travel",
];

const TYPE_COLORS = {
  Practice: { color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" },
  Game: { color: "#dc2626", background: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.45)" },
  DayOff: { color: "#10b981", background: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" }, // Changed to green
  SplitPractice: { color: "#f97316", background: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)" },
  Meeting: { color: "#3b82f6", background: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)" },
  Recovery: { color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" },
  Travel: { color: "#8b5cf6", background: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)" },
  Default: { color: "#475569", background: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.35)" },
};

const SLOT_OPTIONS = ["AM", "PM"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const globalStyles = `
  .schedule-input,
  .schedule-select,
  .schedule-textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #cbd5f5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
    background-color: #fff;
  }

  .schedule-select {
    background-position: right 10px center;
  }

  .schedule-textarea {
    min-height: 88px;
    resize: vertical;
  }

  .schedule-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .schedule-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.32);
    display: flex;
    justify-content: flex-end;
    z-index: 999;
  }

  .schedule-drawer {
    width: 380px;
    max-width: 92vw;
    background: #ffffff;
    padding: 24px;
    overflow-y: auto;
    box-shadow: -12px 0 24px rgba(15, 23, 42, 0.12);
  }

  .schedule-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 8px;
  }

  .schedule-part-table {
    width: 100%;
    border-collapse: collapse;
  }

  .schedule-part-table th,
  .schedule-part-table td {
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    text-align: left;
    font-size: 13px;
  }

  .schedule-quick-button {
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid #cbd5f5;
    background: #f8fafc;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .schedule-quick-button:hover {
    background: #e2e8f0;
  }

  .cal-tile {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    gap: 2px;
    width: 100%;
    min-height: 52px;
    text-align: left;
    border: 1px solid var(--tile-accent, transparent);
  }

  .cal-tile-row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .cal-time {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 500;
  }

  .cal-badge {
    flex: 0 1 auto;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cal-title {
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }

  .cal-stats {
    font-size: 10px;
    color: var(--tile-accent, #475569);
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: auto;
    overflow: hidden;
    opacity: 0.9;
  }

  .details-stat__input {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    width: 80px;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 4px;
    background: transparent;
  }

  .details-stat__input:hover {
    border-bottom-color: #cbd5e1;
  }

  .details-stat__input:focus {
    outline: none;
    border-bottom-color: #3b82f6;
  }

  .details-stat__unit {
    font-size: 14px;
    color: #6b7280;
    margin-left: 4px;
  }
`;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isValidTimeString = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseISODateToUTC = dateStr => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatUTCDateToISO = date => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createUTCDate = (year, month, day) => new Date(Date.UTC(year, month, day));

const startOfMonthUTC = date => createUTCDate(date.getUTCFullYear(), date.getUTCMonth(), 1);

const endOfMonthUTC = date => createUTCDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);

const addMonthsUTC = (date, months) =>
  startOfMonthUTC(createUTCDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

const toISODate = date => formatUTCDateToISO(date);

const addDaysToISO = (isoString, days) => {
  if (!isoString) return "";
  const date = parseISODateToUTC(isoString);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUTCDateToISO(date);
};

const getCurrentMonthRange = () => {
  const today = parseISODateToUTC(getTodayISO());
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(monthStart);
  return {
    startDate: monthStart,
    endDate: monthEnd,
    startISO: toISODate(monthStart),
    endISO: toISODate(monthEnd),
  };
};

const getMonthDays = activeDate => {
  // Find today's date in UTC
  const today = parseISODateToUTC(getTodayISO());
  
  // Find the Sunday that starts the week containing today
  const currentWeekSunday = createUTCDate(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - today.getUTCDay()
  );
  
  // Go back 2 weeks (14 days) from the start of current week
  const startDate = createUTCDate(
    currentWeekSunday.getUTCFullYear(),
    currentWeekSunday.getUTCMonth(),
    currentWeekSunday.getUTCDate() - 14
  );
  
  const startISO = toISODate(startDate);
  const days = [];
  
  // Generate 42 days (6 weeks) starting from 2 weeks before current week
  for (let index = 0; index < 42; index += 1) {
    const iso = index === 0 ? startISO : addDaysToISO(startISO, index);
    days.push(parseISODateToUTC(iso));
  }
  
  return days;
};

const isSameDay = (dateA, dateB) =>
  dateA.getUTCFullYear() === dateB.getUTCFullYear() &&
  dateA.getUTCMonth() === dateB.getUTCMonth() &&
  dateA.getUTCDate() === dateB.getUTCDate();

const isToday = date => toISODate(date) === getTodayISO();

const isSameMonth = (date, reference) => date.getUTCMonth() === reference.getUTCMonth();

const formatDayNum = date => `${date.getUTCDate()}`;

const formatMonthLabel = date =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);

const formatTime = value => (isValidTimeString(value) ? value : "--:--");

const formatMonthShort = date =>
  new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);

const formatTypeLabel = type => {
  if (!type) return "";
  return String(type).replace(/([a-z])([A-Z])/g, "$1 $2");
};

const paletteForType = type => TYPE_COLORS[type] || TYPE_COLORS.Default;

const noop = () => {};

const splitISOToParts = iso => {
  if (!iso || typeof iso !== "string" || iso.length < 8) {
    return { day: "", month: "", year: "" };
  }
  const [year = "", month = "", day = ""] = iso.split("-");
  return {
    day: day.slice(0, 2),
    month: month.slice(0, 2),
    year: year.slice(0, 4),
  };
};

const combineDateParts = ({ day = "", month = "", year = "" }) => {
  if (day.length === 2 && month.length === 2 && year.length === 4) {
    return `${year}-${month}-${day}`;
  }
  return "";
};

const areDatePartsEmpty = ({ day = "", month = "", year = "" }) => !day && !month && !year;

const splitTimeToParts = time => {
  if (!time || typeof time !== "string" || time.length < 4) {
    return { hour: "", minute: "" };
  }
  const [hour = "", minute = ""] = time.split(":");
  return {
    hour: hour.slice(0, 2),
    minute: minute.slice(0, 2),
  };
};

const combineTimeParts = ({ hour = "", minute = "" }) => {
  if (hour.length === 2 && minute.length === 2) {
    return `${hour}:${minute}`;
  }
  if (!hour && !minute) return "";
  return "";
};

const AUTO_ADVANCE_RANGES = {
  hour: { min: 0, max: 23, length: 2 },
  minute: { min: 0, max: 59, length: 2 },
  day: { min: 1, max: 31, length: 2 },
  month: { min: 1, max: 12, length: 2 },
  year: { min: 0, max: 9999, length: 4 },
};

const sanitizeAutoValue = (rawValue, meta) => {
  if (!rawValue) return "";
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const trimmed = digitsOnly.slice(0, meta.maxLength);
  if (trimmed.length < meta.maxLength) {
    return trimmed;
  }
  const range = AUTO_ADVANCE_RANGES[meta.type];
  if (!range) return trimmed;
  let numeric = Number(trimmed);
  if (Number.isNaN(numeric)) return trimmed;
  if (numeric < range.min) numeric = range.min;
  if (numeric > range.max) numeric = range.max;
  return String(numeric).padStart(meta.maxLength, "0");
};

const setupAutoAdvance = (root, configRef) => {
  console.log('setupAutoAdvance called with root:', root?.tagName);

  if (!root) {
    console.warn('No root element provided to setupAutoAdvance');
    return () => {};
  }

  const InputEvt = typeof InputEvent === "undefined" ? null : InputEvent;

  const focusField = fieldId => {
    if (!fieldId) return;
    const next = root.querySelector(`[data-auto-field="${fieldId}"]`);
    if (next && typeof next.focus === "function") {
      const focusAction = () => {
        next.focus({ preventScroll: true });
        if (typeof next.select === "function") {
          next.select();
        }
      };
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(focusAction);
      } else {
        focusAction();
      }
    }
  };

  const handleInput = event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    console.log('handleInput triggered:', {
      id: target.id,
      value: target.value
    });

    const fieldId = target.dataset.autoField;
    console.log('fieldId from dataset:', fieldId);

    const currentConfig = configRef.current;
    if (!currentConfig) {
      console.warn('No current config found');
      return;
    }

    const fieldMeta = currentConfig.fields[fieldId];
    console.log('fieldMeta found:', fieldMeta);

    const inputEvent = InputEvt && event instanceof InputEvt ? event : null;
    if (inputEvent?.data === ":" && fieldMeta.type === "hour") {
      if (fieldMeta.nextFieldId) {
        focusField(fieldMeta.nextFieldId);
      }
      return;
    }

    const sanitized = sanitizeAutoValue(target.value, fieldMeta);
    if (sanitized !== fieldMeta.value) {
      fieldMeta.setter(sanitized);
    } else if (sanitized !== target.value) {
      target.value = sanitized;
    }

    if (sanitized.length === fieldMeta.maxLength && fieldMeta.nextFieldId) {
      focusField(fieldMeta.nextFieldId);
    }
  };

  const handlePaste = event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const fieldId = target.dataset.autoField;
    if (!fieldId) return;
    const currentConfig = configRef.current;
    if (!currentConfig) return;
    const fieldMeta = currentConfig.fields[fieldId];
    if (!fieldMeta) return;

    const clipboardText = event.clipboardData?.getData("text") || "";
    const digits = clipboardText.replace(/\D/g, "");
    if (!digits) return;

    const groupFields = fieldMeta.group
      ? currentConfig.groups[fieldMeta.group] || []
      : [fieldId];
    if (!groupFields.length) return;
    const startIndex = fieldMeta.group ? groupFields.indexOf(fieldId) : 0;
    if (startIndex === -1) return;

    event.preventDefault();

    let cursor = 0;
    let lastFilled = null;

    for (let index = startIndex; index < groupFields.length && cursor < digits.length; index += 1) {
      const scopedId = groupFields[index];
      const meta = currentConfig.fields[scopedId];
      if (!meta) continue;
      const slice = digits.slice(cursor, cursor + meta.maxLength);
      cursor += meta.maxLength;
      if (!slice) {
        meta.setter("");
        lastFilled = { ...meta, sanitizedLength: 0 };
        continue;
      }
      const sanitizedChunk = sanitizeAutoValue(slice, meta);
      meta.setter(sanitizedChunk);
      lastFilled = { ...meta, sanitizedLength: sanitizedChunk.length };
    }

    if (lastFilled) {
      if (lastFilled.sanitizedLength === lastFilled.maxLength && lastFilled.nextFieldId) {
        focusField(lastFilled.nextFieldId);
      } else if (lastFilled.id) {
        focusField(lastFilled.id);
      }
    }
  };

  console.log('Adding event listeners to:', root.tagName);
  root.addEventListener("input", handleInput);
  root.addEventListener("paste", handlePaste);

  return () => {
    root.removeEventListener("input", handleInput);
    root.removeEventListener("paste", handlePaste);
  };
};

const slotOf = value => {
  if (!value || !isValidTimeString(value)) return "AM";
  const [hour] = value.split(":");
  return Number(hour) >= 12 ? "PM" : "AM";
};


const normalizeTimeInput = value => {
  if (!value) return "";
  if (isValidTimeString(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 4) {
    const hours = digits.slice(0, 2);
    const minutes = digits.slice(2, 4);
    const candidate = `${hours}:${minutes}`;
    if (isValidTimeString(candidate)) return candidate;
  }
  return value;
};

const formatDisplayDate = iso => {
  if (!iso) return "";
  const date = parseISODateToUTC(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatDisplayDateTime = (iso, time) => {
  if (!iso) return "";
  const base = parseISODateToUTC(iso);
  if (isValidTimeString(time)) {
    const [hours, minutes] = time.split(":").map(Number);
    base.setUTCHours(hours, minutes, 0, 0);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "UTC",
  }).format(base);
};

const getSessionMetrics = session => {
  const totals = calcTotalsFromParts(session.parts || []);
  const totalMinutes =
    session.totalMinutes !== "" && session.totalMinutes !== null
      ? Number(session.totalMinutes)
      : totals.totalMinutes;
  const highMinutes =
    session.highIntensityMinutes !== "" && session.highIntensityMinutes !== null
      ? Number(session.highIntensityMinutes)
      : totals.highIntensityMinutes;
  const courts =
    session.courts !== "" && session.courts !== null && session.courts !== undefined
      ? Number(session.courts)
      : 0;
  const rpeCourtPlanned = 
    session.rpeCourtPlanned !== "" && session.rpeCourtPlanned !== null 
      ? Number(session.rpeCourtPlanned)
      : 0;
  const rpeGymPlanned = 
    session.rpeGymPlanned !== "" && session.rpeGymPlanned !== null 
      ? Number(session.rpeGymPlanned)
      : 0;
  return {
    totalMinutes,
    highMinutes,
    courts,
    rpeCourtPlanned,
    rpeGymPlanned
  };
};

const toTimestamp = (date, time) => {
  if (!date) return 0;
  const safeTime = isValidTimeString(time) ? time : "00:00";
  return Date.parse(`${date}T${safeTime}:00`);
};

const getTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calcTotalsFromParts = parts => {
  return parts.reduce(
    (acc, part) => {
      const minutes = Number(part.minutes) || 0;
      acc.totalMinutes += minutes;
      if (part.highIntensity) acc.highIntensityMinutes += minutes;
      return acc;
    },
    { totalMinutes: 0, highIntensityMinutes: 0 }
  );
};

const emptySession = (date = "", slot = "AM") => ({
  id: createId(),
  date,
  slot,
  startTime: "",
  type: "Practice",
  title: "",
  location: "",
  notes: "",
  courts: "",
  totalMinutes: 0,
  highIntensityMinutes: 0,
  rpeCourtPlanned: 0,  // Added
  rpeGymPlanned: 0,    // Added
  parts: [],
});

const legacyToSession = (legacy, index = 0) => {
  const slot = "AM";
  const legacyTime =
    typeof legacy.time === "string" && isValidTimeString(legacy.time) ? legacy.time : "08:00";
  const type = TYPES.includes(legacy.type) ? legacy.type : "Practice";
  return {
    ...emptySession(legacy.date || "", slot),
    id: legacy.id ? String(legacy.id) : `legacy-${Date.now()}-${index}`,
    startTime: legacyTime,
    type,
    title: legacy.title || "",
    location: legacy.location || "",
    notes: legacy.notes || "",
  };
};

const loadLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_V2);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    // Try legacy storage
    const legacyStored = localStorage.getItem(STORAGE_KEY_V1);
    if (!legacyStored) return [];
    const legacy = JSON.parse(legacyStored);
    if (!Array.isArray(legacy)) return [];
    return legacy.map(legacyToSession);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

export default function SchedulePlanner() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false); // Add this line
  const [isSyncing, setIsSyncing] = useState(false);
  const currentMonth = useMemo(() => getCurrentMonthRange(), []);
  const [fromDate, setFromDate] = useState(currentMonth.startISO);
  const [toDate, setToDate] = useState(currentMonth.endISO);
  const [fromInput, setFromInput] = useState(currentMonth.startISO);
  const [toInput, setToInput] = useState(currentMonth.endISO);
  const [viewMonth, setViewMonth] = useState(currentMonth.startDate);
  const [editorSessionId, setEditorSessionId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [trainingExpanded, setTrainingExpanded] = useState(true);
  const [newSessionForm, setNewSessionForm] = useState({
    date: "",
    slot: "AM",
    startTime: "",
    type: "Practice",
  });
  const [fromParts, setFromParts] = useState(() => splitISOToParts(currentMonth.startISO));
  const [toParts, setToParts] = useState(() => splitISOToParts(currentMonth.endISO));
  const [newDateParts, setNewDateParts] = useState(() => splitISOToParts(""));
  const [newTimeParts, setNewTimeParts] = useState(() => splitTimeToParts(""));
  const [editorTimeParts, setEditorTimeParts] = useState(() => splitTimeToParts(""));
  const autoAdvanceConfigRef = useRef({ fields: {}, groups: {} });

  const schedulePageRef = useRef(null);
  const startTimeInputRef = useRef(null);
  const editorSessionIdRef = useRef(null);

  // Add a ref for the "Add Session" form container
  const addFormRef = useRef(null);

  // Load sessions from Firebase on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const firebaseSessions = await scheduleService.getScheduleEvents();
        console.log('Loaded sessions:', firebaseSessions.map(s => ({ 
          id: s.id, 
          firebaseId: s.firebaseId,
          date: s.date 
        })));
        setSessions(firebaseSessions);
      } catch (error) {
        console.error('Failed to load from Firebase:', error);
        // Fall back to localStorage
        const localSessions = loadLocalStorage();
        setSessions(localSessions);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, []);

  // Sync to localStorage as backup
  useEffect(() => {
    if (!sessions.length) return;
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(sessions));
  }, [sessions]);

  const updateFromPart = useCallback(
    (part, value) => {
      setFromParts(prev => {
        if (prev[part] === value) return prev;
        const next = { ...prev, [part]: value };
        const iso = combineDateParts(next);
        setFromInput(iso);
        return next;
      });
    },
    [setFromInput]
  );

  const updateToPart = useCallback(
    (part, value) => {
      setToParts(prev => {
        if (prev[part] === value) return prev;
        const next = { ...prev, [part]: value };
        const iso = combineDateParts(next);
        setToInput(iso);
        return next;
      });
    },
    [setToInput]
  );

  const updateNewDatePart = useCallback(
    (part, value) => {
      setNewDateParts(prev => {
        if (prev[part] === value) return prev;
        const next = { ...prev, [part]: value };
        const iso = combineDateParts(next);
        setNewSessionForm(prevForm => ({ ...prevForm, date: iso }));
        return next;
      });
    },
    [setNewSessionForm]
  );

  const updateNewTimePart = useCallback(
    (part, value) => {
      setNewTimeParts(prev => {
        if (prev[part] === value) return prev;
        const next = { ...prev, [part]: value };
        const timeValue = combineTimeParts(next);
        setNewSessionForm(prevForm => ({ ...prevForm, startTime: timeValue }));
        return next;
      });
    },
    [setNewSessionForm]
  );

  const mutateSession = async (sessionId, mutator) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (!session) return prev;

      const updated = mutator(session);
      const updatedSessions = prev.map(existing => 
        existing.id !== sessionId ? existing : updated
      );

      // Sync to Firebase
      if (session.firebaseId) {
        scheduleService.updateScheduleEvent(session.firebaseId, updated)
          .catch(error => {
            console.error('Failed to update session in Firebase:', error);
            // Consider rolling back the change here
          });
      }

      return updatedSessions;
    });
  };

  const addPart = sessionId => {
    mutateSession(sessionId, session => ({
      ...session,
      parts: [
        ...session.parts,
        {
          id: createId(),
          label: "",
          minutes: 0,
          notes: "",
          highIntensity: false,
        },
      ],
    }));
  };

  const monthDays = useMemo(() => getMonthDays(viewMonth), [viewMonth]);

  // New useMemo for unfiltered sessions (for calendar display)
  const calendarSessions = useMemo(() => {
    const slotOrder = new Map(SLOT_OPTIONS.map((slot, index) => [slot, index]));
    return [...sessions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const slotCompare = (slotOrder.get(a.slot) ?? 0) - (slotOrder.get(b.slot) ?? 0);
      if (slotCompare !== 0) return slotCompare;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [sessions]);

  // Keep existing visibleSessions for filtered data (exports/reports)
  const visibleSessions = useMemo(() => {
    const slotOrder = new Map(SLOT_OPTIONS.map((slot, index) => [slot, index]));
    return [...sessions]
      .filter(session => {
        if (!session.date) return false;
        const fromPass = !fromDate || session.date >= fromDate;
        const toPass = !toDate || session.date <= toDate;
        return fromPass && toPass;
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const slotCompare = (slotOrder.get(a.slot) ?? 0) - (slotOrder.get(b.slot) ?? 0);
        if (slotCompare !== 0) return slotCompare;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
  }, [sessions, fromDate, toDate]);

  // Update sessionsByDate to use calendarSessions instead of visibleSessions
  const sessionsByDate = useMemo(() => {
    const map = new Map();
    calendarSessions.forEach(session => {
      if (!map.has(session.date)) {
        map.set(session.date, []);
      }
      map.get(session.date).push(session);
    });
    return map;
  }, [calendarSessions]); // Changed dependency from visibleSessions to calendarSessions

  const openEditor = sessionId => {
    setSelectedSessionId(null);
    setEditorSessionId(sessionId);
  };

  const closeEditor = () => {
    setEditorSessionId(null);
  };

  const editorSession = useMemo(
    () => sessions.find(session => session.id === editorSessionId) || null,
    [sessions, editorSessionId]
  );

  const selectedSession = useMemo(
    () => sessions.find(session => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  useEffect(() => {
    if (selectedSessionId) {
      setTrainingExpanded(true);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    const nextId = editorSession ? editorSession.id : null;
    if (editorSessionIdRef.current !== nextId) {
      editorSessionIdRef.current = nextId;
      setEditorTimeParts(splitTimeToParts(editorSession?.startTime || ""));
    }
  }, [editorSession]);

  const setNewSessionFormValue = (field, value) => {
    let nextValue = value;
    if (field === "startTime") {
      nextValue = normalizeTimeInput(value);
      if (nextValue && !isValidTimeString(nextValue)) {
        return;
      }
      setNewTimeParts(splitTimeToParts(nextValue));
    }

    if (field === "date") {
      setNewDateParts(splitISOToParts(value));
    }
    setNewSessionForm(prev => ({ ...prev, [field]: nextValue }));
  };

  const goToMonth = monthDate => {
    const monthStart = startOfMonthUTC(monthDate);
    setViewMonth(monthStart);
    setSelectedSessionId(null);
    setTrainingExpanded(true);
  };

  const handlePrevMonth = () => {
    goToMonth(addMonthsUTC(viewMonth, -1));
  };

  const handleNextMonth = () => {
    goToMonth(addMonthsUTC(viewMonth, 1));
  };

  const handleToday = () => {
    const { startDate } = getCurrentMonthRange();
    goToMonth(startDate);
  };

  const handleApplyFilters = () => {
    const appliedFrom = combineDateParts(fromParts);
    if (!appliedFrom) {
      alert("Select a From date to apply the range.");
      return;
    }

    let appliedTo = combineDateParts(toParts);

    if (appliedTo && appliedTo < appliedFrom) {
      alert("'To' date must be after the 'From' date.");
      return;
    }

    const targetMonth = startOfMonthUTC(parseISODateToUTC(appliedFrom));
    const effectiveTo = appliedTo || toISODate(endOfMonthUTC(targetMonth));

    setFromDate(appliedFrom);
    setToDate(effectiveTo);
    setViewMonth(targetMonth);
    setFromInput(appliedFrom);
    setToInput(effectiveTo);
    setFromParts(splitISOToParts(appliedFrom));
    setToParts(splitISOToParts(effectiveTo));
  };

  const clearFilters = () => {
    const { startDate, startISO, endISO } = getCurrentMonthRange();
    setFromDate(startISO);
    setToDate(endISO);
    setFromInput(startISO);
    setToInput(endISO);
    setFromParts(splitISOToParts(startISO));
    setToParts(splitISOToParts(endISO));
    setViewMonth(startDate);
    setSelectedSessionId(null);
    setTrainingExpanded(true);
  };

  const scrollToAddForm = () => {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      window.requestAnimationFrame(() => {
        const form = document.getElementById("schedule-add-form");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const quickAddSession = dateISO => {
    setSelectedSessionId(null);
    setTrainingExpanded(true);
    setNewSessionForm(prev => ({
      ...prev,
      date: dateISO,
      startTime: "",
    }));
    setNewDateParts(splitISOToParts(dateISO));
    setNewTimeParts(splitTimeToParts(""));
    scrollToAddForm();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        startTimeInputRef.current?.focus({ preventScroll: true });
      });
    }
  };

  const prefillAddSession = (date, slot) => {
    setSelectedSessionId(null);
    setTrainingExpanded(true);
    setNewSessionForm(prev => ({
      ...prev,
      date,
      slot,
      startTime: "",
    }));
    setNewDateParts(splitISOToParts(date));
    setNewTimeParts(splitTimeToParts(""));
    scrollToAddForm();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        startTimeInputRef.current?.focus();
      });
    }
  };

  const addSession = async () => {
    const { date, slot, startTime, type } = newSessionForm;
    if (!date || !slot || !type) {
      alert("Please provide date, slot, and type.");
      return;
    }
    const normalizedStart = normalizeTimeInput(startTime);
    if (!normalizedStart || !isValidTimeString(normalizedStart)) {
      alert("Please provide a valid start time (HH:mm).");
      return;
    }
    const slotValue = slot || slotOf(normalizedStart);
    const exists = sessions.some(session => session.date === date && session.slot === slotValue);
    if (exists) {
      alert(`A ${slotValue} session already exists for ${date}.`);
      return;
    }

    const newSession = {
      ...emptySession(date, slotValue),
      startTime: normalizedStart,
      type,
    };

    try {
      const firebaseId = await scheduleService.addScheduleEvent(newSession);
      setSessions(prev => [...prev, { ...newSession, firebaseId }]);
      setNewSessionForm({ date: "", slot: "AM", startTime: "", type: "Practice" });
      setNewDateParts(splitISOToParts(""));
      setNewTimeParts(splitTimeToParts(""));
      setSelectedSessionId(newSession.id);
      setTrainingExpanded(true);
    } catch (error) {
      console.error('Failed to add session to Firebase:', error);
      alert('Failed to save session. Please try again.');
    }
  };

  const deleteSession = async (id) => {
    const target = sessions.find(session => session.id === id);
    if (!target) return;
    
    console.log('Deleting session:', { 
      id: target.id, 
      firebaseId: target.firebaseId,
      date: target.date 
    });
    
    const label = `${target.date} ${target.slot}`;
    if (!window.confirm(`Delete session ${label}? This will also delete all practice data (attendance, metrics, drills, surveys).`)) return;
  
    try {
      // Delete schedule event
      if (target.firebaseId) {
        console.log('Deleting from Firebase:', target.firebaseId);
        await scheduleService.deleteScheduleEvent(target.firebaseId);
      } else {
        console.warn('No firebaseId found for session:', target.id);
      }
      
      // Delete associated practice data
      try {
        await practiceDataService.deletePracticeData(id);
        console.log('Practice data deleted for session:', id);
      } catch (practiceError) {
        console.error('Failed to delete practice data:', practiceError);
        // Continue with session deletion even if practice data fails
      }
      
      // Clean up localStorage
      localStorage.removeItem(`practiceData_${id}`);
      localStorage.removeItem(`attendance_${id}`);
      localStorage.removeItem(`summaries_${id}`);
      localStorage.removeItem(`surveyPlayers_${id}`);
      
      setSessions(prev => prev.filter(session => session.id !== id));
      setSelectedSessionId(prev => (prev === id ? null : prev));
      if (editorSessionId === id) {
        closeEditor();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const updateSessionField = (sessionId, field, value) => {
    mutateSession(sessionId, session => {
      let parsedValue = value;

      if (['courts', 'totalMinutes', 'highIntensityMinutes'].includes(field)) {
        parsedValue = value === '' ? 0 : Math.max(0, Number(value));
      }

      if (field === 'rpeCourtPlanned' || field === 'rpeGymPlanned') {
        parsedValue = value === '' ? 0 : Math.min(10, Math.max(0, Number(value)));
      }

      console.log('Updating session field:', {
        field,
        rawValue: value,
        parsedValue,
        sessionId
      });

      const updatedSession = {
        ...session,
        [field]: parsedValue,
      };

      practiceDataService.syncSessionToPracticeLive(sessionId, updatedSession)
        .catch(error => console.error('Failed to sync update:', error));

      return updatedSession;
    });
  };

  const updateEditorTimePart = useCallback(
    (part, value) => {
      setEditorTimeParts(prev => {
        if (prev[part] === value) return prev;
        const next = { ...prev, [part]: value };
        if (editorSession) {
          if (!next.hour && !next.minute) {
            updateSessionField(editorSession.id, "startTime", "");
          } else if (next.hour.length === 2 && next.minute.length === 2) {
            updateSessionField(editorSession.id, "startTime", `${next.hour}:${next.minute}`);
          }
        }
        return next;
      });
    },
    [editorSession, updateSessionField]
  );

  useEffect(() => {
    const fields = {
      "filter-from-day": {
        id: "filter-from-day",
        type: "day",
        maxLength: 2,
        group: "filter-from-date",
        order: 0,
        nextFieldId: "filter-from-month",
        value: fromParts.day,
        setter: value => updateFromPart("day", value),
      },
      "filter-from-month": {
        id: "filter-from-month",
        type: "month",
        maxLength: 2,
        group: "filter-from-date",
        order: 1,
        nextFieldId: "filter-from-year",
        value: fromParts.month,
        setter: value => updateFromPart("month", value),
      },
      "filter-from-year": {
        id: "filter-from-year",
        type: "year",
        maxLength: 4,
        group: "filter-from-date",
        order: 2,
        nextFieldId: null,
        value: fromParts.year,
        setter: value => updateFromPart("year", value),
      },
      "filter-to-day": {
        id: "filter-to-day",
        type: "day",
        maxLength: 2,
        group: "filter-to-date",
        order: 0,
        nextFieldId: "filter-to-month",
        value: toParts.day,
        setter: value => updateToPart("day", value),
      },
      "filter-to-month": {
        id: "filter-to-month",
        type: "month",
        maxLength: 2,
        group: "filter-to-date",
        order: 1,
        nextFieldId: "filter-to-year",
        value: toParts.month,
        setter: value => updateToPart("month", value),
      },
      "filter-to-year": {
        id: "filter-to-year",
        type: "year",
        maxLength: 4,
        group: "filter-to-date",
        order: 2,
        nextFieldId: null,
        value: toParts.year,
        setter: value => updateToPart("year", value),
      },
      "add-date-day": {
        id: "add-date-day",
        type: "day",
        maxLength: 2,
        group: "add-date",
        order: 0,
        nextFieldId: "add-date-month",
        value: newDateParts.day,
        setter: value => updateNewDatePart("day", value),
      },
      "add-date-month": {
        id: "add-date-month",
        type: "month",
        maxLength: 2,
        group: "add-date",
        order: 1,
        nextFieldId: "add-date-year",
        value: newDateParts.month,
        setter: value => updateNewDatePart("month", value),
      },
      "add-date-year": {
        id: "add-date-year",
        type: "year",
        maxLength: 4,
        group: "add-date",
        order: 2,
        nextFieldId: "add-time-hour", // Link date to time inputs
        value: newDateParts.year,
        setter: value => updateNewDatePart("year", value),
      },
      "add-time-hour": {
        id: "add-time-hour",
        type: "hour",
        maxLength: 2,
        group: "add-time",
        order: 0,
        nextFieldId: "add-time-minute",
        value: newTimeParts.hour,
        setter: value => updateNewTimePart("hour", value),
      },
      "add-time-minute": {
        id: "add-time-minute",
        type: "minute",
        maxLength: 2,
        group: "add-time",
        order: 1,
        nextFieldId: null,
        value: newTimeParts.minute,
        setter: value => updateNewTimePart("minute", value),
      },
      "edit-time-hour": {
        id: "edit-time-hour",
        type: "hour",
        maxLength: 2,
        group: "edit-time",
        order: 0,
        nextFieldId: "edit-time-minute",
        value: editorTimeParts.hour,
        setter: value => updateEditorTimePart("hour", value),
      },
      "edit-time-minute": {
        id: "edit-time-minute",
        type: "minute",
        maxLength: 2,
        group: "edit-time",
        order: 1,
        nextFieldId: null,
        value: editorTimeParts.minute,
        setter: value => updateEditorTimePart("minute", value),
      },
    };

    const groups = {};
    Object.values(fields).forEach(meta => {
      if (!meta.group) return;
      if (!groups[meta.group]) {
        groups[meta.group] = [];
      }
      groups[meta.group].push(meta.id);
    });

    Object.keys(groups).forEach(groupId => {
      groups[groupId].sort((a, b) => fields[a].order - fields[b].order);
    });

    console.log('Auto-advance fields configured:', Object.keys(fields));
    console.log('add-time-hour config:', fields['add-time-hour']);

    autoAdvanceConfigRef.current = { fields, groups };
    console.log('autoAdvanceConfigRef updated:', autoAdvanceConfigRef.current);
  }, [
    fromParts,
    toParts,
    newDateParts,
    newTimeParts,
    editorTimeParts,
    updateFromPart,
    updateToPart,
    updateNewDatePart,
    updateNewTimePart,
    updateEditorTimePart,
  ]);

  // Modify the useEffect for setupAutoAdvance to handle dynamic rendering of fields
  useEffect(() => {
    let cleanup = () => {};

    const setupForm = () => {
      if (addFormRef.current) {
        cleanup = setupAutoAdvance(addFormRef.current, autoAdvanceConfigRef);
      }
    };

    // Initial setup
    setupForm();

    // Observe changes in the form to reattach listeners if necessary
    const observer = new MutationObserver(setupForm);
    if (addFormRef.current) {
      observer.observe(addFormRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      cleanup();
      observer.disconnect();
    };
  }, []);

  const verifyTimeInputSetup = () => {
    const input = document.getElementById('add-time-hour');
    if (!input) {
      console.warn('Time input not found in DOM');
      return;
    }

    console.log('Time input attributes:', {
      id: input.id,
      'data-auto-field': input.dataset.autoField,
      'data-advance-type': input.dataset.advanceType,
      'data-advance-group': input.dataset.advanceGroup,
      'data-advance-order': input.dataset.advanceOrder,
      'data-advance-next': input.dataset.advanceNext,
    });

    const parent = schedulePageRef.current;
    if (parent) {
      console.log('Parent element:', {
        tagName: parent.tagName,
        id: parent.id,
        className: parent.className
      });
    }
  };

  useEffect(() => {
    setTimeout(verifyTimeInputSetup, 1000);
  }, []);

const updatePart = (sessionId, partId, field, value) => {
  mutateSession(sessionId, session => {
    const updatedSession = {
      ...session,
      parts: session.parts.map(part => {
        if (part.id !== partId) return part;
        if (field === "minutes") {
          return { ...part, minutes: value === "" ? "" : Math.max(0, Number(value)) };
        }
        if (field === "highIntensity") {
          return { ...part, highIntensity: Boolean(value) };
        }
        return { ...part, [field]: value };
      }),
    };
    
    // Save to Firebase
    practiceDataService.syncScheduleWithPractice(sessionId, updatedSession).catch(console.error);
    
    return updatedSession;
  });
};

  const removePart = (sessionId, partId) => {
    mutateSession(sessionId, session => ({
      ...session,
      parts: session.parts.filter(part => part.id !== partId),
    }));
  };

  const openDetails = sessionId => {
    setSelectedSessionId(sessionId);
    setTrainingExpanded(true);
  };

  const closeDetails = () => {
    setSelectedSessionId(null);
  };

  const renderSessionTile = (session, dateISO) => {
    const { totalMinutes, highMinutes, courts, rpeCourtPlanned, rpeGymPlanned } = getSessionMetrics(session);
    const showStats = session.type !== "DayOff" && session.type !== "Game";
    const showTime = session.type !== "DayOff";
    const timeText = formatTime(session.startTime);
    const palette = paletteForType(session.type);
    const typeLabel = formatTypeLabel(session.type) || session.type || "Session";
    const title = session.title ? session.title.trim() || typeLabel : typeLabel;
    const ariaLabel = `${formatDisplayDate(dateISO)}, ${timeText}, ${typeLabel}. ${
      showStats ? `Total ${totalMinutes}m, High Intensity ${highMinutes}m, Courts ${courts}.` : ""
    }`;

    const handleClick = event => {
      event.stopPropagation();
      openDetails(session.id);
    };

    return (
      <button
        key={session.id}
        type="button"
        className="cal-tile"
        onClick={handleClick}
        aria-label={ariaLabel}
        style={{
          '--tile-accent': palette.color,
          backgroundColor: palette.background,
        }}
      >
        <div className="cal-tile-row">
          {showTime && <span className="cal-time">{timeText}</span>}
          <span 
            className="cal-badge" 
            style={{ 
              backgroundColor: palette.background, 
              color: palette.color 
            }}
          >
            {typeLabel}
          </span>
        </div>
        {title !== typeLabel && (
          <div className="cal-title" title={title}>
            {title}
          </div>
        )}
        {showStats && (
          <div className="cal-stats">
            <div>Total: {totalMinutes}m</div>
            <div>High: {highMinutes}m</div>
            <div>Courts: {courts}</div>
            {rpeCourtPlanned > 0 && (
              <div>Court RPE: {rpeCourtPlanned}</div>
            )}
            {rpeGymPlanned > 0 && (
              <div>Gym RPE: {rpeGymPlanned}</div>
            )}
          </div>
        )}
      </button>
    );
  };

  const renderDayCell = dateObj => {
    const dateISO = toISODate(dateObj);
    const daySessions = sessionsByDate.get(dateISO) || [];
    const todayHighlight = isToday(dateObj);
    const isFirstOfMonth = dateObj.getUTCDate() === 1;

    // Check if there's a Day Off session
    const dayOffSession = daySessions.find(s => s.type === "DayOff");

    if (dayOffSession) {
      // Render single Day Off cell
      const cellClassNames = [
        "cal-day",
        todayHighlight ? "cal-day-today" : "",
      ].filter(Boolean).join(" ");

      return (
        <div
          key={dateISO}
          className={cellClassNames}
          role="gridcell"
        >
          <div className="cal-day-inner">
            <div className="cal-day-header">
              <div className="cal-day-heading">
                <span className="cal-day-number">{formatDayNum(dateObj)}</span>
                {isFirstOfMonth && (
                  <span className="cal-day-month">{formatMonthShort(dateObj)}</span>
                )}
              </div>
            </div>
            {renderSessionTile(dayOffSession, dateISO)}
          </div>
        </div>
      );
    }

    const amSessions = [];
    const pmSessions = [];
    daySessions.forEach(session => {
      const slotValue = session.slot || slotOf(session.startTime);
      if (slotValue === "PM") {
        pmSessions.push(session);
      } else {
        amSessions.push(session);
      }
    });

    const sortedSessions = [...daySessions].sort((a, b) => {
      const timeA = isValidTimeString(a.startTime) ? a.startTime : "00:00";
      const timeB = isValidTimeString(b.startTime) ? b.startTime : "00:00";
      return timeA.localeCompare(timeB);
    });

    const accessibleParts = [formatDisplayDate(dateISO)];
    if (amSessions.length) {
      accessibleParts.push(`AM ${amSessions.length} session${amSessions.length > 1 ? "s" : ""}`);
    } else {
      accessibleParts.push("No AM sessions");
    }
    if (pmSessions.length) {
      accessibleParts.push(`PM ${pmSessions.length} session${pmSessions.length > 1 ? "s" : ""}`);
    } else {
      accessibleParts.push("No PM sessions");
    }

    const cellClassNames = [
      "cal-day",
      todayHighlight ? "cal-day-today" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const handleDayKeyDown = event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const firstSession = sortedSessions[0];
      if (firstSession) {
        openDetails(firstSession.id);
      } else {
        quickAddSession(dateISO);
      }
    };

    const handleEmptyAdd = event => {
      if (event) event.stopPropagation();
      quickAddSession(dateISO);
    };

    const renderPanel = (label, sessions) => {
      const orderedSessions = [...sessions].sort((a, b) => {
        const timeA = isValidTimeString(a.startTime) ? a.startTime : "00:00";
        const timeB = isValidTimeString(b.startTime) ? b.startTime : "00:00";
        return timeA.localeCompare(timeB);
      });

      return (
        <div className="half-panel" key={label}>
          <div className="half-header">
            <span>{label}</span>
            <button
              type="button"
              className="half-add"
              onClick={event => {
                event.stopPropagation();
                quickAddSession(dateISO);
              }}
              aria-label={`Add ${label} session for ${formatDisplayDate(dateISO)}`}
            >
              +
            </button>
          </div>
          {orderedSessions.length === 0 ? (
            <div className="half-empty">No {label} session</div>
          ) : (
            <div className="half-list">
              {orderedSessions.map(session => renderSessionTile(session, dateISO))}
            </div>
          )}
        </div>
      );
    };

    if (amSessions.length === 0 && pmSessions.length === 0) {
      return (
        <div
          key={dateISO}
          className={cellClassNames}
          role="gridcell"
          tabIndex={0}
          onKeyDown={handleDayKeyDown}
          onClick={() => quickAddSession(dateISO)}
          aria-label={accessibleParts.join(", ")}
        >
          <div className="cal-day-inner">
            <div className="cal-day-header">
              <div className="cal-day-heading">
                <span className="cal-day-number">{formatDayNum(dateObj)}</span>
                {isFirstOfMonth && (
                  <span className="cal-day-month">{`${formatMonthShort(dateObj)} ${formatDayNum(dateObj)}`}</span>
                )}
              </div>
              <button
                type="button"
                className="cal-add"
                onClick={handleEmptyAdd}
                aria-label={`Add session for ${formatDisplayDate(dateISO)}`}
              >
                +
              </button>
            </div>
            <div className="cal-empty">No schedule</div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={dateISO}
        className={cellClassNames}
        role="gridcell"
        tabIndex={0}
        onKeyDown={handleDayKeyDown}
        aria-label={accessibleParts.join(", ")}
      >
        <div className="cal-day-inner">
          <div className="cal-day-header">
            <div className="cal-day-heading">
              <span className="cal-day-number">{formatDayNum(dateObj)}</span>
              {isFirstOfMonth && (
                <span className="cal-day-month">{`${formatMonthShort(dateObj)} ${formatDayNum(dateObj)}`}</span>
              )}
            </div>
          </div>
          <div className="day-panels">
            {renderPanel("AM", amSessions)}
            {renderPanel("PM", pmSessions)}
          </div>
        </div>
      </div>
    );
  };

  const appliedRangeText =
    fromDate || toDate
      ? `Range applied: From ${fromDate || "—"} To ${toDate || "—"}`
      : "";

  const selectedMetrics = selectedSession ? getSessionMetrics(selectedSession) : null;

  // State for date range modal
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Calculate session count for export preview
  const exportSessionCount = useMemo(() => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) return 0;
    return countSessionsInRange(
      sessions,
      exportDateRange.startDate,
      exportDateRange.endDate,
      toISODate
    );
  }, [exportDateRange, sessions, toISODate]);

  // Handle PDF export with date range selection
  const handleExportPDF = () => {
    // Use current filter range as default, or view month if no filter
    const defaultStart = fromDate
      ? parseISODateToUTC(fromDate)
      : startOfMonthUTC(viewMonth);
    const defaultEnd = toDate
      ? parseISODateToUTC(toDate)
      : endOfMonthUTC(viewMonth);

    setExportDateRange({ startDate: defaultStart, endDate: defaultEnd });
    setShowDateRangeModal(true);
  };

  const handleConfirmExport = async ({ startDate, endDate }) => {
    setShowDateRangeModal(false);
    setIsExporting(true);
    try {
      await exportScheduleToPDF({
        startDate,
        endDate,
        sessions,
        sessionsByDate,
        toISODate,
        slotOf,
        formatTime,
        formatTypeLabel
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncToPracticeLive = async (session) => {
    setIsSyncing(true);
    try {
      const metricsToSync = {
        ...session,
        totalMinutes: Number(session.totalMinutes) || 0,
        highIntensityMinutes: Number(session.highIntensityMinutes) || 0,
        courts: Number(session.courts) || 0,
        rpeCourtPlanned: Number(session.rpeCourtPlanned) || 0,
        rpeGymPlanned: Number(session.rpeGymPlanned) || 0
      };

      console.log('Syncing metrics:', metricsToSync);

      await practiceDataService.syncSessionToPracticeLive(session.id, metricsToSync);
      alert('Successfully synced metrics to PracticeLive!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert(`Failed to sync metrics: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="schedule-planner">
      <style>{globalStyles}</style>
      <div ref={schedulePageRef} className="schedule-page">
        <div className="schedule-page__nav">
          <Link to="/" className="btn btn-secondary">
            Back to Game Minutes
          </Link>
          <button
            className="btn btn-secondary"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? "Generating PDF..." : "Export PDF"}
          </button>
          <button
            onClick={() => navigate('/wellness')}
            className="btn btn-secondary"
            style={{
              backgroundColor: '#14b8a6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            💪 Daily Wellness Check
          </button>
          <button
            onClick={() => navigate('/rpe-report')}
            className="btn btn-secondary"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📊 RPE Weekly Report
          </button>
        </div>

        <h2 className="schedule-title">📅 Team Schedule Sessions</h2>

        <FilterComponent 
          fromParts={fromParts}
          toParts={toParts}
          updateFromPart={updateFromPart}
          updateToPart={updateToPart}
          handleApplyFilters={handleApplyFilters}
          clearFilters={clearFilters}
        />

        {appliedRangeText && <div className="filters-note">{appliedRangeText}</div>}

        <div id="schedule-add-form" className="addSessionCard" ref={addFormRef}>
          <h3 className="addSessionCard__title">Add Session</h3>
          <div className="addSessionCard__grid">
            <div className="addSessionCard__field">
              <label className="schedule-section-title" htmlFor="add-date-day">
                Date
              </label>
              <div className="date-inputs">
                <input
                  id="add-date-day"
                  className="schedule-input schedule-input--segment"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="DD"
                  maxLength={2}
                  value={newDateParts.day}
                  onChange={noop}
                  autoComplete="off"
                  data-auto-field="add-date-day"
                data-advance-type="day"
                data-advance-order="1"
                data-advance-next="add-date-year"
                aria-label="Session month"
              />
                <input
                  id="add-date-year"
                  className="schedule-input schedule-input--segment"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="YYYY"
                  maxLength={4}
                  value={newDateParts.year}
                  onChange={noop}
                  autoComplete="off"
                  data-auto-field="add-date-year"
                data-advance-type="year"
                data-advance-group="add-date"
                data-advance-order="2"
                aria-label="Session year"
              />
              </div>
            </div>
            <div className="addSessionCard__field">
              <label className="schedule-section-title" htmlFor="add-slot">
                Slot
              </label>
              <select
                id="add-slot"
                value={newSessionForm.slot}
                onChange={event => setNewSessionFormValue("slot", event.target.value)}
                className="schedule-select"
              >
                {SLOT_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="addSessionCard__field">
              <label className="schedule-section-title" htmlFor="add-time-hour">
                Start Time
              </label>
              <div className="time-inputs">
                <input
                  id="add-time-hour"
                  ref={startTimeInputRef}
                  className="schedule-input schedule-input--segment"
                  inputMode="numeric"
                  placeholder="HH"
                  maxLength={2}
                  value={newTimeParts.hour}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    updateNewTimePart('hour', digits);
                    if (digits.length === 2) {
                      document.getElementById('add-time-minute')?.focus();
                    }
                  }}
                  autoComplete="off"
                  aria-label="Session hour"
                />
                <input
                  id="add-time-minute"
                  className="schedule-input schedule-input--segment"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  value={newTimeParts.minute}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    updateNewTimePart('minute', digits);
                  }}
                  autoComplete="off"
                  aria-label="Session minutes"
                />
              </div>
            </div>
            <div className="addSessionCard__field">
              <label className="schedule-section-title" htmlFor="add-type">
                Type
              </label>
              <select
                id="add-type"
                value={newSessionForm.type}
                onChange={event => setNewSessionFormValue("type", event.target.value)}
                className="schedule-select"
              >
                {TYPES.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="addSessionCard__actions">
            <button type="button" className="btn btn-primary" onClick={addSession}>
              Add Session
            </button>
          </div>
        </div>

        <div className="monthCard cal-month">
          <div className="monthHeader">
            <button type="button" className="btn-nav" onClick={handlePrevMonth} aria-label="Previous month">
              ◀
            </button>
            <div className="monthHeader__title">{formatMonthLabel(viewMonth)}</div>
            <div className="monthHeader__actions">
              <button type="button" className="btn-nav" onClick={handleToday}>
                Today
              </button>
              <button type="button" className="btn-nav" onClick={handleNextMonth} aria-label="Next month">
                ▶
              </button>
            </div>
          </div>
          <div className="monthWeekdays cal-weekdays" role="row">
            {WEEKDAYS.map(day => (
              <div key={day} className="weekday" role="columnheader">
                {day}
              </div>
            ))}
          </div>
          <div className="monthGrid cal-grid" role="grid">
            {monthDays.map(renderDayCell)}
          </div>
        </div>
      </div>
      <RosterManager />
      {selectedSession && selectedMetrics && (
        <div className="schedule-overlay" onClick={closeDetails}>
          <div className="schedule-drawer details-drawer" onClick={event => event.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header__text">
                <h3 className="drawer-title">Session Details</h3>
                <p className="drawer-subtitle">{formatDisplayDateTime(selectedSession.date, selectedSession.startTime)}</p>
              </div>
              <button
                type="button"
                className="details-close"
                onClick={closeDetails}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="details-meta">
              <div className="details-meta__row">
                <span className="details-meta__label">Type</span>
                <span className="details-meta__value">{selectedSession.type}</span>
              </div>
              <div className="details-meta__row">
                <span className="details-meta__label">Slot</span>
                <span className="details-meta__value">{selectedSession.slot}</span>
              </div>
              <div className="details-meta__row">
                <span className="details-meta__label">Location</span>
                <span className="details-meta__value">{selectedSession.location || "—"}</span>
              </div>
              <div className="details-meta__row">
                <span className="details-meta__label">Date</span>
                <span className="details-meta__value">{formatDisplayDate(selectedSession.date)}</span>
              </div>
            </div>

            <div className="details-stats">
              <div className="details-stat">
                <span className="details-stat__label">Total</span>
                <input
                  type="number"
                  value={selectedSession.totalMinutes || 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    mutateSession(selectedSession.id, session => ({
                      ...session,
                      totalMinutes: value === "" ? 0 : Number(value)
                    }));
                  }}
                  className="details-stat__input"
                  min="0"
                />
                <span className="details-stat__unit">min</span>
              </div>
              <div className="details-stat">
                <span className="details-stat__label">High Intensity</span>
                <input
                  type="number"
                  value={selectedSession.highIntensityMinutes || 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    mutateSession(selectedSession.id, session => ({
                      ...session,
                      highIntensityMinutes: value === "" ? 0 : Number(value)
                    }));
                  }}
                  className="details-stat__input"
                  min="0"
                />
                <span className="details-stat__unit">min</span>
              </div>
              <div className="details-stat">
                <span className="details-stat__label">Courts</span>
                <input
                  type="number"
                  value={selectedSession.courts || 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    mutateSession(selectedSession.id, session => ({
                      ...session,
                      courts: value === "" ? 0 : Number(value)
                    }));
                  }}
                  className="details-stat__input"
                  min="0"
                />
              </div>
              <div className="details-stat">
                <span className="details-stat__label">Court RPE</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={selectedSession.rpeCourtPlanned || 0}
                  onChange={e => {
                    mutateSession(selectedSession.id, session => ({
                      ...session,
                      rpeCourtPlanned: Number(e.target.value) || 0
                    }));
                  }}
                  className="details-stat__input"
                />
                <span className="details-stat__unit">/10</span>
              </div>

              <div className="details-stat">
                <span className="details-stat__label">Gym RPE</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={selectedSession.rpeGymPlanned || 0}
                  onChange={e => {
                    mutateSession(selectedSession.id, session => ({
                      ...session,
                      rpeGymPlanned: Number(e.target.value) || 0
                    }));
                  }}
                  className="details-stat__input"
                />
                <span className="details-stat__unit">/10</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => handleSyncToPracticeLive(selectedSession)}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <span>🔄</span>
                <span>{isSyncing ? 'Syncing...' : 'Sync to PracticeLive'}</span>
              </button>
            </div>

            <div className="details-notes-edit" style={{ marginTop: '20px' }}>
              <label className="schedule-section-title" htmlFor="details-notes">
                Session Notes
              </label>
              <textarea
                id="details-notes"
                value={selectedSession.notes || ''}
                onChange={(e) => {
                  mutateSession(selectedSession.id, session => ({
                    ...session,
                    notes: e.target.value
                  }));
                }}
                placeholder="Add notes about this session..."
                className="schedule-textarea"
                rows={4}
              />
            </div>

            <div className="details-section">
              <button
                type="button"
                className="details-section__toggle"
                onClick={() => setTrainingExpanded(prev => !prev)}
                aria-expanded={trainingExpanded}
              >
                Training Plan
                <span className="details-section__icon">{trainingExpanded ? "−" : "+"}</span>
              </button>
              {trainingExpanded && (
                <div className="details-plan">
                  {selectedSession.parts.length === 0 ? (
                    <p className="details-plan__empty">No drills added yet.</p>
                  ) : (
                    <ul className="details-plan__list">
                      {selectedSession.parts.map(part => (
                        <li key={part.id} className="details-plan__item">
                          <span className="details-plan__name">{part.label || "Untitled"}</span>
                          <span className="details-plan__meta">
                            {`${part.minutes || 0}m • ${part.highIntensity ? "High" : "Standard"}`}
                          </span>
                          {part.notes && <span className="details-plan__notes">{part.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="details-actions">
              <Link
                to={`/practice/${selectedSession.id}`}
                className="btn btn-primary"
                onClick={closeDetails}
              >
                Start Live
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => openEditor(selectedSession.id)}
              >
                Edit Session
              </button>
              {/* Details Drawer Delete Button - using main deleteSession function */}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => deleteSession(selectedSession.id)}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {editorSession && (
        <div className="schedule-overlay" onClick={closeEditor}>
          <div className="schedule-drawer edit-drawer" onClick={event => event.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">Edit Session</h3>
              <button type="button" className="details-close" onClick={closeEditor} aria-label="Close editor">
                ×
              </button>
            </div>

            <div className="drawer-grid">
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-date">
                  Date
                </label>
                <input id="edit-date" type="date" value={editorSession.date} disabled className="schedule-input" />
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-slot">
                  Slot
                </label>
                <select id="edit-slot" value={editorSession.slot} disabled className="schedule-select">
                  {SLOT_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-time-hour">
                  Start Time
                </label>
                <div className="time-inputs">
                  <input
                    id="edit-time-hour"
                    className="schedule-input schedule-input--segment"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="HH"
                    maxLength={2}
                    value={editorTimeParts.hour}
                    onChange={noop}
                    autoComplete="off"
                    data-auto-field="edit-time-hour"
                    data-advance-type="hour"
                    data-advance-group="edit-time"
                    data-advance-order="0"
                    data-advance-next="edit-time-minute"
                    aria-label="Edit session hour"
                  />
                  <input
                    id="edit-time-minute"
                    className="schedule-input schedule-input--segment"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="MM"
                    maxLength={2}
                    value={editorTimeParts.minute}
                    onChange={noop}
                    autoComplete="off"
                    data-auto-field="edit-time-minute"
                    data-advance-type="minute"
                    data-advance-group="edit-time"
                    data-advance-order="1"
                    aria-label="Edit session minutes"
                  />
                </div>
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-type">
                  Type
                </label>
                <select
                  id="edit-type"
                  value={editorSession.type}
                  onChange={event => updateSessionField(editorSession.id, "type", event.target.value)}
                  className="schedule-select"
                >
                  {TYPES.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-title">
                  Title
                </label>
                <input
                  id="edit-title"
                  value={editorSession.title}
                  onChange={event => updateSessionField(editorSession.id, "title", event.target.value)}
                  className="schedule-input"
                />
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-location">
                  Location
                </label>
                <input
                  id="edit-location"
                  value={editorSession.location}
                  onChange={event => updateSessionField(editorSession.id, "location", event.target.value)}
                  className="schedule-input"
                />
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-courts">
                  Courts
                </label>
                <input
                  id="edit-courts"
                  type="number"
                  min="0"
                  value={editorSession.courts === "" ? "" : editorSession.courts}
                  onChange={event => updateSessionField(editorSession.id, "courts", event.target.value)}
                  className="schedule-input"
                />
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-total">
                  Total Minutes
                </label>
                <input
                  id="edit-total"
                  type="number"
                  min="0"
                  value={editorSession.totalMinutes === "" ? "" : editorSession.totalMinutes}
                  onChange={event => updateSessionField(editorSession.id, "totalMinutes", event.target.value)}
                  className="schedule-input"
                />
              </div>
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-high">
                  High Intensity Minutes
                </label>
                <input
                  id="edit-high"
                  type="number"
                  min="0"
                  value={
                    editorSession.highIntensityMinutes === ""
                      ? ""
                      : editorSession.highIntensityMinutes
                  }
                  onChange={event =>
                    updateSessionField(editorSession.id, "highIntensityMinutes", event.target.value)
                  }
                  className="schedule-input"
                />
              </div>
              {/* Add RPE Court field */}
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-rpe-court">
                  RPE Court (Planned)
                </label>
                <input
                  id="edit-rpe-court"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={editorSession.rpeCourtPlanned}
                  onChange={event => updateSessionField(editorSession.id, "rpeCourtPlanned", event.target.value)}
                  className="schedule-input rpe-input"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Expected court session intensity (0-10)
                </div>
              </div>

              {/* Add RPE Gym field */}
              <div className="drawer-field">
                <label className="schedule-section-title" htmlFor="edit-rpe-gym">
                  RPE Gym (Planned)
                </label>
                <input
                  id="edit-rpe-gym"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={editorSession.rpeGymPlanned}
                  onChange={event => updateSessionField(editorSession.id, "rpeGymPlanned", event.target.value)}
                  className="schedule-input rpe-input"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Expected gym session intensity (0-10)
                </div>
              </div>
              <div className="drawer-field drawer-field--full">
                <label className="schedule-section-title" htmlFor="edit-notes">
                  Notes
                </label>
                <textarea
                  id="edit-notes"
                  value={editorSession.notes}
                  onChange={event => updateSessionField(editorSession.id, "notes", event.target.value)}
                  className="schedule-textarea"
                />
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section__header">
                <div className="schedule-section-title">Practice Content (parts)</div>
                <button type="button" className="schedule-quick-button" onClick={() => addPart(editorSession.id)}>
                  ＋ Add Part
                </button>
              </div>
              <div className="drawer-table-wrapper">
                <table className="schedule-part-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35%" }}>Label</th>
                      <th style={{ width: "15%" }}>Minutes</th>
                      <th style={{ width: "15%" }}>High Intensity</th>
                      <th>Notes</th>
                      <th style={{ width: "12%" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorSession.parts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="drawer-table__empty">
                          No parts yet. Add drills or practice segments.
                        </td>
                      </tr>
                    ) : (
                      editorSession.parts.map(part => (
                        <tr key={part.id}>
                          <td>
                            <input
                              value={part.label}
                              onChange={event => updatePart(editorSession.id, part.id, "label", event.target.value)}
                              className="schedule-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={part.minutes === "" ? "" : part.minutes}
                              onChange={event => updatePart(editorSession.id, part.id, "minutes", event.target.value)}
                              className="schedule-input"
                            />
                          </td>
                          <td className="drawer-table__center">
                            <input
                              type="checkbox"
                              checked={Boolean(part.highIntensity)}
                              onChange={event =>
                                updatePart(editorSession.id, part.id, "highIntensity", event.target.checked)
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={part.notes || ""}
                              onChange={event => updatePart(editorSession.id, part.id, "notes", event.target.value)}
                              className="schedule-input"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="schedule-quick-button schedule-quick-button--danger"
                              onClick={() => removePart(editorSession.id, part.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="drawer-actions">
              {/* Editor Drawer Delete Button - using same deleteSession function */}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => deleteSession(editorSession.id)}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Modal for PDF Export */}
      <DateRangeModal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onConfirm={handleConfirmExport}
        defaultStartDate={exportDateRange.startDate}
        defaultEndDate={exportDateRange.endDate}
        sessionCount={exportSessionCount}
        onDatesChange={setExportDateRange}
      />
    </div>
  );
}
