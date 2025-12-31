import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayerModal from '../common/VideoPlayerModal'; // Import Video Player

const IndividualPlanBuilderModal = ({
    isOpen,
    onClose,
    plan,
    onUpdatePlan, // function(updatedPlanObject)
    exercises, // Library exercises (for reference if needed, mostly we drop data)
    onMinimize,
    onSave,
    isActive,
    onActivate,
    planName,
    onRenamePlan,
    draggedExercise, // Received from parent
    defaultTVMode // New prop
}) => {
    // --- Window Management (Position/Size) ---
    const [position, setPosition] = useState({ x: 100, y: 50 });
    const [size, setSize] = useState({ width: 900, height: 600 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isTVMode, setIsTVMode] = useState(defaultTVMode || false);
    const [playingVideoUrl, setPlayingVideoUrl] = useState(null); // Video state
    const resizeRef = useRef(null);

    // --- Internal State ---
    // We expect 'plan' to be the full plan object. 
    // If plan.players doesn't exist, we initialize it.
    // const [players, setPlayers] = useState(plan?.players || []);

    // Actually, better to rely on parent passing 'plan' and we call onUpdatePlan({...plan, players: ...})

    const players = plan?.players || [];

    const handleMouseDown = (e) => {
        if (e.target.closest('.modal-header')) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleResizeStart = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragOffset({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({
                x: Math.max(0, e.clientX - dragOffset.x),
                y: Math.max(0, e.clientY - dragOffset.y)
            });
        } else if (isResizing) {
            const deltaX = e.clientX - dragOffset.x;
            const deltaY = e.clientY - dragOffset.y;
            setSize(prev => ({
                width: Math.max(600, prev.width + deltaX),
                height: Math.max(400, prev.height + deltaY)
            }));
            setDragOffset({ x: e.clientX, y: e.clientY });
        }
    }, [isDragging, isResizing, dragOffset]);

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove]);


    // --- Logic ---

    const addPlayer = () => {
        const newPlayer = {
            id: crypto.randomUUID(),
            name: `Player ${players.length + 1}`,
            exercises: []
        };
        const updatedPlayers = [...players, newPlayer];
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    const updatePlayerName = (playerId, newName) => {
        const updatedPlayers = players.map(p =>
            p.id === playerId ? { ...p, name: newName } : p
        );
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    const deletePlayer = (playerId) => {
        if (!window.confirm("Remove this player?")) return;
        const updatedPlayers = players.filter(p => p.id !== playerId);
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    // Drag & Drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDropOnPlayer = (e, playerId) => {
        e.preventDefault();

        if (!draggedExercise) return;

        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const newExercise = {
            ...draggedExercise,
            id: crypto.randomUUID(),
            sets: '2',
            reps: '6',
            repType: 'reps',
            notes: '', // Initialize notes
            videoUrl: draggedExercise.videoUrl || '' // Preserve video URL
        };

        const updatedPlayers = [...players];
        const playerExercises = [...(updatedPlayers[playerIndex].exercises || [])];
        playerExercises.push(newExercise);
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: playerExercises };

        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    const updateExerciseField = (playerId, bgExerciseIndex, field, value) => {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const updatedPlayers = [...players];
        const playerExercises = [...updatedPlayers[playerIndex].exercises];
        playerExercises[bgExerciseIndex] = { ...playerExercises[bgExerciseIndex], [field]: value };
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: playerExercises };

        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    if (!isOpen) return null;

    return (
        <div
            className={`individual-plan-modal fixed z-50 flex flex-col border border-gray-200 shadow-2xl rounded-lg
                ${isTVMode ? '!fixed !inset-0 !w-full !h-full !rounded-none bg-gray-900 border-none' : 'bg-white'}`}
            style={!isTVMode ? {
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height
            } : {}}
            onMouseDown={!isTVMode ? handleMouseDown : undefined}
        >
            {/* Header */}
            <div className={`modal-header p-3 border-b flex justify-between items-center select-none
                ${isTVMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 cursor-move'}`}>
                <div className="flex items-center gap-2">
                    <input
                        value={planName || ''}
                        onChange={(e) => onRenamePlan(e.target.value)}
                        className="font-bold text-lg bg-transparent border-none focus:ring-0"
                        placeholder="Plan Name"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {!isTVMode && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/gym?planId=${plan.id}&tv=true`;
                                    window.open(url, '_blank');
                                }}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                                ↗️ Test Link
                            </button>
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/gym?planId=${plan.id}&tv=true`;
                                    navigator.clipboard.writeText(url);
                                    alert('Link copied to clipboard! Share it with your athletes.');
                                }}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200"
                            >
                                🔗 Copy Share Link
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsTVMode(!isTVMode)}
                        className={`px-3 py-1 rounded font-medium text-sm transition-colors
                        ${isTVMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                    >
                        {isTVMode ? 'Exit TV Mode' : '📺 TV Mode'}
                    </button>
                    {!isTVMode && (
                        <>
                            <button onClick={addPlayer} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-medium text-sm">
                                + Add Player
                            </button>
                            <button onClick={onSave} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 font-medium text-sm">
                                Save
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className={`text-xl font-bold px-2 ${isTVMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                        ×
                    </button>
                </div>
            </div>

            {/* Content - Horizontal Scroll */}
            <div className={`flex-1 overflow-x-auto overflow-y-hidden p-4 ${isTVMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="flex gap-4 h-full">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className={`player-column flex flex-col h-full shadow rounded-lg transition-all
                                ${isTVMode
                                    ? 'min-w-[400px] w-[400px] bg-gray-800 border-none'
                                    : 'min-w-[250px] w-[250px] bg-white border border-gray-200'}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnPlayer(e, player.id)}
                        >
                            {/* Player Header */}
                            <div className={`p-2 border-b flex justify-between items-center ${isTVMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                                <input
                                    value={player.name}
                                    disabled={isTVMode}
                                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                                    className={`font-bold text-center bg-transparent w-full focus:outline-none rounded px-1
                                        ${isTVMode ? 'text-yellow-400 text-3xl tracking-widest uppercase' : 'text-gray-800 focus:bg-white'}`}
                                />
                                {!isTVMode && (
                                    <button onClick={() => deletePlayer(player.id)} className="text-red-400 hover:text-red-600 ml-1 text-lg">×</button>
                                )}
                            </div>

                            {/* Exercises List (Vertical) */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {player.exercises && player.exercises.map((ex, idx) => {
                                    // Lookup video URL from library if missing on specific exercise instance
                                    const libraryExercise = exercises?.find(e => e.name === ex.name);
                                    const effectiveVideoUrl = ex.videoUrl || libraryExercise?.videoUrl;

                                    return (
                                        <div key={idx} className={`flex items-center gap-2 rounded p-2 shadow-sm
                                        ${isTVMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border'}`}>
                                            <img
                                                src={ex.imageUrl}
                                                alt={ex.name}
                                                className={`${isTVMode ? 'w-32 h-32' : 'w-16 h-16'} object-contain bg-white rounded ${isTVMode && effectiveVideoUrl ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                onClick={() => {
                                                    if (isTVMode && effectiveVideoUrl) {
                                                        setPlayingVideoUrl(effectiveVideoUrl);
                                                    }
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold truncate ${isTVMode ? 'text-xl text-white' : 'text-xs text-gray-800'}`}>
                                                    {ex.name}
                                                </p>
                                                <div className={`${isTVMode ? 'text-lg text-gray-300 font-bold' : 'text-xs text-gray-500'} flex flex-col gap-1`}>
                                                    {/* Sets & Reps Inputs */}
                                                    {!isTVMode ? (
                                                        <div className="flex gap-1 items-center">
                                                            <input
                                                                className="w-8 border rounded px-1 text-center"
                                                                value={ex.sets}
                                                                onChange={(e) => updateExerciseField(player.id, idx, 'sets', e.target.value)}
                                                            />
                                                            <span>x</span>
                                                            <input
                                                                className="w-8 border rounded px-1 text-center"
                                                                value={ex.reps}
                                                                onChange={(e) => updateExerciseField(player.id, idx, 'reps', e.target.value)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span>{ex.sets || '-'} x {ex.reps || '-'}</span>
                                                    )}

                                                    {/* Notes Input */}
                                                    {!isTVMode ? (
                                                        <textarea
                                                            className="w-full border rounded px-1 text-[10px] resize-none overflow-hidden h-6 focus:h-16 transition-all"
                                                            placeholder="Notes..."
                                                            value={ex.notes || ''}
                                                            onChange={(e) => updateExerciseField(player.id, idx, 'notes', e.target.value)}
                                                        />
                                                    ) : (
                                                        ex.notes && <div className="text-yellow-400 text-sm mt-1 font-normal italic">{ex.notes}</div>
                                                    )}

                                                    {/* Video Icon */}
                                                    {effectiveVideoUrl && (
                                                        <button
                                                            onClick={() => setPlayingVideoUrl(effectiveVideoUrl)}
                                                            className={`text-red-600 hover:text-red-700 font-bold flex items-center gap-1 ${isTVMode ? 'mt-2 bg-white px-2 py-1 rounded-full w-fit' : 'text-[10px] mt-1'}`}
                                                        >
                                                            ▶ <span className={isTVMode ? 'text-sm text-black font-semibold' : ''}>Video</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Delete Exercise Button */}
                                            {!isTVMode && (
                                                <button
                                                    onClick={() => {
                                                        const newExs = [...player.exercises];
                                                        newExs.splice(idx, 1);
                                                        const updatedPlayers = players.map(p =>
                                                            p.id === player.id ? { ...p, exercises: newExs } : p
                                                        );
                                                        onUpdatePlan({ ...plan, players: updatedPlayers });
                                                    }}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!player.exercises || player.exercises.length === 0) && !isTVMode && (
                                    <div className="text-center text-gray-400 text-sm mt-10 italic">
                                        Drop exercises here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Empty State / Add Place */}
                    {players.length === 0 && (
                        <div className="flex items-center justify-center w-full h-full text-gray-400">
                            <button onClick={addPlayer} className="flex flex-col items-center hover:text-blue-600 transition">
                                <span className="text-4xl">+</span>
                                <span>Add a player to start</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Resizer */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 rounded-tl"
                onMouseDown={handleResizeStart}
            />
            {/* Video Player */}
            {playingVideoUrl && (
                <VideoPlayerModal
                    isOpen={!!playingVideoUrl}
                    videoUrl={playingVideoUrl}
                    onClose={() => setPlayingVideoUrl(null)}
                />
            )}
        </div>
    );
};

export default IndividualPlanBuilderModal;
