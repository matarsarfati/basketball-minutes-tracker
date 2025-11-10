// src/MeetingProtocol.jsx
import React, { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import './styles.css';
import { meetingService } from './services/meetingService';
import { generateMeetingPDF } from './services/meetingExportService';

const STORAGE_KEY_V2 = "teamScheduleV2";
const MEETING_DATA_KEY = "meetingData_";

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

const loadSessions = () => {
  const parsed = safeParse(STORAGE_KEY_V2, []);
  return Array.isArray(parsed) ? parsed : [];
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function MeetingProtocol({ sessionId: sessionIdProp }) {
  const params = useParams();
  const sessionIdParam = params?.sessionId ?? "";
  const sessionId = sessionIdProp ?? sessionIdParam;
  const numericSessionId = Number(sessionId);

  // Load session data
  const [sessionsData] = useState(() => loadSessions());
  const matchSession = useCallback(
    session =>
      session &&
      (Number(session.id) === numericSessionId ||
        String(session.id) === String(sessionId)),
    [numericSessionId, sessionId]
  );
  const sessionIndex = sessionsData.findIndex(matchSession);
  const session = sessionIndex >= 0 ? sessionsData[sessionIndex] : null;

  // Meeting protocol state
  const [agenda, setAgenda] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [isLoading, setIsLoading] = useState(true);

  // New item forms
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newActionTask, setNewActionTask] = useState('');
  const [newActionResponsible, setNewActionResponsible] = useState('');
  const [newActionDeadline, setNewActionDeadline] = useState('');

  // Track if data has changed since last save
  const lastSavedDataRef = useRef(null);

  // Load initial data from Firebase
  useEffect(() => {
    if (!session?.id) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const meetingData = await meetingService.getMeetingData(session.id);

        if (meetingData) {
          setAgenda(meetingData.agenda || []);
          setActionItems(meetingData.actionItems || []);
          setGeneralNotes(meetingData.generalNotes || '');

          // Store initial data
          lastSavedDataRef.current = {
            agenda: meetingData.agenda || [],
            actionItems: meetingData.actionItems || [],
            generalNotes: meetingData.generalNotes || ''
          };

          setSaveStatus('saved');
        } else {
          // No data yet, initialize empty
          lastSavedDataRef.current = {
            agenda: [],
            actionItems: [],
            generalNotes: ''
          };
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('Failed to load meeting data:', error);
        showToast('Failed to load meeting data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [session?.id]);

  // Mark as unsaved when data changes
  useEffect(() => {
    if (isLoading) return;
    if (!lastSavedDataRef.current) return;

    const currentData = { agenda, actionItems, generalNotes };
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

    if (hasChanges && saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }
  }, [agenda, actionItems, generalNotes, isLoading, saveStatus]);

  // Save to localStorage
  useEffect(() => {
    if (!session?.id || isLoading) return;
    try {
      const meetingData = {
        agenda,
        actionItems,
        generalNotes,
      };
      localStorage.setItem(
        `${MEETING_DATA_KEY}${session.id}`,
        JSON.stringify(meetingData)
      );
    } catch (err) {
      console.error('Failed to save meeting data to localStorage:', err);
    }
  }, [session?.id, agenda, actionItems, generalNotes, isLoading]);

  // Manual save function
  const handleSave = async () => {
    if (!session?.id) return;

    try {
      setSaveStatus('saving');
      await meetingService.saveMeetingData(
        session.id,
        {
          date: session.date,
          time: session.startTime || session.time,
          agenda,
          actionItems,
          generalNotes
        }
      );

      // Update last saved data
      lastSavedDataRef.current = {
        agenda: [...agenda],
        actionItems: [...actionItems],
        generalNotes
      };

      setSaveStatus('saved');
      showToast('Meeting protocol saved ✓');
    } catch (error) {
      console.error('Failed to save meeting data:', error);
      setSaveStatus('unsaved');
      showToast('Failed to save meeting protocol');
    }
  };

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (saveStatus === 'unsaved' && session?.id) {
        // Fire and forget save on unmount
        meetingService.saveMeetingData(
          session.id,
          {
            date: session.date,
            time: session.startTime || session.time,
            agenda,
            actionItems,
            generalNotes
          }
        ).catch(err => console.error('Failed to save on unmount:', err));
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Agenda handlers
  const addAgendaItem = () => {
    if (!newAgendaTitle.trim()) {
      showToast('Please enter a topic title');
      return;
    }
    const newItem = {
      id: createId(),
      title: newAgendaTitle.trim(),
      notes: '',
      order: agenda.length
    };
    setAgenda([...agenda, newItem]);
    setNewAgendaTitle('');
  };

  const updateAgendaItem = (id, field, value) => {
    setAgenda(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeAgendaItem = (id) => {
    setAgenda(prev => prev.filter(item => item.id !== id));
  };

  // Action item handlers
  const addActionItem = () => {
    if (!newActionTask.trim() || !newActionResponsible.trim()) {
      showToast('Please enter task and responsible person');
      return;
    }
    const newItem = {
      id: createId(),
      task: newActionTask.trim(),
      responsible: newActionResponsible.trim(),
      deadline: newActionDeadline,
      completed: false
    };
    setActionItems([...actionItems, newItem]);
    setNewActionTask('');
    setNewActionResponsible('');
    setNewActionDeadline('');
  };

  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeActionItem = (id) => {
    setActionItems(prev => prev.filter(item => item.id !== id));
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleExportPDF = async () => {
    try {
      showToast('Generating PDF...');
      await generateMeetingPDF({
        session,
        agenda,
        actionItems,
        generalNotes
      });
      showToast('PDF generated successfully ✓');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      showToast('Failed to generate PDF');
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

  if (isLoading) {
    return <div className="p-8 text-center">Loading meeting protocol...</div>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Session not found</h2>
        <p className="mb-4">No meeting session data available.</p>
        <Link to="/schedule" className="text-blue-500 hover:underline">
          Return to Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Meeting Protocol</h1>
            <div className="text-gray-600">
              <p>Date: {session.date}</p>
              <p>Time: {formatSessionTime(session)}</p>
              {session.title && <p className="font-semibold mt-1">{session.title}</p>}
            </div>
            <div className="mt-2 text-sm flex items-center gap-2">
              {saveStatus === 'saved' && (
                <span className="text-green-600">✓ Saved</span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-blue-600 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  Saving...
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-orange-600">● Unsaved changes</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            >
              <span>💾</span>
              <span>Save</span>
            </button>
            <button
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              onClick={handleExportPDF}
            >
              <span>📄</span>
              <span>Export PDF</span>
            </button>
            <Link
              to="/schedule"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <span>←</span>
              <span>Back to Schedule</span>
            </Link>
          </div>
        </header>

        <div className="space-y-6">
          {/* Agenda Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Agenda</h2>

            <div className="space-y-4 mb-4">
              {agenda.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No agenda items yet</p>
              ) : (
                agenda.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="font-semibold text-gray-500 min-w-[30px] mt-2">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateAgendaItem(item.id, 'title', e.target.value)}
                        className="flex-1 font-semibold text-lg border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                        placeholder="Topic title..."
                      />
                      <button
                        onClick={() => removeAgendaItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="ml-11">
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateAgendaItem(item.id, 'notes', e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm resize-y min-h-[100px]"
                        placeholder="Discussion notes..."
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAgendaTitle}
                onChange={(e) => setNewAgendaTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAgendaItem()}
                className="flex-1 border rounded px-3 py-2"
                placeholder="New topic title..."
              />
              <button
                onClick={addAgendaItem}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
              >
                + Add Topic
              </button>
            </div>
          </div>

          {/* Action Items Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Action Items</h2>

            <div className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 w-10">✓</th>
                    <th className="text-left py-2 px-2">Task</th>
                    <th className="text-left py-2 px-2">Responsible</th>
                    <th className="text-left py-2 px-2">Deadline</th>
                    <th className="text-left py-2 px-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-gray-500 text-sm italic">
                        No action items yet
                      </td>
                    </tr>
                  ) : (
                    actionItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => updateActionItem(item.id, 'completed', e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.task}
                            onChange={(e) => updateActionItem(item.id, 'task', e.target.value)}
                            className={`w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none ${
                              item.completed ? 'line-through text-gray-500' : ''
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.responsible}
                            onChange={(e) => updateActionItem(item.id, 'responsible', e.target.value)}
                            className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={item.deadline}
                            onChange={(e) => updateActionItem(item.id, 'deadline', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => removeActionItem(item.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={newActionTask}
                onChange={(e) => setNewActionTask(e.target.value)}
                className="border rounded px-3 py-2 md:col-span-1"
                placeholder="Task..."
              />
              <input
                type="text"
                value={newActionResponsible}
                onChange={(e) => setNewActionResponsible(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="Responsible person..."
              />
              <input
                type="date"
                value={newActionDeadline}
                onChange={(e) => setNewActionDeadline(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <button
                onClick={addActionItem}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
              >
                + Add Action
              </button>
            </div>
          </div>

          {/* General Notes Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">General Notes / Summary</h2>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full border rounded px-4 py-3 resize-y min-h-[150px]"
              placeholder="Add general meeting notes, decisions, or summary here..."
            />
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

export default MeetingProtocol;
