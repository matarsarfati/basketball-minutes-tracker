import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const CompactRepTypeSelect = ({ value, onChange, disabled }) => (
  <select 
    value={value} 
    onChange={(e) => onChange(e.target.value)}
    className="plan-select"
    disabled={disabled}
  >
    <option value="reps">reps</option>
    <option value="per side">per side</option>
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
  onRenamePlan // Add new prop for renaming the plan
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
  const previousSize = useRef(null); // Store previous size and position for restore
  const contentRef = useRef(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const printRef = useRef(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [activeSection, setActiveSection] = useState(0); // Track the active section
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
      width: Math.max(400, newWidth), // Minimum width
      height: Math.max(300, newHeight) // Minimum height
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
  }, [isDragging, isResizing, dragOffset, resizeDirection, size]);

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

  const addRowBreak = () => {
    onUpdatePlan([...plan, { type: 'break' }]);
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
      onUpdatePlan([]); // This will clear all exercises
    }
  };

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
    
    // Remove from original position
    updatedPlan.splice(draggedIndex, 1);
    
    // If dropping on a break, add to the end of previous section
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

  const exportToPDF = async () => {
    const printContent = printRef.current;
    if (!printContent) return;

    try {
      printContent.style.display = 'block';
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      
      const images = printContent.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        windowWidth: printContent.scrollWidth,
        onclone: (clonedDoc) => {
          const clonedImages = clonedDoc.getElementsByTagName('img');
          Array.from(clonedImages).forEach(img => {
            img.style.display = 'block';
            img.style.maxWidth = 'none';
          });
        }
      });

      printContent.style.display = 'none';
      printContent.style.position = 'static';

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, imgWidth, imgHeight, '', 'FAST');
      const fileName = `workout-plan-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const togglePrintMode = () => {
    setIsPrintMode(!isPrintMode);
    if (!isPrintMode) {
      onToggleEditMode(false);
    }
  };

  const handleMultipleExercisesAdd = (rowIndex) => {
    const exerciseSelector = document.createElement('div');
    exerciseSelector.innerHTML = `
      <div class="exercise-selector">
        <h3>Select Exercises</h3>
        <div class="exercise-list">
          ${exercises.map(ex => `
            <label>
              <input type="checkbox" value="${ex.id}">
              ${ex.name}
            </label>
          `).join('')}
        </div>
        <button class="add-selected">Add Selected</button>
      </div>
    `;

    const dialog = document.createElement('dialog');
    dialog.appendChild(exerciseSelector);
    document.body.appendChild(dialog);
    dialog.showModal();

    dialog.querySelector('.add-selected').addEventListener('click', () => {
      const selectedIds = Array.from(dialog.querySelectorAll('input:checked'))
        .map(input => input.value);
      onAddExercise(rowIndex, selectedIds); // Pass selected exercise IDs
      dialog.close();
    });
  };

  const addExerciseToCurrentSection = (exercise) => {
    if (!isEditMode) return;

    const newPlan = [...plan];
    const newExercise = {
      id: exercise.id,
      sets: '',
      reps: '',
      repType: 'reps',
      notes: ''
    };

    // Add to end if no sections exist
    if (rows.length === 0) {
      onUpdatePlan([...plan, newExercise]);
      return;
    }

    // Add to current section
    let insertIndex = 0;
    let currentSection = 0;
    
    for (let i = 0; i < plan.length; i++) {
      if (plan[i].type === 'break') {
        currentSection++;
      }
      if (currentSection === activeSection) {
        insertIndex = i + 1;
        break;
      }
    }
    
    newPlan.splice(insertIndex, 0, newExercise);
    onUpdatePlan(newPlan);
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

  // Print Mode View
  if (isPrintMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        {/* Header */}
        <div className="fixed top-6 left-8 z-10">
          <h1 className="text-3xl font-bold mb-1">Workout Plan</h1>
          <div className="text-base text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>

        <button
          onClick={togglePrintMode}
          className="fixed top-4 right-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm opacity-50 hover:opacity-100 transition-opacity z-20"
        >
          ← Exit Print Mode
        </button>

        <div className="max-w-7xl mx-auto px-8 pt-24 pb-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="mb-4">
              <div className="grid grid-cols-4 gap-3">
                {row.map((exercise, index) => (
                  <div 
                    key={index}
                    className="bg-white border rounded-lg p-3"
                  >
                    <div className="aspect-w-1 aspect-h-1 mb-2">
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className="w-full h-32 object-contain"
                        loading="lazy"
                      />
                    </div>

                    <h3 className="text-base font-bold mb-1 text-center">
                      {exercise.name}
                    </h3>

                    <div className="text-center">
                      <span className="text-xl font-bold">
                        {exercise.sets || '-'} × {exercise.reps || '-'}
                      </span>
                      <span className="text-sm ml-1">
                        {exercise.repType || 'reps'}
                      </span>
                    </div>

                    {exercise.notes && (
                      <div className="text-sm text-gray-600 italic mt-1 text-center">
                        {exercise.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {rowIndex < rows.length - 1 && (
                <div className="flex items-center justify-center my-3">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-4 text-sm text-gray-400">
                    Section Break
                  </span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular modal view
  return (
    <div 
      className={`modal-container ${isActive ? 'active-plan' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none'
      }}
      ref={resizeRef}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-white rounded-lg shadow-lg flex flex-col h-full relative">
        <div className="plan-builder-header">
          <div className="flex justify-between items-center p-3">
            <div className="flex items-center gap-2">
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
              {isEditingName ? (
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
                  className="font-semibold text-lg cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit name"
                >
                  {planName || 'Workout Plan'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePrintMode}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                🖨️ Print Mode
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
                    // Save the plan before closing if it contains exercises
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
            </div>
          </div>
        </div>

        <div 
          ref={contentRef} 
          className="flex-1 overflow-y-auto p-2"
        >
          <div>
            {rows.map((row, rowIndex) => {
              let rowStartIndex = 0;
              for (let i = 0; i < rowIndex; i++) {
                rowStartIndex += rows[i].length;
                if (i < rowIndex) rowStartIndex += 1;
              }

              return (
                <div key={rowIndex}>
                  <div className="plan-exercise-row">
                    {row.map((exercise, indexInRow) => {
                      const currentIndex = rowStartIndex + indexInRow;

                      return (
                        <div
                          key={currentIndex}
                          draggable={!isPrintMode}
                          className={`plan-exercise-card ${draggedIndex === currentIndex ? 'dragging' : ''} ${
                            !isPrintMode ? 'cursor-move' : ''
                          }`}
                          onDragStart={(e) => !isPrintMode && handleDragStart(e, currentIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => !isPrintMode && handleDrop(e, currentIndex)}
                        >
                          <div className="flex justify-between mb-2">
                            <img
                              src={exercise.imageUrl}
                              alt={exercise.name}
                              className="object-contain mb-1"
                            />
                            {isEditMode && (
                              <button 
                                className="icon-button text-sm hover:bg-red-100 hover:text-red-600"
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

                          <div className="font-medium mb-2 text-sm">
                            {exercise.name}
                          </div>

                          {isEditMode ? (
                            <>
                              <div className="flex items-center gap-1 mb-1">
                                <input
                                  type="number"
                                  placeholder="Sets"
                                  value={exercise.sets || ''}
                                  onChange={(e) => updateExercise(currentIndex, { 
                                    sets: e.target.value 
                                  })}
                                  className="plan-input"
                                  disabled={!isEditMode}
                                />
                                ×
                                <input
                                  type="number"
                                  placeholder="Reps"
                                  value={exercise.reps || ''}
                                  onChange={(e) => updateExercise(currentIndex, {
                                    reps: e.target.value
                                  })}
                                  className="plan-input"
                                  disabled={!isEditMode}
                                />
                                <CompactRepTypeSelect
                                  value={exercise.repType || 'reps'}
                                  onChange={(value) => updateExercise(currentIndex, {
                                    repType: value
                                  })}
                                  disabled={!isEditMode}
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
                                disabled={!isEditMode}
                              />
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-gray-800 mb-2 text-lg">
                                {exercise.sets || '-'} × {exercise.reps || '-'} {exercise.repType || 'reps'}
                              </div>
                              {exercise.notes && (
                                <div className="text-gray-600 italic text-sm">
                                  {exercise.notes}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {rowIndex < rows.length - 1 && (
                    <div className="text-center text-gray-400 font-semibold text-sm py-1">
                      Section Break
                    </div>
                  )}

                  {/* Add section controls */}
                  {!isPrintMode && (
                    <div className="text-center py-2">
                      <button
                        onClick={() => handleMultipleExercisesAdd(rowIndex)}
                        className="text-xs px-3 py-1 border border-dashed border-gray-300 rounded hover:bg-gray-50"
                      >
                        + Add Exercises
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between p-2 border-t bg-white">
          <button
            onClick={addRowBreak}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
          >
            ↓ New Section
          </button>
          <div className="flex gap-2">
            {isEditMode && (
              <button
                onClick={() => onToggleEditMode(false)}
                className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Done Editing
              </button>
            )}
            <button
              onClick={exportToPDF}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default PlanBuilderModal;
