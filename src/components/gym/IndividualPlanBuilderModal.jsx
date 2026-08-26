/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayerModal from '../common/VideoPlayerModal';

const IndividualPlanBuilderModal = ({
    isOpen,
    onClose,
    plan,
    onUpdatePlan,
    exercises,
    onMinimize,
    onSave,
    onDelete,
    isActive,
    onActivate,
    planName,
    onRenamePlan,
    draggedExercise,
    defaultTVMode,
    // New prop: last clicked exercise from library (click-to-add)
    pendingExercise,
    onPendingExerciseConsumed,
}) => {
    // --- Window Management ---
    const [position, setPosition] = useState({ x: 100, y: 50 });
    const [size, setSize] = useState({ width: 960, height: 620 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isTVMode, setIsTVMode] = useState(defaultTVMode || false);
    const [playingVideoUrl, setPlayingVideoUrl] = useState(null);

    // --- Active player for click-to-add ---
    const players = plan?.players || [];
    const [activePlayerId, setActivePlayerId] = useState(null);

    // Auto-select first player when players change
    useEffect(() => {
        if (players.length > 0 && !activePlayerId) {
            setActivePlayerId(players[0].id);
        }
    }, [players.length]);

    // --- Click-to-Add: consume pendingExercise from library ---
    useEffect(() => {
        if (pendingExercise && activePlayerId && !isTVMode) {
            const playerIndex = players.findIndex(p => p.id === activePlayerId);
            if (playerIndex === -1) return;

            const newExercise = {
                ...pendingExercise,
                id: crypto.randomUUID(),
                sets: '3',
                reps: '8',
                repType: 'reps',
                notes: '',
                selectedForToday: true,
                videoUrl: pendingExercise.videoUrl || ''
            };

            const updatedPlayers = [...players];
            const playerExercises = [...(updatedPlayers[playerIndex].exercises || [])];
            playerExercises.push(newExercise);
            updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: playerExercises };
            onUpdatePlan({ ...plan, players: updatedPlayers });

            if (onPendingExerciseConsumed) onPendingExerciseConsumed();
        }
    }, [pendingExercise]);

    // --- Drag resizer ---
    const handleResizeStart = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragOffset({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('.modal-header')) {
            setIsDragging(true);
            setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({ x: Math.max(0, e.clientX - dragOffset.x), y: Math.max(0, e.clientY - dragOffset.y) });
        } else if (isResizing) {
            const deltaX = e.clientX - dragOffset.x;
            const deltaY = e.clientY - dragOffset.y;
            setSize(prev => ({ width: Math.max(640, prev.width + deltaX), height: Math.max(420, prev.height + deltaY) }));
            setDragOffset({ x: e.clientX, y: e.clientY });
        }
    }, [isDragging, isResizing, dragOffset]);

    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

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

    // --- Player CRUD ---
    const addPlayer = () => {
        const newPlayer = { id: crypto.randomUUID(), name: `Player ${players.length + 1}`, exercises: [] };
        const updatedPlayers = [...players, newPlayer];
        onUpdatePlan({ ...plan, players: updatedPlayers });
        setActivePlayerId(newPlayer.id);
    };

    const updatePlayerName = (playerId, newName) => {
        onUpdatePlan({ ...plan, players: players.map(p => p.id === playerId ? { ...p, name: newName } : p) });
    };

    const deletePlayer = (playerId) => {
        if (!window.confirm("Remove this player?")) return;
        const updated = players.filter(p => p.id !== playerId);
        onUpdatePlan({ ...plan, players: updated });
        if (activePlayerId === playerId) setActivePlayerId(updated[0]?.id || null);
    };

    // --- Drag & Drop (legacy) ---
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

    const handleDropOnPlayer = (e, playerId) => {
        e.preventDefault();
        if (!draggedExercise) return;
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const newExercise = {
            ...draggedExercise,
            id: crypto.randomUUID(),
            sets: '3', reps: '8', repType: 'reps',
            notes: '',
            selectedForToday: true,
            videoUrl: draggedExercise.videoUrl || ''
        };

        const updatedPlayers = [...players];
        const exs = [...(updatedPlayers[playerIndex].exercises || [])];
        exs.push(newExercise);
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: exs };
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    const updateExerciseField = (playerId, exIdx, field, value) => {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;
        const updatedPlayers = [...players];
        const exs = [...updatedPlayers[playerIndex].exercises];
        exs[exIdx] = { ...exs[exIdx], [field]: value };
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: exs };
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    const toggleSelectedForToday = (playerId, exIdx) => {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;
        const updatedPlayers = [...players];
        const exs = [...updatedPlayers[playerIndex].exercises];
        exs[exIdx] = { ...exs[exIdx], selectedForToday: !(exs[exIdx].selectedForToday !== false) };
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], exercises: exs };
        onUpdatePlan({ ...plan, players: updatedPlayers });
    };

    if (!isOpen) return null;

    return (
        <div
            className={`individual-plan-modal fixed z-50 flex flex-col border border-gray-200 shadow-2xl rounded-lg
                ${isTVMode ? '!fixed !inset-0 !w-full !h-full !rounded-none bg-gray-900 border-none' : 'bg-white'}`}
            style={!isTVMode ? { left: position.x, top: position.y, width: size.width, height: size.height } : {}}
            onMouseDown={!isTVMode ? handleMouseDown : undefined}
        >
            {/* Header */}
            <div className={`modal-header p-3 border-b flex justify-between items-center select-none
                ${isTVMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 cursor-move'}`}>
                <div className="flex items-center gap-2">
                    <input
                        value={planName || ''}
                        onChange={(e) => onRenamePlan(e.target.value)}
                        className={`font-bold text-lg bg-transparent border-none focus:ring-0 ${isTVMode ? 'text-white' : ''}`}
                        placeholder="Plan Name"
                    />
                    {!isTVMode && activePlayerId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            ➡ Adding to: <strong>{players.find(p => p.id === activePlayerId)?.name || '—'}</strong>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
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
                                💾 Save
                            </button>
                            <button
                                onClick={onDelete}
                                className="px-2 py-1 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Permanently delete this plan"
                            >
                                🗑
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
                    {players.map((player) => {
                        const isActivePlayer = player.id === activePlayerId;
                        const allExercises = player.exercises || [];
                        const activeExercises = isTVMode
                            ? allExercises.filter(ex => ex.selectedForToday !== false)
                            : allExercises;
                        const activeCount = allExercises.filter(ex => ex.selectedForToday !== false).length;

                        return (
                            <div
                                key={player.id}
                                className={`player-column flex flex-col h-full shadow-md rounded-lg transition-all cursor-pointer
                                    ${isTVMode
                                        ? 'min-w-[420px] w-[420px] bg-gray-800 border-none'
                                        : isActivePlayer
                                            ? 'min-w-[260px] w-[260px] bg-white border-2 border-blue-500 shadow-blue-100'
                                            : 'min-w-[240px] w-[240px] bg-white border border-gray-200 opacity-80'
                                    }`}
                                onClick={() => !isTVMode && setActivePlayerId(player.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnPlayer(e, player.id)}
                            >
                                {/* Player Header */}
                                <div className={`p-2 border-b flex justify-between items-center ${isTVMode ? 'bg-gray-800 border-gray-700' : isActivePlayer ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                                    <div className="flex-1">
                                        <input
                                            value={player.name}
                                            disabled={isTVMode}
                                            onChange={(e) => { e.stopPropagation(); updatePlayerName(player.id, e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`font-bold text-center bg-transparent w-full focus:outline-none rounded px-1
                                                ${isTVMode ? 'text-yellow-400 text-3xl tracking-widest uppercase' : isActivePlayer ? 'text-blue-700' : 'text-gray-800 focus:bg-white'}`}
                                        />
                                        {isTVMode && (
                                            <div className="text-center text-slate-400 text-sm mt-1">
                                                {activeCount} of {allExercises.length} active today
                                            </div>
                                        )}
                                        {!isTVMode && (
                                            <div className="text-center text-[10px] text-slate-400 mt-0.5">
                                                {activeCount}/{allExercises.length} active
                                            </div>
                                        )}
                                    </div>
                                    {!isTVMode && (
                                        <button onClick={(e) => { e.stopPropagation(); deletePlayer(player.id); }} className="text-red-400 hover:text-red-600 ml-1 text-lg">×</button>
                                    )}
                                </div>

                                {/* Exercises List */}
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {activeExercises.map((ex, idx) => {
                                        // Real index in allExercises for updates
                                        const realIdx = allExercises.indexOf(ex);
                                        const libraryExercise = exercises?.find(e => e.name === ex.name);
                                        const effectiveVideoUrl = ex.videoUrl || libraryExercise?.videoUrl;
                                        const isSelectedToday = ex.selectedForToday !== false;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`flex items-center gap-2 rounded p-2 shadow-sm transition-opacity
                                                    ${isTVMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border'}
                                                    ${!isTVMode && !isSelectedToday ? 'opacity-40' : ''}`}
                                            >
                                                {/* Today toggle (edit mode only) */}
                                                {!isTVMode && (
                                                    <button
                                                        title={isSelectedToday ? "Active today — click to deactivate" : "Inactive today — click to activate"}
                                                        onClick={() => toggleSelectedForToday(player.id, realIdx)}
                                                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${isSelectedToday ? 'bg-green-500 border-green-600' : 'bg-gray-200 border-gray-300'}`}
                                                    />
                                                )}

                                                <img
                                                    src={ex.imageUrl}
                                                    alt={ex.name}
                                                    className={`${isTVMode ? 'w-32 h-32' : 'w-14 h-14'} object-contain bg-white rounded ${isTVMode && effectiveVideoUrl ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                    onClick={() => { if (isTVMode && effectiveVideoUrl) setPlayingVideoUrl(effectiveVideoUrl); }}
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate ${isTVMode ? 'text-xl text-white' : 'text-xs text-gray-800'}`}>
                                                        {ex.name}
                                                    </p>
                                                    <div className={`${isTVMode ? 'text-lg text-gray-300 font-bold' : 'text-xs text-gray-500'} flex flex-col gap-1`}>
                                                        {!isTVMode ? (
                                                            <div className="flex gap-1 items-center">
                                                                <input className="w-8 border rounded px-1 text-center" value={ex.sets} onChange={(e) => updateExerciseField(player.id, realIdx, 'sets', e.target.value)} />
                                                                <span>x</span>
                                                                <input className="w-8 border rounded px-1 text-center" value={ex.reps} onChange={(e) => updateExerciseField(player.id, realIdx, 'reps', e.target.value)} />
                                                            </div>
                                                        ) : (
                                                            <span className="text-white">{ex.sets || '-'} × {ex.reps || '-'}</span>
                                                        )}

                                                        {!isTVMode ? (
                                                            <textarea
                                                                className="w-full border rounded px-1 text-[10px] resize-none overflow-hidden h-6 focus:h-16 transition-all"
                                                                placeholder="Notes..."
                                                                value={ex.notes || ''}
                                                                onChange={(e) => updateExerciseField(player.id, realIdx, 'notes', e.target.value)}
                                                            />
                                                        ) : (
                                                            ex.notes && <div className="text-yellow-400 text-sm mt-1 font-normal italic">{ex.notes}</div>
                                                        )}

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

                                                {!isTVMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newExs = allExercises.filter((_, i) => i !== realIdx);
                                                            onUpdatePlan({ ...plan, players: players.map(p => p.id === player.id ? { ...p, exercises: newExs } : p) });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 ml-1"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {allExercises.length === 0 && !isTVMode && (
                                        <div className={`text-center text-sm mt-10 italic ${isActivePlayer ? 'text-blue-400' : 'text-gray-400'}`}>
                                            {isActivePlayer
                                                ? '✨ Click exercises from the library to add here'
                                                : 'Select player & click exercises from library'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

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
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 rounded-tl" onMouseDown={handleResizeStart} />

            {/* Video Player */}
            {playingVideoUrl && (
                <VideoPlayerModal isOpen={!!playingVideoUrl} videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />
            )}
        </div>
    );
};

export default IndividualPlanBuilderModal;
