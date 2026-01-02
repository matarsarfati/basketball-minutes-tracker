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
import './styles.css';
import { rosterService } from './services/rosterService';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  UserX,
  Clock,
  Activity,
  Users,
  Save
} from 'lucide-react';
import { practiceDataService } from './services/practiceDataService';
import { wellnessService } from './services/wellnessService';
import { generatePrePracticePDF, generatePracticePDF } from './pdfGenerator';
import SurveySelectionModal from './components/SurveySelectionModal';

// Simple debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 4. Initialize session-dependent state
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMetricsLoaded, setIsMetricsLoaded] = useState(false);

  const [metrics, setMetrics] = useState(() => ({
    planned: {
      totalTime: 0,
      highIntensity: 0,
      courtsUsed: 0,
      rpeCourt: 0.0,
      rpeGym: 0.0
    },
    actual: {
      totalTime: 0,
      highIntensity: 0,
      courtsUsed: 0,
      rpeCourt: 0.0,
      rpeGym: 0.0
    }
  }));

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
  const triggerBeepRef = useRef(() => { });
  const isSavingRef = useRef(false);
  const [surveyStore, setSurveyStore] = useState(() => getSurveyStore());
  const [quickRosterName, setQuickRosterName] = useState("");
  // Remove duplicate toastMessage state here
  const [sessionSummaries, setSessionSummaries] = useState(() => {
    const parsed = safeParse("sessionSummaries", []);
    return Array.isArray(parsed) ? parsed : [];
  });

  const [summaryEdits, setSummaryEdits] = useState({});
  const [timers, setTimers] = useState([]);

  // Sync State
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'

  // Debounce the critical data that needs to be synced
  const debouncedPracticeData = useDebounce({
    metrics,
    drillRows,
    attendance,
    surveyCompleted
  }, 1000);

  // Auto-Sync Effect
  useEffect(() => {
    if (!session?.id || isInitialLoad) return;

    const syncData = async () => {
      setSyncStatus('syncing');
      try {
        await practiceDataService.patchPracticeData(session.id, debouncedPracticeData);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Auto-sync failed:', error);
        setSyncStatus('error');
      }
    };

    syncData();
  }, [debouncedPracticeData, session?.id, isInitialLoad]);

  useEffect(() => {
    const fetchRoster = async () => {
      setIsLoadingRoster(true);
      try {
        const players = await rosterService.getPlayers();

        // Initialize attendance for new players as 'Present' by default if not already set
        setAttendance(prev => {
          const newAttendance = { ...prev };
          let changed = false;
          players.forEach(p => {
            if (!newAttendance[p.name]) {
              newAttendance[p.name] = { present: true }; // Default to Present
              changed = true;
            }
          });
          return changed ? newAttendance : prev;
        });

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
    if (!session?.id) return;

    console.log('🔄 Setting up Firebase subscription');

    const unsubscribe = practiceDataService.subscribeToPracticeData(
      session.id,
      (practiceData, isFirst) => {
        const isDeepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (practiceData?.metrics) {
          setMetrics(prev => {
            if (isDeepEqual(prev, practiceData.metrics)) {
              // Skipping update as data is identical
              return prev;
            }
            console.log('📥 Updating metrics state:', {
              isFirst,
              metrics: practiceData.metrics
            });
            return practiceData.metrics;
          });

          if (isFirst) {
            setIsMetricsLoaded(true);
            setIsInitialLoad(false);
          }
        }

        // Handle court survey data updates
        if (practiceData?.surveyData) {
          // Survey data usually comes from other users, ok to update
          // But we can still protect it
          setSurveyData(prev => {
            if (isDeepEqual(prev, practiceData.surveyData)) return prev;
            console.log('📥 Updating court survey data:', {
              responseCount: Object.keys(practiceData.surveyData).length
            });
            return practiceData.surveyData;
          });

          // Trigger side effect for averages (this is calculated state, ok to run if surveyData changes)
          // We'll trust the setSurveyData update to trigger re-renders if needed, 
          // but we need to update averages if data changed. 
          // Actually, the original code computed averages inside the callback. 
          // Let's keep that logic but only if we actually have new data.
          // However, calculating averages is cheap, we can do it.

          if (practiceData.surveyData) {
            const responses = Object.values(practiceData.surveyData);
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
          }
        }

        // Handle attendance updates
        if (practiceData?.attendance) {
          setAttendance(prev => {
            if (isDeepEqual(prev, practiceData.attendance)) return prev;
            return practiceData.attendance;
          });
        }

        // Handle drill rows updates
        if (practiceData?.drillRows) {
          setDrillRows(prev => {
            if (isDeepEqual(prev, practiceData.drillRows)) return prev;
            return practiceData.drillRows;
          });
        }

        // Handle survey completion status
        if (typeof practiceData?.surveyCompleted !== 'undefined') {
          setSurveyCompleted(prev => {
            if (prev === practiceData.surveyCompleted) return prev;
            return practiceData.surveyCompleted;
          });
        }

        // Handle gym survey data updates
        if (practiceData?.gymSurveyData) {
          setGymSurveyData(prev => {
            if (isDeepEqual(prev, practiceData.gymSurveyData)) return prev;
            console.log('📥 Updating gym survey data:', {
              responseCount: Object.keys(practiceData.gymSurveyData).length
            });
            return practiceData.gymSurveyData;
          });

          // Calculate and update gym averages
          const responses = Object.values(practiceData.gymSurveyData);
          if (responses.length > 0) {
            const total = responses.reduce((acc, response) =>
              acc + (Number(response.rpe) || 0), 0);
            setGymSurveyAverages({
              rpe: Number((total / responses.length).toFixed(1))
            });
          }
        }
      }
    );

    return () => unsubscribe();
  }, [session?.id]);

  // Removed automatic Firebase save - only save via manual button click or on exit

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
    console.log('🔄 Updating metrics:', { type, field, value });

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
    switch (action) {
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

  const handleExportPDF = async () => {
    await generatePracticePDF({
      session,
      summaries: sessionSummaries,
      survey: session.survey,
      surveyRecords: surveyData || {},
      averages: surveyAverages,
      attendance,
      drillRows,
      practiceMetrics: metrics,
      gymSurveyData,
      gymSurveyAverages
    });
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

      await generatePrePracticePDF({
        session,
        metrics,
        drillRows,
        attendance,
        wellnessData: freshWellnessData || {
          averages: { sleep: 0, fatigue: 0, soreness: 0 },
          responses: {}
        },
        roster
      });

      setToastMessage('Report generated successfully ✓');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate pre-practice report:', error);
      setToastMessage(error.message || 'Failed to generate report.');
      setTimeout(() => setToastMessage(''), 5000);
    }
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

  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);

  const handleSurveySelection = (type) => {
    setIsSurveyModalOpen(false);

    // Shared Logic for Pre-populating players
    if (!session?.id) return;

    try {
      const presentPlayers = roster
        .filter(player => attendance[player.name]?.present)
        .map(player => ({
          id: player.id,
          name: player.name,
          number: player.number
        }));

      // Save for both/either
      localStorage.setItem(`surveyPlayers_${session.id}`, JSON.stringify(presentPlayers));
      localStorage.setItem(`gymSurveyPlayers_${session.id}`, JSON.stringify(presentPlayers));
    } catch (err) {
      console.error('Failed to save players list', err);
    }

    if (type === 'court') {
      handleOpenSurvey();
    } else if (type === 'gym') {
      handleOpenGymSurvey();
    } else if (type === 'combined') {
      navigate(`/combined-survey/${session.id}`);
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

  const handleManualSave = useCallback(async () => {
    if (!session?.id || isSavingRef.current) return;

    isSavingRef.current = true;
    setToastMessage('💾 שומר נתונים ל-Firebase...');

    try {
      await practiceDataService.savePracticeData(
        session.id,
        {
          metrics,
          drillRows,
          attendance,
          surveyData,
          gymSurveyData,
          surveyCompleted
        },
        false
      );

      setLastSyncTime(new Date());
      setToastMessage('✓ הנתונים נשמרו בהצלחה ל-Firebase');
      console.log('✅ שמירה ידנית הושלמה בהצלחה');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error('❌ שגיאה בשמירה:', error);
      setToastMessage('❌ שגיאה בשמירה. נסה שוב.');
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      isSavingRef.current = false;
    }
  }, [session?.id, metrics, drillRows, attendance, surveyData, gymSurveyData, surveyCompleted]);

  const handleManualRefresh = useCallback(async () => {
    if (!session?.id || isRefreshing) return;

    setIsRefreshing(true);
    console.log('🔄 סנכרון ידני התחיל - מושך נתונים מ-Firebase');

    try {
      // Fetch fresh data from Firebase
      const freshData = await practiceDataService.getPracticeData(session.id);

      if (freshData) {
        console.log('📥 נתונים חדשים התקבלו מ-Firebase:', {
          hasMetrics: !!freshData.metrics,
          hasDrillRows: !!freshData.drillRows && freshData.drillRows.length > 0,
          hasAttendance: !!freshData.attendance && Object.keys(freshData.attendance).length > 0,
          hasSurveyData: !!freshData.surveyData && Object.keys(freshData.surveyData).length > 0,
          hasGymSurveyData: !!freshData.gymSurveyData && Object.keys(freshData.gymSurveyData).length > 0,
          surveyCompleted: freshData.surveyCompleted
        });

        let updatedFields = [];

        // Update metrics if available
        if (freshData.metrics) {
          setMetrics(freshData.metrics);
          updatedFields.push('מדדי תרגול');
        }

        // Update drill rows if available
        if (freshData.drillRows) {
          setDrillRows(freshData.drillRows);
          if (freshData.drillRows.length > 0) {
            updatedFields.push(`${freshData.drillRows.length} תרגילים`);
          }
        }

        // Update attendance if available
        if (freshData.attendance) {
          setAttendance(freshData.attendance);
          const presentCount = Object.values(freshData.attendance).filter(r => r.present).length;
          if (presentCount > 0) {
            updatedFields.push(`${presentCount} משתתפים`);
          }
        }

        // Update survey completed status
        if (typeof freshData.surveyCompleted === 'boolean') {
          setSurveyCompleted(freshData.surveyCompleted);
        }

        // Update court survey data
        if (freshData.surveyData) {
          setSurveyData(freshData.surveyData);

          // Recalculate averages
          const responses = Object.values(freshData.surveyData);
          if (responses.length > 0) {
            const totals = responses.reduce((acc, response) => ({
              rpe: acc.rpe + (Number(response.rpe) || 0),
              legs: acc.legs + (Number(response.legs) || 0)
            }), { rpe: 0, legs: 0 });

            setSurveyAverages({
              rpe: Number((totals.rpe / responses.length).toFixed(1)),
              legs: Number((totals.legs / responses.length).toFixed(1))
            });
            updatedFields.push(`${responses.length} סקרי מגרש`);
          }
        }

        // Update gym survey data
        if (freshData.gymSurveyData) {
          setGymSurveyData(freshData.gymSurveyData);

          // Recalculate gym averages
          const responses = Object.values(freshData.gymSurveyData);
          if (responses.length > 0) {
            const total = responses.reduce((acc, response) =>
              acc + (Number(response.rpe) || 0), 0);
            setGymSurveyAverages({
              rpe: Number((total / responses.length).toFixed(1))
            });
            updatedFields.push(`${responses.length} סקרי כושר`);
          }
        }

        setLastSyncTime(new Date());
        const updateMessage = updatedFields.length > 0
          ? `✓ סונכרן: ${updatedFields.join(', ')}`
          : '✓ הנתונים מעודכנים';
        setToastMessage(updateMessage);
        console.log('✅ סנכרון הושלם בהצלחה:', updatedFields.join(', '));
        setTimeout(() => setToastMessage(''), 4000);
      } else {
        console.warn('⚠️ לא נמצאו נתונים ב-Firebase עבור אימון:', session.id);
        setToastMessage('⚠️ לא נמצאו נתונים ב-Firebase');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ שגיאה בסנכרון:', error);
      setToastMessage('❌ שגיאה בסנכרון. נסה שוב.');
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setIsRefreshing(false);
    }
  }, [session?.id, isRefreshing]);

  // Auto-refresh removed - only manual refresh via button

  const renderSurveyStatus = () => {
    const presentCount = Object.values(attendance)
      .filter(record => record.present).length;
    const courtResponseCount = Object.keys(surveyData || {}).length;
    const gymResponseCount = Object.keys(gymSurveyData || {}).length;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <p className="font-medium">
              Survey Responses: {courtResponseCount} of {presentCount} players
              {courtResponseCount === presentCount && ' ✓'}
            </p>
            {surveyAverages.rpe > 0 && (
              <p className="text-gray-600">Team Averages: RPE {surveyAverages.rpe} • Legs {surveyAverages.legs}</p>
            )}
            {gymSurveyAverages.rpe > 0 && (
              <p className="text-gray-600">Gym Averages: RPE {gymSurveyAverages.rpe}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastSyncTime && (
              <span className="text-xs text-gray-500">
                Last synced: {lastSyncTime.toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            <button
              onClick={handleManualSave}
              disabled={isSavingRef.current}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isSavingRef.current
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                }
              `}
              title="שמור נתונים ל-Firebase"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
              <span>שמור ל-Firebase</span>
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }
              `}
              title="משוך נתונים מ-Firebase"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>מסנכרן...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <span>רענן נתונים</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
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

  const SyncIndicator = () => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
      syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' :
        'bg-red-100 text-red-700'
      }`}>
      {syncStatus === 'synced' && <Wifi className="w-4 h-4" />}
      {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
      {syncStatus === 'error' && <WifiOff className="w-4 h-4" />}
      <span>
        {syncStatus === 'synced' ? 'Saved to Cloud' :
          syncStatus === 'syncing' ? 'Syncing...' :
            'Sync Error'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Practice Session</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {session.date} • {formatSessionTime(session)}
                </span>
                {session.type && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600">
                    {session.type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SyncIndicator />
            <button
              onClick={async () => {
                // Force Sync: Save current, then refresh
                if (isSavingRef.current || isRefreshing) return;
                setToastMessage('🔄 Forcing sync...');
                await handleManualSave();
                await handleManualRefresh();
                setToastMessage('✅ Sync complete');
              }}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200"
              title="Force Sync (Save & Refresh)"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing || isSavingRef.current ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/schedule"
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 transition-colors font-medium border border-gray-200"
            >
              <span>←</span>
              <span>Schedule</span>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Attendance & Timers */}
          <div className="lg:col-span-4 space-y-6">

            {/* Attendance Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-gray-800">Attendance</h2>
                </div>
                <span className="text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-100">
                  {Object.values(attendance).filter(r => r.present).length} / {roster.length} Present
                </span>
              </div>

              <div className="p-2 overflow-y-auto flex-1">
                <div className="space-y-2">
                  {roster.map(player => {
                    const record = attendance[player.name] || { present: false };
                    const isPresent = record.present;

                    return (
                      <div
                        key={player.id}
                        onClick={() => handleAttendanceChange(player, { present: !isPresent })}
                        className={`
                          group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border
                          ${isPresent
                            ? 'bg-green-50 border-green-200 shadow-sm hover:shadow-md hover:bg-green-100/50'
                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                            ${isPresent ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-400'}
                          `}>
                            {player.number || '#'}
                          </div>
                          <div>
                            <span className={`font-semibold block ${isPresent ? 'text-gray-900' : 'text-gray-400'}`}>
                              {player.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPresent ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <select
                                value={record.reason || ''}
                                onChange={e => handleAttendanceChange(player, {
                                  present: false,
                                  reason: e.target.value,
                                  reasonDetails: e.target.value === 'Other' ? record.reasonDetails : ''
                                })}
                                className="text-xs border rounded px-1.5 py-1 bg-white focus:ring-2 focus:ring-indigo-500 max-w-[100px]"
                              >
                                <option value="">Reason...</option>
                                <option value="Injury">Injury</option>
                                <option value="Illness">Illness</option>
                                <option value="Personal">Personal</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timers Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="mb-4 flex justify-between items-center border-b border-gray-100 pb-2">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Timers
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => addNewTimer('time')}
                    className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 border border-blue-100 transition-colors"
                  >
                    + Timer
                  </button>
                  <button
                    onClick={() => addNewTimer('count')}
                    className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded hover:bg-orange-100 border border-orange-100 transition-colors"
                  >
                    + Count
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {timers.map((timer, index) => (
                  <div key={timer.id} className="relative group bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-gray-300 transition-all">
                    <div
                      className="text-center cursor-pointer"
                      onClick={() => handleTimerClick(index)}
                    >
                      <div className="text-2xl mb-1">
                        {timer.type === 'time' ? '⏱️' : '🏀'}
                      </div>
                      <div className={`text-xl font-mono font-bold ${timer.isRunning ? 'text-blue-600' : 'text-gray-700'}`}>
                        {timer.type === 'time'
                          ? formatSeconds(timer.value)
                          : timer.value}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={timer.label}
                      onChange={(e) => updateTimerLabel(index, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-center text-xs bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none mt-2 text-gray-500"
                    />

                    <div className="mt-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {timer.type === 'count' && (
                        <button onClick={() => handleDecrementCount(index)} className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300">-</button>
                      )}
                      <button onClick={() => handleResetTimer(index)} className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300">R</button>
                      <button onClick={() => handleDeleteTimer(index)} className="text-xs px-2 py-0.5 bg-red-100 rounded text-red-600 hover:bg-red-200">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Practice Details */}
          <div className="lg:col-span-8 space-y-6">

            {/* Metrics Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-800">Practice Metrics</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium pl-2">Metric</th>
                      <th className="pb-3 font-medium">Total Time</th>
                      <th className="pb-3 font-medium">High Intensity</th>
                      <th className="pb-3 font-medium">Courts Used</th>
                      <th className="pb-3 font-medium">Court RPE</th>
                      <th className="pb-3 font-medium">Gym RPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="group hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-700 pl-2">Planned</td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.planned.totalTime}
                          onChange={e => updateMetrics('planned', 'totalTime', e.target.value)}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.planned.highIntensity}
                          onChange={e => updateMetrics('planned', 'highIntensity', e.target.value)}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.planned.courtsUsed}
                          onChange={e => updateMetrics('planned', 'courtsUsed', e.target.value)}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.planned.rpeCourt}
                          onChange={e => updateMetrics('planned', 'rpeCourt', e.target.value)}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.planned.rpeGym}
                          onChange={e => updateMetrics('planned', 'rpeGym', e.target.value)}
                          className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                      </td>
                    </tr>
                    <tr className="group hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-700 pl-2">Actual</td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.actual.totalTime}
                          onChange={e => updateMetrics('actual', 'totalTime', e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-900"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.actual.highIntensity}
                          onChange={e => updateMetrics('actual', 'highIntensity', e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-900"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.actual.courtsUsed}
                          onChange={e => updateMetrics('actual', 'courtsUsed', e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-900"
                          min="0"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.actual.rpeCourt}
                          onChange={e => updateMetrics('actual', 'rpeCourt', e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-900"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={metrics.actual.rpeGym}
                          onChange={e => updateMetrics('actual', 'rpeGym', e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-gray-900"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drill Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800">Drill Details</h2>
                </div>
                <button
                  onClick={addDrillRow}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 border border-indigo-100 transition-colors"
                >
                  + Add Drill
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 w-1/3 font-medium pl-2">Name</th>
                      <th className="pb-3 w-1/6 font-medium">Total (min)</th>
                      <th className="pb-3 w-1/6 font-medium">High Int. (min)</th>
                      <th className="pb-3 w-1/6 font-medium">Courts</th>
                      <th className="pb-3 w-1/12 font-medium text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {drillRows.map((row, index) => (
                      <tr key={index} className="group hover:bg-gray-50/50">
                        <td className="py-2 pl-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateDrillRow(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Drill name..."
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={row.totalTime || ''}
                            onChange={(e) => updateDrillRow(index, 'totalTime', e.target.value)}
                            className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={row.highIntensity || ''}
                            onChange={(e) => updateDrillRow(index, 'highIntensity', e.target.value)}
                            className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={row.courts || ''}
                            onChange={(e) => updateDrillRow(index, 'courts', e.target.value)}
                            className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="text-right py-2 pr-2">
                          <button
                            onClick={(() => removeDrillRow(index))}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Card */}
            <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
              {/* Controls using the new style */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/wellness')}
                  className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium flex items-center gap-2 transition-colors border border-purple-100"
                >
                  <Activity className="w-4 h-4" />
                  <span>Daily Wellness</span>
                </button>
                <PrePracticeButton
                  onClick={handleExportPrePracticeReport}
                  isLoading={toastMessage === 'Generating report...'}
                />
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium border border-green-100"
                >
                  Export PDF
                </button>
              </div>

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setIsSurveyModalOpen(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 rounded-xl font-bold font-sans shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                >
                  {Object.keys(surveyData || {}).length > 0 ? 'Continue Survey' : 'Start Survey'}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SurveySelectionModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        onSelect={handleSurveySelection}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 py-3 px-5 bg-gray-900/90 text-white rounded-xl shadow-xl backdrop-blur-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default PracticeLive;

