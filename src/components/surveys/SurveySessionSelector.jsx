import React, { useState, useEffect } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { useTeam } from '../../context/TeamContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function SurveySessionSelector({ onSessionSelect }) {
    const { activeTeam } = useTeam();
    const { sessionId: urlSessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine the base path logic (e.g. /team/123/surveys/court)
    const basePath = location.pathname.split('/').slice(0, 5).join('/'); // [ "", "team", "123", "surveys", "court" ]

    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedSessionId, setSelectedSessionId] = useState(urlSessionId || '');
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch of all events for this team
    useEffect(() => {
        if (!activeTeam?.id) return;
        setIsLoading(true);
        scheduleService.getScheduleEvents(activeTeam.id).then(data => {
            setEvents(data || []);
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to load schedule events:", err);
            setIsLoading(false);
        });
    }, [activeTeam?.id]);

    // Handle initial routing / syncing based on URL sessionId
    useEffect(() => {
        if (isLoading) return;

        if (urlSessionId) {
            const session = events.find(e => e.id === urlSessionId || e.firebaseId === urlSessionId);
            if (session) {
                if (session.date !== selectedDate) {
                    setSelectedDate(session.date);
                }
                if (selectedSessionId !== urlSessionId) {
                    setSelectedSessionId(urlSessionId);
                }
                onSessionSelect(session);
            } else {
                // Invalid or deleted session in URL
                onSessionSelect(null);
            }
        } else {
            // No URL param, fallback to today's active session naturally
            const availableToday = events.filter(e => e.date === selectedDate && e.type !== 'DayOff');
            if (availableToday.length > 0) {
                const s = availableToday[0];
                const sId = s.id || s.firebaseId;
                setSelectedSessionId(sId);
                navigate(`${basePath}/${sId}`, { replace: true });
            } else {
                setSelectedSessionId('');
                onSessionSelect(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlSessionId, events, isLoading, basePath]);
    // We omit selectedDate to avoid infinite loops if date changes. We only want date swaps deliberately.

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);

        const availableOnDate = events.filter(evt => evt.date === newDate && evt.type !== 'DayOff');
        if (availableOnDate.length > 0) {
            const sId = availableOnDate[0].id || availableOnDate[0].firebaseId;
            navigate(`${basePath}/${sId}`, { replace: true }); // Updates URL which triggers the useEffect above
        } else {
            navigate(`${basePath}`, { replace: true }); // Clears the URL causing null selection
        }
    };

    const handleSessionChange = (e) => {
        const sId = e.target.value;
        navigate(`${basePath}/${sId}`, { replace: true });
    };

    const availableSessions = events.filter(e => e.date === selectedDate && e.type !== 'DayOff');

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 flex-1 md:flex-none">
                    <Calendar size={18} className="text-slate-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none flex-1"
                    />
                </div>

                {availableSessions.length > 0 ? (
                    <div className="flex items-center gap-2 flex-1 md:flex-none">
                        <Clock size={18} className="text-slate-400" />
                        <select
                            value={selectedSessionId}
                            onChange={handleSessionChange}
                            className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none flex-1"
                        >
                            {availableSessions.map((s, idx) => (
                                <option key={idx} value={s.id || s.firebaseId}>
                                    {s.slot || s.startTime} - {s.title || s.type}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </div>

            {availableSessions.length === 0 && !isLoading ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md w-full md:w-auto">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">No scheduled practice on this date.</span>
                    <button
                        onClick={() => navigate(`/team/${activeTeam.id}/schedule`)}
                        className="ml-2 text-sm text-indigo-600 hover:underline font-bold"
                    >
                        View Calendar
                    </button>
                </div>
            ) : null}

            {isLoading && (
                <div className="text-sm text-slate-400">Loading schedule...</div>
            )}
        </div>
    );
}
