import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

import html2canvas from 'html2canvas'; // Import html2canvas
import VideoPlayerModal from '../common/VideoPlayerModal'; // Import Video Player

// Updated colors with thicker/darker borders
const EXERCISE_COLORS = [
  { id: 'default', bg: 'bg-white', border: 'border-gray-300', label: 'Default' },
  { id: 'red', bg: 'bg-red-50', border: 'border-red-500', label: 'Red (Center)' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-500', label: 'Blue (Guard)' },
  { id: 'green', bg: 'bg-green-50', border: 'border-green-500', label: 'Green' },
  { id: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-500', label: 'Yellow' }
];

const ColorPicker = ({ value, onChange }) => (
  <div className="flex gap-2 mt-2 justify-center">
    {EXERCISE_COLORS.map(color => (
      <button
        key={color.id}
        onClick={() => onChange(color.id)}
        className={`w-6 h-6 rounded-full border-2 ${color.bg.replace('50', '200')} ${value === color.id ? 'ring-2 ring-offset-1 ring-gray-600' : ''
          }`}
        title={color.label}
        type="button"
      />
    ))}
  </div>
);

const CompactRepTypeSelect = ({ value, onChange, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="plan-select flex-1 min-w-[60px]"
    disabled={disabled}
  >
    <option value="reps">reps</option>
    <option value="per side">/side</option>
    <option value="sec">sec</option>
  </select>
);

const PlanBuilderModal = ({
  isOpen,
  onClose,
  plan,
  onUpdatePlan,
  isEditMode,
  onToggleEditMode,
  exercises,
  onAddExercise,
  initialPosition,
  planName,
  onDuplicate,
  onMinimize,
  onSave,
  isActive,
  onActivate,
  onRenamePlan
}) => {
  const [position, setPosition] = useState(
    initialPosition || { x: window.innerWidth - 520, y: 20 }
  );
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const previousSize = useRef(null);
  const contentRef = useRef(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  // Removed Print refs/state
  const [isTVMode, setIsTVMode] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null); // Video state
  const [activeSection, setActiveSection] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(planName);
  const nameInputRef = useRef(null);
  const resizeRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.plan-builder-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleResizeMouseDown = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  const handleResize = useCallback((e) => {
    if (!resizeRef.current) return;

    const newWidth = e.clientX - resizeRef.current.getBoundingClientRect().left;
    const newHeight = e.clientY - resizeRef.current.getBoundingClientRect().top;

    setSize({
      width: Math.max(400, newWidth),
      height: Math.max(300, newHeight)
    });
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const handleMouseMove = (e) => handleResize(e);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleResize]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      if (isTVMode) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
      });
    } else if (isResizing) {
      const deltaX = e.clientX - dragOffset.x;
      const deltaY = e.clientY - dragOffset.y;
      const minWidth = 400;
      const minHeight = 300;
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;

      setSize(prev => ({
        width: Math.min(maxWidth, Math.max(minWidth,
          resizeDirection.includes('e') ? prev.width + deltaX :
            resizeDirection.includes('w') ? prev.width - deltaX : prev.width
        )),
        height: Math.min(maxHeight, Math.max(minHeight,
          resizeDirection.includes('s') ? prev.height + deltaY :
            resizeDirection.includes('n') ? prev.height - deltaY : prev.height
        ))
      }));

      setDragOffset({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, dragOffset, resizeDirection, size, isTVMode]);

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

  useEffect(() => {
    if (plan.length === 0) {
      onUpdatePlan([{ type: 'break', title: 'Start' }]);
    }
    else if (plan.length > 0 && plan[0].type !== 'break') {
      onUpdatePlan([{ type: 'break', title: 'Start' }, ...plan]);
    }
  }, []);

  const addRowBreak = () => {
    onUpdatePlan([...plan, {
      type: 'break',
      title: 'New Block' // Default title
    }]);
  };

  const deleteSection = (rowIndex) => {
    if (!window.confirm("Delete this entire block and all its exercises?")) return;

    const newPlan = [];
    let currentSectionIndex = -1;
    let skipping = false;

    // Reconstruct the plan, skipping the target section
    for (let i = 0; i < plan.length; i++) {
      if (plan[i].type === 'break') {
        currentSectionIndex++;
        if (currentSectionIndex === rowIndex) {
          skipping = true;
          continue; // Skip the break itself
        } else {
          skipping = false;
        }
      }

      if (!skipping) {
        newPlan.push(plan[i]);
      }
    }

    // Ensure at least one section exists
    if (newPlan.length === 0 || newPlan[0].type !== 'break') {
      newPlan.unshift({ type: 'break', title: 'Start' });
    }

    onUpdatePlan(newPlan);
  };

  const updateSectionTitle = (rowIndex, newTitle) => {
    const newPlan = [...plan];
    let breakCount = 0;

    for (let i = 0; i < newPlan.length; i++) {
      if (newPlan[i].type === 'break') {
        if (breakCount === rowIndex) {
          newPlan[i].title = newTitle;
          break;
        }
        breakCount++;
      }
    }

    onUpdatePlan(newPlan);
  };

  const enrichedPlan = plan.map(item => {
    if (item.type === 'break') return item;

    const exercise = exercises.find(e => e.id === item.id);
    if (!exercise) return item;

    return {
      ...item,
      name: exercise.name,
      imageUrl: exercise.imageUrl,
      muscleGroup: exercise.muscleGroup
    };
  });

  const rows = enrichedPlan.reduce((acc, item) => {
    if (item.type === 'break') {
      acc.push([]);
    } else {
      if (acc.length === 0) acc.push([]);
      acc[acc.length - 1].push(item);
    }
    return acc;
  }, []);

  const updateExercise = (index, updates) => {
    const newPlan = [...plan];
    newPlan[index] = { ...newPlan[index], ...updates };
    onUpdatePlan(newPlan);
  };

  const handleClearPlan = () => {
    if (window.confirm('Clear current plan and start new?')) {
      onUpdatePlan([]);
    }
  };

  // Drag and drop logic...
  const handleDragStart = (e, globalIndex) => {
    e.stopPropagation();
    setDraggedIndex(globalIndex);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedPlan = [...plan];
    const draggedItem = { ...updatedPlan[draggedIndex] };

    updatedPlan.splice(draggedIndex, 1);

    if (updatedPlan[targetIndex]?.type === 'break') {
      let insertIndex = targetIndex;
      while (insertIndex > 0 && updatedPlan[insertIndex - 1]?.type === 'break') {
        insertIndex--;
      }
      updatedPlan.splice(insertIndex, 0, draggedItem);
    } else {
      updatedPlan.splice(targetIndex, 0, draggedItem);
    }

    onUpdatePlan(updatedPlan);
    setDraggedIndex(null);
  };

  // Removed exportToPDF

  const toggleTVMode = () => {
    setIsTVMode(!isTVMode);
    if (!isTVMode) {
      previousSize.current = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y
      };
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setPosition({ x: 0, y: 0 });
      setIsMaximized(true);
      onToggleEditMode(false);
    } else {
      if (previousSize.current) {
        setSize({
          width: previousSize.current.width,
          height: previousSize.current.height
        });
        setPosition({
          x: previousSize.current.x,
          y: previousSize.current.y
        });
      } else {
        setSize({ width: 600, height: 400 });
        setPosition({ x: 20, y: 20 });
      }
      setIsMaximized(false);
    }
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onRenamePlan(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTempName(planName);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleMaximize = () => {
    if (isTVMode) return;

    if (!isMaximized) {
      previousSize.current = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y
      };
      setSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      });
      setPosition({ x: 20, y: 20 });
    } else {
      setSize({
        width: previousSize.current.width,
        height: previousSize.current.height
      });
      setPosition({
        x: previousSize.current.x,
        y: previousSize.current.y
      });
    }
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`modal-container ${isActive ? 'active-plan' : ''} ${isTVMode ? 'fixed inset-0 z-[100]' : ''}`}
      style={!isTVMode ? {
        left: position.x,
        top: position.y,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none'
      } : {}}
      ref={resizeRef}
      onMouseDown={handleMouseDown}
    >
      <div className={`${isTVMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg flex flex-col h-full relative ${isTVMode ? 'rounded-none' : ''}`}>
        <div className={`plan-builder-header ${isTVMode ? '!bg-gray-800 !border-gray-700' : ''}`}>
          <div className="flex justify-between items-center p-3">
            <div className="flex items-center gap-2">
              {!isTVMode && (
                <>
                  <button
                    onClick={onMinimize}
                    className="minimize-button"
                    title="Minimize"
                  >
                    —
                  </button>
                  <button
                    onClick={handleMaximize}
                    className="maximize-button"
                    title={isMaximized ? "Restore" : "Maximize"}
                  >
                    {isMaximized ? '❐' : '⛶'}
                  </button>
                </>
              )}
              {isEditingName && !isTVMode ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleKeyDown}
                  className="px-2 py-1 border rounded text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <h2
                  className={`font-semibold text-lg ${!isTVMode ? 'cursor-pointer hover:bg-gray-100' : ''} px-2 py-1 rounded`}
                  onClick={() => !isTVMode && setIsEditingName(true)}
                  title={!isTVMode ? "Click to edit name" : ""}
                >
                  {planName || 'Workout Plan'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTVMode}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isTVMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
              >
                {isTVMode ? 'Exit TV Mode' : '📺 TV Mode'}
              </button>

              {!isTVMode && (
                <>
                  {/* Add Section Button - Restored Feature */}
                  <button
                    onClick={addRowBreak}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-medium"
                    title="Add a new block/section"
                  >
                    + Block
                  </button>

                  <button
                    onClick={onDuplicate}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    📋 Duplicate
                  </button>
                  <button
                    onClick={() => onSave()}
                    className="save-button"
                  >
                    💾 Save
                  </button>
                  {!isActive && (
                    <button
                      onClick={onActivate}
                      className="activate-button"
                    >
                      ⭐ Make Active
                    </button>
                  )}
                  <button
                    onClick={handleClearPlan}
                    className="text-sm px-2 py-1 text-gray-600 hover:text-red-600"
                  >
                    Clear Plan
                  </button>
                  <div className={`text-sm px-2 py-1 rounded ${isEditMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEditMode}
                        onChange={onToggleEditMode}
                        className="hidden"
                      />
                      {isEditMode ? '✏️ Edit Mode' : '👀 View Mode'}
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      if (plan.length > 0) {
                        onUpdatePlan(plan);
                      }
                      if (typeof onClose === 'function') {
                        onClose();
                      }
                    }}
                    className="icon-button"
                  >
                    ×
                  </button>
                </>
              )}
              {isTVMode && (
                <button onClick={toggleTVMode} className="icon-button">×</button>
              )}
            </div>
          </div>
        </div>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-2"
        >
          <div>
            {rows.map((row, rowIndex) => {
              const exerciseIndices = [];
              for (let i = 0; i < plan.length; i++) {
                if (plan[i].type !== 'break') {
                  exerciseIndices.push(i);
                }
              }

              return (
                <div key={rowIndex} className={`${isTVMode ? 'mb-2' : 'mb-8'}`}>

                  {/* Section Title & Controls */}
                  <div className={`${isTVMode ? 'mb-1' : 'mb-4'} flex items-center gap-2`}>
                    <input
                      type="text"
                      value={(() => {
                        let breakCount = 0;
                        for (let i = 0; i < plan.length; i++) {
                          if (plan[i].type === 'break') {
                            if (breakCount === rowIndex) {
                              return plan[i].title || '';
                            }
                            breakCount++;
                          }
                        }
                        return '';
                      })()}
                      onChange={(e) => updateSectionTitle(rowIndex, e.target.value)}
                      onFocus={(e) => isEditMode && e.target.select()}
                      disabled={!isEditMode || isTVMode}
                      className={`flex-1 px-4 py-2 text-lg font-medium border
                                rounded-md transition-colors ${isEditMode
                          ? 'border-gray-200 bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          : `border-transparent bg-transparent ${isTVMode ? 'text-yellow-400 font-bold tracking-widest uppercase' : 'text-gray-700'}`
                        }`}
                      placeholder={isEditMode && !isTVMode ? "Name this block..." : ""}
                    />
                    {isEditMode && !isTVMode && (
                      <button
                        onClick={() => deleteSection(rowIndex)}
                        className="text-red-500 hover:text-red-700 px-3 py-2 rounded hover:bg-red-50 text-sm font-medium"
                        title="Delete this block"
                      >
                        Delete Block
                      </button>
                    )}
                  </div>

                  {/* Grid Logic: Use grid-cols-6 for TV mode (explicit grid) */}
                  <div className={`plan-exercise-row ${isTVMode ? '!grid !grid-cols-6 !gap-2' : ''}`}>
                    {row.map((exercise, indexInRow) => {
                      let overallExerciseIndex = 0;
                      for (let r = 0; r < rowIndex; r++) {
                        overallExerciseIndex += rows[r].length;
                      }
                      overallExerciseIndex += indexInRow;

                      const currentIndex = exerciseIndices[overallExerciseIndex];
                      const colorObj = EXERCISE_COLORS.find(c => c.id === exercise.color) || EXERCISE_COLORS[0];

                      return (
                        <div
                          key={currentIndex}
                          draggable={!isTVMode}
                          className={`plan-exercise-card ${draggedIndex === currentIndex ? 'dragging' : ''} ${!isTVMode ? 'cursor-move' : ''
                            } ${colorObj.bg} ${colorObj.border} border-4 ${isTVMode ? '!w-full !max-w-none' : ''}`} // THICKER BORDER (border-4)
                          onDragStart={(e) => !isTVMode && handleDragStart(e, currentIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => !isTVMode && handleDrop(e, currentIndex)}
                          onClick={() => {
                            if (isTVMode && exercise.videoUrl) {
                              setPlayingVideoUrl(exercise.videoUrl);
                            }
                          }}
                        >
                          {/* Video Icon Indicator */}
                          {exercise.videoUrl && (
                            <div className="absolute top-2 right-2 z-10 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                              <span className="text-[10px]">▶</span>
                            </div>
                          )}
                          <div className="flex justify-between mb-2 relative">
                            {/* TV Mode Image: Adjusted for 6-col layout */}
                            <img
                              src={exercise.imageUrl}
                              alt={exercise.name}
                              className={`object-contain mb-1 w-full ${isTVMode ? '!h-56' : 'h-32'}`}
                            />
                            {isEditMode && !isTVMode && (
                              <button
                                className="icon-button text-sm hover:bg-red-100 hover:text-red-600 absolute top-0 right-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newPlan = [...plan];
                                  newPlan.splice(currentIndex, 1);
                                  onUpdatePlan(newPlan);
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>

                          <div className={`font-medium mb-2 text-sm ${isTVMode ? 'text-center truncate text-xl font-bold mt-1' : ''}`}>
                            {exercise.name}
                          </div>

                          {isEditMode && !isTVMode ? (
                            <>
                              <div className="flex flex-wrap items-center gap-1 mb-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Sets"
                                  value={exercise.sets || ''}
                                  onChange={(e) => updateExercise(currentIndex, {
                                    sets: e.target.value
                                  })}
                                  className="plan-input w-12"
                                />
                                <span className="text-gray-500">×</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Reps"
                                  value={exercise.reps || ''}
                                  onChange={(e) => updateExercise(currentIndex, {
                                    reps: e.target.value
                                  })}
                                  className="plan-input w-12"
                                />
                                <CompactRepTypeSelect
                                  value={exercise.repType || 'reps'}
                                  onChange={(value) => updateExercise(currentIndex, {
                                    repType: value
                                  })}
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Notes"
                                value={exercise.notes || ''}
                                onChange={(e) => updateExercise(currentIndex, {
                                  notes: e.target.value
                                })}
                                className="w-full text-sm px-1 py-0.5 border rounded"
                              />
                              <ColorPicker
                                value={exercise.color || 'default'}
                                onChange={(color) => updateExercise(currentIndex, { color })}
                              />
                            </>
                          ) : (
                            <>
                              <div className={`font-semibold text-gray-800 mb-2 ${isTVMode ? 'text-2xl text-center font-extrabold my-1' : 'text-lg'}`}>
                                {exercise.sets || '-'} × {exercise.reps || '-'} {exercise.repType || 'reps'}
                              </div>
                              {exercise.notes && (
                                <div className={`${isTVMode ? 'text-3xl font-extrabold text-blue-700 bg-blue-50 rounded px-1' : 'text-gray-600 italic text-sm'} ${isTVMode ? 'text-center mt-1' : ''}`}>
                                  {exercise.notes}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Subtle divider for all modes */}
                  {rowIndex < rows.length - 1 && (
                    <div className={`${isTVMode ? 'mt-4 border-gray-700' : 'mt-8 border-gray-200'} border-b`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Video Player Overlay */}
        {playingVideoUrl && isTVMode && (
          <VideoPlayerModal
            isOpen={!!playingVideoUrl}
            videoUrl={playingVideoUrl}
            onClose={() => setPlayingVideoUrl(null)}
          />
        )}
      </div>
    </div>
  );
};

export default PlanBuilderModal;
