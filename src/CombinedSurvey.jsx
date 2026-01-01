import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { practiceDataService } from './services/practiceDataService';
import "./SurveyForm.css";

// --- Shared Constants & Helpers ---
const RPE_SHORT = {
    1: "Very very light",
    2: "Very light",
    3: "Light",
    4: "Moderate",
    5: "Somewhat hard",
    6: "Hard",
    7: "Very hard",
    8: "Extremely hard",
    9: "Near maximal",
    10: "Maximal",
};

const LEGS_SHORT = {
    1: "Fresh",
    2: "Very fresh",
    3: "Light",
    4: "Mild",
    5: "Noticeable",
    6: "Heavy",
    7: "Very heavy",
    8: "Extremely",
    9: "Almost exh.",
    10: "Completely",
};

function rpeShort(value) { return RPE_SHORT[value] || `${value}`; }
function legsShort(value) { return LEGS_SHORT[value] || `${value}`; }

function rpeEmoji(value) {
    const EMOJI = ["😀", "🙂", "😊", "😌", "😐", "😕", "😣", "😫", "😬", "😱"];
    return EMOJI[value - 1] || "🙂";
}

function legsEmoji(value) {
    const EMOJI = ["🟢", "🟢", "🟢", "🟡", "🟠", "🟠", "🔴", "🔴", "🔴", "🔴"];
    return EMOJI[value - 1] || "🟢";
}

const LEVELS = Array.from({ length: 10 }, (_, index) => index + 1);

const styles = {
    section: { marginTop: 16 },
    bar: {
        height: 6,
        borderRadius: 999,
        background: "linear-gradient(90deg,#6ee7b7,#60a5fa,#f59e0b,#ef4444)",
        position: "relative",
    },
    track: { position: "relative", height: 6 },
    thumb: {
        position: "absolute",
        top: -6,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
        border: "2px solid #3b82f6",
        transform: "translateX(-50%)",
        transition: "left 120ms ease, opacity 120ms ease",
    },
};

const QUESTION_LABELS = {
    rpe: "Court Intensity (RPE)",
    legs: "Leg Health / Freshness",
    gymRpe: "Gym Intensity (RPE)"
};

