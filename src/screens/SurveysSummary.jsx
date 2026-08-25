import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Activity, Dumbbell, AlertTriangle, CheckCircle2, Clock, TrendingUp, RefreshCw, FileDown } from 'lucide-react';
import { practiceDataService } from '../services/practiceDataService';
import { rosterService } from '../services/rosterService';
import { useTeam } from '../context/TeamContext';
import SurveySessionSelector from '../components/surveys/SurveySessionSelector';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Init pdfMake fonts once
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

// --- Helpers ---
function getRpeColor(value) {
    if (value === null || value === undefined || value === '—') return { bg: 'bg-slate-100', text: 'text-slate-400' };
    const v = Number(value);
    if (v >= 1 && v <= 4) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (v <= 7) return { bg: 'bg-amber-100', text: 'text-amber-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
}

function RpeBadge({ value }) {
    if (value === null || value === undefined) {
        return <span className="text-slate-300 font-medium">—</span>;
    }
    const { bg, text } = getRpeColor(value);
    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${bg} ${text}`}>
            {value}
        </span>
    );
}

function StatCard({ icon, label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        red: 'bg-red-50 text-red-600 border-red-100',
    };
    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${colors[color]} shadow-sm`}>
            <div className="text-2xl">{icon}</div>
            <div>
                <div className="text-2xl font-black tracking-tight">{value}</div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
                {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

// --- PDF logic ---
function sanitizeFileName(v) {
    return (v || '').toString().trim().replace(/[^0-9a-zA-Z_\-. ]/g, '_');
}

function wellnessSummary(w) {
    if (!w) return '—';
    const parts = [];
    if (w.sleep !== undefined) parts.push(`Sleep: ${w.sleep}h`);
    if (w.fatigue !== undefined) parts.push(`Fatigue: ${w.fatigue}/10`);
    if (w.soreness !== undefined) parts.push(`Soreness: ${w.soreness}/10`);
    return parts.join('  |  ') || '—';
}

function buildSurveySummaryPDF({ teamName, session, presentPlayers, surveyData, gymSurveyData, wellnessData, overallSubmittedCount, avgCourtRpe, avgGymRpe, avgLegs, flaggedCount }) {
    const sessionLabel = [session?.date, session?.slot, session?.title || session?.type].filter(Boolean).join(' · ');
    const generatedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const tableBody = [
        [
            { text: '#', style: 'th' },
            { text: 'Player', style: 'th' },
            { text: 'Status', style: 'th' },
            { text: 'Court RPE', style: 'th' },
            { text: 'Leg Heaviness', style: 'th' },
            { text: 'Gym RPE', style: 'th' },
            { text: 'Wellness', style: 'th' },
            { text: 'Notes', style: 'th' },
        ],
        ...presentPlayers.map((player, i) => {
            const court = surveyData[player.name];
            const gym = gymSurveyData[player.name];
            const wellness = wellnessData[player.name];
            const hasAny = !!(court || gym || wellness);
            const isFlagged = court && (Number(court.rpe) >= 8 || Number(court.legs) >= 8);

            const rpeColor = (val) => {
                if (!val) return '#94a3b8';
                return Number(val) >= 8 ? '#dc2626' : Number(val) >= 5 ? '#d97706' : '#059669';
            };

            return [
                { text: String(i + 1), alignment: 'center', color: '#6b7280', fontSize: 9 },
                {
                    stack: [
                        { text: player.name, bold: true, color: isFlagged ? '#dc2626' : '#1e293b', fontSize: 10 },
                        player.number ? { text: `#${player.number}`, fontSize: 8, color: '#94a3b8' } : { text: '' },
                    ]
                },
                { text: hasAny ? 'Submitted' : 'Pending', color: hasAny ? '#059669' : '#94a3b8', bold: hasAny, alignment: 'center', fontSize: 9 },
                { text: court?.rpe != null ? String(court.rpe) : '—', alignment: 'center', bold: !!court?.rpe, color: rpeColor(court?.rpe), fontSize: 10 },
                { text: court?.legs != null ? String(court.legs) : '—', alignment: 'center', bold: !!court?.legs, color: rpeColor(court?.legs), fontSize: 10 },
                { text: gym?.rpe != null ? String(gym.rpe) : '—', alignment: 'center', bold: !!gym?.rpe, color: rpeColor(gym?.rpe), fontSize: 10 },
                { text: wellnessSummary(wellness), fontSize: 8, color: '#475569' },
                { text: court?.notes || gym?.notes || '—', fontSize: 8, color: '#64748b', italics: !!(court?.notes || gym?.notes) },
            ];
        })
    ];

    const kpiRow = [
        {
            stack: [
                { text: `${overallSubmittedCount} / ${presentPlayers.length}`, fontSize: 20, bold: true, color: '#4f46e5', alignment: 'center' },
                { text: 'Players Completed', fontSize: 8, color: '#6366f1', alignment: 'center' },
            ],
            margin: [4, 4, 4, 4]
        },
        {
            stack: [
                { text: avgCourtRpe ?? '—', fontSize: 20, bold: true, color: Number(avgCourtRpe) >= 8 ? '#dc2626' : Number(avgCourtRpe) >= 5 ? '#d97706' : '#059669', alignment: 'center' },
                { text: 'Avg Court RPE', fontSize: 8, color: '#64748b', alignment: 'center' },
            ],
            margin: [4, 4, 4, 4]
        },
        {
            stack: [
                { text: avgGymRpe ?? '—', fontSize: 20, bold: true, color: Number(avgGymRpe) >= 8 ? '#dc2626' : Number(avgGymRpe) >= 5 ? '#d97706' : '#059669', alignment: 'center' },
                { text: 'Avg Gym RPE', fontSize: 8, color: '#64748b', alignment: 'center' },
            ],
            margin: [4, 4, 4, 4]
        },
        {
            stack: [
                { text: avgLegs ?? '—', fontSize: 20, bold: true, color: Number(avgLegs) >= 8 ? '#dc2626' : Number(avgLegs) >= 5 ? '#d97706' : '#059669', alignment: 'center' },
                { text: 'Avg Leg Heaviness', fontSize: 8, color: '#64748b', alignment: 'center' },
            ],
            margin: [4, 4, 4, 4]
        },
        {
            stack: [
                { text: String(flaggedCount), fontSize: 20, bold: true, color: flaggedCount > 0 ? '#dc2626' : '#059669', alignment: 'center' },
                { text: 'Flagged (RPE/Legs ≥8)', fontSize: 8, color: '#64748b', alignment: 'center' },
            ],
            margin: [4, 4, 4, 4]
        },
    ];

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [32, 40, 32, 40],
        content: [
            // Header
            {
                columns: [
                    {
                        stack: [
                            { text: teamName || 'Team', fontSize: 18, bold: true, color: '#1e293b' },
                            { text: 'Daily Training & Survey Summary', fontSize: 11, color: '#475569', margin: [0, 2, 0, 2] },
                            { text: sessionLabel, fontSize: 9, color: '#6366f1', bold: true },
                        ]
                    },
                    {
                        stack: [
                            { text: 'Generated', fontSize: 8, color: '#94a3b8', alignment: 'right' },
                            { text: generatedAt, fontSize: 9, color: '#475569', alignment: 'right' },
                        ],
                        width: 'auto'
                    }
                ],
                margin: [0, 0, 0, 16]
            },

            // KPI Block
            {
                table: {
                    widths: ['*', '*', '*', '*', '*'],
                    body: [kpiRow]
                },
                layout: {
                    fillColor: () => '#f8fafc',
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                },
                margin: [0, 0, 0, 20]
            },

            // Table heading
            { text: 'Player Survey Responses', fontSize: 11, bold: true, color: '#334155', margin: [0, 0, 0, 6] },

            // Roster Table
            {
                table: {
                    headerRows: 1,
                    widths: [18, '*', 52, 52, 52, 52, '*', '*'],
                    body: tableBody,
                },
                layout: {
                    fillColor: (rowIndex) => rowIndex === 0 ? '#1e293b' : rowIndex % 2 === 0 ? '#f8fafc' : null,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    paddingTop: () => 5,
                    paddingBottom: () => 5,
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                }
            },

            // Legend
            {
                text: [
                    { text: 'Legend: ', bold: true, color: '#475569' },
                    { text: 'Low 1–4  ', color: '#059669' },
                    { text: 'Moderate 5–7  ', color: '#d97706' },
                    { text: 'High 8–10  ', color: '#dc2626' },
                    { text: '  |  Flagged players shown in red name text.', color: '#94a3b8' },
                ],
                fontSize: 8,
                margin: [0, 10, 0, 0]
            }
        ],
        styles: {
            th: { bold: true, color: '#ffffff', fontSize: 9, alignment: 'center' },
        },
        defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1e293b' }
    };

    const fileName = `survey_summary_${sanitizeFileName(session?.date || 'export')}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
}

// ─────────────────────────────────────────
export default function SurveysSummary() {
    const { activeTeam } = useTeam();

    const [activeSession, setActiveSession] = useState(null);
    const [roster, setRoster] = useState([]);
    const [surveyData, setSurveyData] = useState({});
    const [gymSurveyData, setGymSurveyData] = useState({});
    const [wellnessData, setWellnessData] = useState({});
    const [attendance, setAttendance] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const sessionId = activeSession?.id || activeSession?.firebaseId;

    // Fetch roster once
    useEffect(() => {
        rosterService.getPlayers().then(setRoster).catch(console.error);
    }, []);

    // Subscribe to practice data for the active session in real-time
    useEffect(() => {
        if (!sessionId) {
            setSurveyData({});
            setGymSurveyData({});
            setWellnessData({});
            setAttendance({});
            return;
        }
        setIsLoading(true);
        const unsubscribe = practiceDataService.subscribeToPracticeData(sessionId, (data) => {
            setSurveyData(data?.surveyData || {});
            setGymSurveyData(data?.gymSurveyData || {});
            setWellnessData(data?.wellnessData || {});
            setAttendance(data?.attendance || {});
            setLastUpdated(new Date());
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [sessionId]);

    // Derive present players
    const presentPlayers = roster.filter(p => {
        const hasAttendance = Object.keys(attendance).length > 0;
        return hasAttendance ? attendance[p.name]?.present : true;
    });

    // Stats
    const courtSubmitted = presentPlayers.filter(p => surveyData[p.name]);
    const gymSubmitted = presentPlayers.filter(p => gymSurveyData[p.name]);

    const avgCourtRpe = courtSubmitted.length > 0
        ? (courtSubmitted.reduce((s, p) => s + Number(surveyData[p.name]?.rpe || 0), 0) / courtSubmitted.length).toFixed(1)
        : null;

    const avgGymRpe = gymSubmitted.length > 0
        ? (gymSubmitted.reduce((s, p) => s + Number(gymSurveyData[p.name]?.rpe || 0), 0) / gymSubmitted.length).toFixed(1)
        : null;

    const avgLegs = courtSubmitted.length > 0
        ? (courtSubmitted.reduce((s, p) => s + Number(surveyData[p.name]?.legs || 0), 0) / courtSubmitted.length).toFixed(1)
        : null;

    const flaggedPlayers = presentPlayers.filter(p => {
        const court = surveyData[p.name];
        return court && (Number(court.rpe) >= 8 || Number(court.legs) >= 8);
    });

    const overallSubmitted = presentPlayers.filter(p =>
        surveyData[p.name] || gymSurveyData[p.name] || wellnessData[p.name]
    );

    const handleExportPDF = useCallback(() => {
        if (!activeSession) return;
        setIsExporting(true);
        try {
            buildSurveySummaryPDF({
                teamName: activeTeam?.name,
                session: activeSession,
                presentPlayers,
                surveyData,
                gymSurveyData,
                wellnessData,
                overallSubmittedCount: overallSubmitted.length,
                avgCourtRpe,
                avgGymRpe,
                avgLegs,
                flaggedCount: flaggedPlayers.length,
            });
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            // Give pdfMake a moment to kick off the download before resetting
            setTimeout(() => setIsExporting(false), 1500);
        }
    }, [activeSession, activeTeam, presentPlayers, surveyData, gymSurveyData, wellnessData, overallSubmitted, avgCourtRpe, avgGymRpe, avgLegs, flaggedPlayers]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-500" />
                        Survey Summary
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">Real-time view of all player survey responses.</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                            <RefreshCw size={11} />
                            Live · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    )}
                    <button
                        id="export-pdf-btn"
                        onClick={handleExportPDF}
                        disabled={!activeSession || isExporting || isLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm
                            ${(!activeSession || isExporting || isLoading)
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'
                            }`}
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>
                                <FileDown size={15} />
                                Export PDF
                            </>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Session Selector */}
                <SurveySessionSelector onSessionSelect={setActiveSession} />

                {/* No session selected */}
                {!activeSession && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-lg font-bold text-slate-700">Select a Session</h3>
                        <p className="text-slate-400 mt-1 max-w-xs">Choose a date and practice session above to view the survey responses.</p>
                    </div>
                )}

                {/* Loading */}
                {isLoading && activeSession && (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading survey data...</span>
                    </div>
                )}

                {/* Main Content */}
                {activeSession && !isLoading && (
                    <>
                        {/* Session Banner */}
                        <div className="bg-indigo-600 text-white rounded-xl px-5 py-3 flex items-center gap-4">
                            <Clock size={18} className="opacity-70" />
                            <div>
                                <span className="font-bold">{activeSession.title || activeSession.type}</span>
                                <span className="mx-2 opacity-50">·</span>
                                <span className="opacity-80">{activeSession.date}</span>
                                {activeSession.slot && (
                                    <>
                                        <span className="mx-2 opacity-50">·</span>
                                        <span className="opacity-80">{activeSession.slot}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard icon={<Users size={20} />} label="Completed" value={`${overallSubmitted.length} / ${presentPlayers.length}`} sub="any survey type" color="indigo" />
                            <StatCard icon={<Activity size={20} />} label="Avg Court RPE" value={avgCourtRpe ?? '—'} sub={`from ${courtSubmitted.length} players`} color={avgCourtRpe >= 8 ? 'red' : avgCourtRpe >= 5 ? 'amber' : 'emerald'} />
                            <StatCard icon={<Dumbbell size={20} />} label="Avg Gym RPE" value={avgGymRpe ?? '—'} sub={`from ${gymSubmitted.length} players`} color={avgGymRpe >= 8 ? 'red' : avgGymRpe >= 5 ? 'amber' : 'emerald'} />
                            <StatCard icon={<AlertTriangle size={20} />} label="Flagged / Sore" value={flaggedPlayers.length} sub="RPE or Legs ≥ 8" color={flaggedPlayers.length > 0 ? 'red' : 'emerald'} />
                        </div>

                        {/* Roster Table */}
                        {presentPlayers.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <div className="text-4xl mb-3">👥</div>
                                <p className="font-medium">No players found for this session.</p>
                                <p className="text-sm mt-1">Make sure attendance is marked in Practice Live.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Roster Responses</h2>
                                    <span className="text-xs text-slate-400">{presentPlayers.length} players present</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs uppercase tracking-wide text-slate-400 bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-4 py-3 text-left font-semibold">Player</th>
                                                <th className="px-4 py-3 text-center font-semibold">Status</th>
                                                <th className="px-4 py-3 text-center font-semibold">Court RPE</th>
                                                <th className="px-4 py-3 text-center font-semibold">Leg Heaviness</th>
                                                <th className="px-4 py-3 text-center font-semibold">Gym RPE</th>
                                                <th className="px-4 py-3 text-center font-semibold">Wellness</th>
                                                <th className="px-4 py-3 text-left font-semibold">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {presentPlayers.map((player) => {
                                                const court = surveyData[player.name];
                                                const gym = gymSurveyData[player.name];
                                                const wellness = wellnessData[player.name];
                                                const hasAny = court || gym || wellness;
                                                const isFlagged = court && (Number(court.rpe) >= 8 || Number(court.legs) >= 8);
                                                return (
                                                    <tr key={player.id || player.name} className={`transition-colors hover:bg-slate-50 ${isFlagged ? 'bg-red-50/40' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                                    {player.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                        {player.name}
                                                                        {isFlagged && <span title="High RPE or Leg fatigue" className="text-red-500"><AlertTriangle size={12} /></span>}
                                                                    </div>
                                                                    {player.number && <div className="text-xs text-slate-400">#{player.number}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {hasAny ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                                    <CheckCircle2 size={11} />Submitted
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                                                    <Clock size={11} />Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center"><RpeBadge value={court?.rpe} /></td>
                                                        <td className="px-4 py-3 text-center"><RpeBadge value={court?.legs} /></td>
                                                        <td className="px-4 py-3 text-center"><RpeBadge value={gym?.rpe} /></td>
                                                        <td className="px-4 py-3 text-center">
                                                            {wellness ? (
                                                                <div className="flex flex-col gap-0.5 items-center text-xs text-slate-600">
                                                                    {wellness.sleep !== undefined && <span>😴 {wellness.sleep}h</span>}
                                                                    {wellness.fatigue !== undefined && <span>🔋 {wellness.fatigue}/10</span>}
                                                                    {wellness.soreness !== undefined && <span>💪 {wellness.soreness}/10</span>}
                                                                </div>
                                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                                        </td>
                                                        <td className="px-4 py-3 max-w-xs">
                                                            {(court?.notes || gym?.notes)
                                                                ? <p className="text-xs text-slate-500 truncate" title={court?.notes || gym?.notes}>💬 {court?.notes || gym?.notes}</p>
                                                                : <span className="text-slate-300 text-xs">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-200 inline-block"></span> Low (1–4)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-200 inline-block"></span> Moderate (5–7)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-200 inline-block"></span> High (8–10)</span>
                                    <span className="flex items-center gap-1 ml-auto"><AlertTriangle size={11} className="text-red-400" /> = Flagged player</span>
                                </div>
                            </div>
                        )}

                        {presentPlayers.length > 0 && overallSubmitted.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <div className="text-3xl mb-2">⏳</div>
                                <p className="font-medium">No survey responses recorded for this session yet.</p>
                                <p className="text-sm mt-1">Responses will appear here in real-time as players submit.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
