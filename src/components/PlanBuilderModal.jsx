import React, { useState, useRef, useEffect } from 'react';

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
  const [draggedExercise, setDraggedExercise] = useState(null);
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [position, setPosition] = useState({ x: initialPosition?.x || 0, y: initialPosition?.y || 0 });
  const modalRef = useRef(null);

  const handleDragStart = (exercise) => {
    setDraggedExercise(exercise);
  };

  const handleDragOver = (e, targetExercise) => {
    e.preventDefault();
    if (!draggedExercise || draggedExercise.id === targetExercise.id) return;
  };

  const handleDrop = (e, targetExercise) => {
    e.preventDefault();
    if (!draggedExercise || draggedExercise.id === targetExercise.id) return;

    const exercises = [...plan];
    const draggedIndex = exercises.findIndex(ex => ex.id === draggedExercise.id);
    const targetIndex = exercises.findIndex(ex => ex.id === targetExercise.id);

    // Reorder exercises
    exercises.splice(draggedIndex, 1);
    exercises.splice(targetIndex, 0, draggedExercise);

    onUpdatePlan(exercises);
    setDraggedExercise(null);
  };

  const handleResizeStart = (e, corner) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startLeft = position.x;
    const startTop = position.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      switch (corner) {
        case 'bottom-right':
          setSize({
            width: Math.max(400, startWidth + deltaX),
            height: Math.max(300, startHeight + deltaY)
          });
          break;
        case 'bottom-left':
          setSize({
            width: Math.max(400, startWidth - deltaX),
            height: Math.max(300, startHeight + deltaY)
          });
          setPosition({
            x: startLeft + deltaX,
            y: position.y
          });
          break;
        case 'top-right':
          setSize({
            width: Math.max(400, startWidth + deltaX),
            height: Math.max(300, startHeight - deltaY)
          });
          setPosition({
            x: position.x,
            y: startTop + deltaY
          });
          break;
        case 'top-left':
          setSize({
            width: Math.max(400, startWidth - deltaX),
            height: Math.max(300, startHeight - deltaY)
          });
          setPosition({
            x: startLeft + deltaX,
            y: startTop + deltaY
          });
          break;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={modalRef}
      className="modal-container"
      style={{ left: position.x, top: position.y, width: `${size.width}px`, height: `${size.height}px` }}
    >
      {/* Resize handles */}
      <div className="resize-handle top-left" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
      <div className="resize-handle top-right" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
      <div className="resize-handle bottom-left" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
      <div className="resize-handle bottom-right" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />

      <div className="exercises-container">
        {plan.map((exercise) => (
          <div
            key={exercise.id}
            className={`exercise-card ${draggedExercise?.id === exercise.id ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleDragStart(exercise)}
            onDragOver={(e) => handleDragOver(e, exercise)}
            onDrop={(e) => handleDrop(e, exercise)}
          >
            {/* Exercise content */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanBuilderModal;