export default function CombinedSurvey() {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    // State
    const [presentPlayers, setPresentPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState("");

    // Form State
    const [courtRpe, setCourtRpe] = useState(null);
    const [legs, setLegs] = useState(null);
    const [gymRpe, setGymRpe] = useState(null);
    const [notes, setNotes] = useState("");

    // Submission Status
    const [courtStore, setCourtStore] = useState({});
    const [gymStore, setGymStore] = useState({});
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    // Load Data
    useEffect(() => {
        if (!sessionId) return;

        // Load players from local storage (set by PracticeLive)
        // We prefer the gym list if available, or just surveyPlayers
        const gymPlayers = localStorage.getItem(`gymSurveyPlayers_${sessionId}`);
        const courtPlayers = localStorage.getItem(`surveyPlayers_${sessionId}`);

        try {
            if (gymPlayers) {
                setPresentPlayers(JSON.parse(gymPlayers));
            } else if (courtPlayers) {
                setPresentPlayers(JSON.parse(courtPlayers));
            }
        } catch (err) {
            console.error('Failed to parse players', err);
        }

        // Subscribe to Firebase Data
        const unsubscribe = practiceDataService.subscribeToPracticeData(
            sessionId,
            (data) => {
                if (data?.surveyData) setCourtStore(data.surveyData);
                if (data?.gymSurveyData) setGymStore(data.gymSurveyData);
            }
        );

        return () => unsubscribe();
    }, [sessionId]);

    const handlePlayerChange = (e) => {
        const playerName = e.target.value;
        setSelectedPlayer(playerName);

        // Reset form
        setCourtRpe(null);
        setLegs(null);
        setGymRpe(null);
        setNotes("");

        // Check existing
        const hasCourt = courtStore[playerName];
        const hasGym = gymStore[playerName];

        if (hasCourt && hasGym) {
            setError("ℹ️ You have already completed both surveys.");
        } else if (hasCourt) {
            setError("ℹ️ You have completed the Court survey.");
        } else if (hasGym) {
            setError("ℹ️ You have completed the Gym survey.");
        } else {
            setError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlayer) return;

        // We allow partial submission if user only fills one side, but ideally both
        // For this combined view, we enforce at least one RPE to be selected
        if (courtRpe === null && gymRpe === null) {
            setError("Please fill out at least one section.");
            return;
        }

        try {
            const promises = [];
            const timestamp = new Date().toISOString();

            // Submit Court Data
            if (courtRpe !== null && legs !== null) {
                promises.push(practiceDataService.updateSurveyResponse(sessionId, selectedPlayer, {
                    rpe: courtRpe,
                    legs: legs,
                    notes: notes.trim(), // Shared notes
                    savedAt: timestamp
                }));
            }

            // Submit Gym Data
            if (gymRpe !== null) {
                promises.push(practiceDataService.updateGymSurveyResponse(sessionId, selectedPlayer, {
                    rpe: gymRpe,
                    notes: notes.trim(), // Shared notes
                    savedAt: timestamp
                }));
            }

            await Promise.all(promises);

            // Success UX
            setCourtRpe(null);
            setLegs(null);
            setGymRpe(null);
            setNotes("");
            setSelectedPlayer("");
            setError("");
            setShowSuccess(true);

        } catch (err) {
            console.error("Submission failed", err);
            setError("Failed to save. Please try again.");
        }
    };

    // Reusable Slider Component
    const RenderSlider = ({ label, value, setText, onChange, type = 'rpe' }) => {
        const hasValue = typeof value === "number";
        const displayValue = hasValue ? value : 5;
        const emojiFor = type === 'legs' ? legsEmoji : rpeEmoji;
        const shortFor = type === 'legs' ? legsShort : rpeShort;

        const thumbStyle = {
            ...styles.thumb,
            left: `${((displayValue - 1) / 9) * 100}%`,
            opacity: hasValue ? 1 : 0.4,
        };

        return (
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <label className="font-semibold text-gray-700">{label}</label>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {hasValue ? `${value} - ${shortFor(value)}` : 'Select...'}
                    </span>
                </div>

                <div className="relative h-12 select-none touch-none">
                    {/* Track */}
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 px-2">
                        <div style={styles.bar}>
                            <div style={styles.track}>
                                <div style={thumbStyle} />
                            </div>
                        </div>
                        <input
                            type="range"
                            min="1" max="10" step="1"
                            value={displayValue}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                    </div>

                    {/* Ticks/Numbers */}
                    <div className="absolute top-8 left-0 w-full flex justify-between px-1">
                        {LEVELS.map(l => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => onChange(l)}
                                className={`
                            w-8 h-8 flex flex-col items-center justify-center rounded-lg transition-all
                            ${value === l ? 'bg-gray-800 text-white scale-110 shadow-md' : 'text-gray-400 hover:bg-gray-100'}
                        `}
                            >
                                <span className="text-sm font-bold">{l}</span>
                                {value === l && <span className="text-xs -mt-1">{emojiFor(l)}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- Render ---

    // Calculate completion
    const completedCount = presentPlayers.filter(p =>
        courtStore[p.name] && gymStore[p.name]
    ).length;

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                        ✓
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Awesome!</h2>
                    <p className="text-gray-500 mb-8">Your feedback has been saved.</p>
                    <button
                        onClick={() => setShowSuccess(false)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Next Player
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/practice/${sessionId}`)} className="text-gray-400 hover:text-gray-600">
                            <span className="text-2xl">←</span>
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Combined Feedback</h1>
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                        {completedCount} / {presentPlayers.length} Complete
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Player Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Select Player</label>
                    <select
                        value={selectedPlayer}
                        onChange={handlePlayerChange}
                        className="w-full text-lg p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50"
                    >
                        <option value="">Choose your name...</option>
                        {presentPlayers.map(p => {
                            const isDone = courtStore[p.name] && gymStore[p.name];
                            return (
                                <option key={p.id} value={p.name}>
                                    {p.name} {isDone ? '✓' : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {selectedPlayer && (
                    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Court Section */}
                            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 relative group hover:border-orange-300 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl text-orange-900 pointer-events-none">
                                    🏀
                                </div>
                                <h2 className="text-xl font-bold text-orange-900 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-lg">🏀</span>
                                    Court Session
                                </h2>

                                <RenderSlider
                                    label={QUESTION_LABELS.rpe}
                                    value={courtRpe}
                                    onChange={setCourtRpe}
                                />
                                <RenderSlider
                                    label={QUESTION_LABELS.legs}
                                    value={legs}
                                    type="legs"
                                    onChange={setLegs}
                                />
                            </div>

                            {/* Gym Section */}
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 relative group hover:border-blue-300 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl text-blue-900 pointer-events-none">
                                    💪
                                </div>
                                <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-lg">💪</span>
                                    Gym Session
                                </h2>

                                <RenderSlider
                                    label={QUESTION_LABELS.gymRpe}
                                    value={gymRpe}
                                    onChange={setGymRpe}
                                />

                                <div className="mt-8 p-4 bg-blue-100/50 rounded-xl">
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        <strong>Tip:</strong> For gym RPE, consider the heaviness of the weights relative to your max effort today.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Common Notes */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Notes & Comments (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any injuries, soreness, or specific feedback..."
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none h-32"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                                <span className="text-xl">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!courtRpe && !gymRpe}
                            className={`
                        w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 active:scale-95
                        ${(!courtRpe && !gymRpe)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                                }
                    `}
                        >
                            Submit Combined Feedback
                        </button>
                    </form>
                )}

            </main>
        </div>
    );
}
