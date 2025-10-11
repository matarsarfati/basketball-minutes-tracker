import React, { useRef, useState, useEffect } from 'react';

const MuscleGroupRow = ({ 
  groupName, 
  exercises, 
  isVisible, 
  onImageDrop, 
  onExerciseClick,
  isEditMode,
  onDeleteExercise,
  onReorderExercises,
  onEditExerciseName,
  editingExerciseId,
  editingName,
  onEditingNameChange,
  onSaveName,
  onCancelNameEdit
}) => {
  const fileInputRef = useRef(null);
  const [draggedExercise, setDraggedExercise] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => {
    console.log(`[${groupName}] Edit Mode:`, isEditMode);
    console.log('onReorderExercises type:', typeof onReorderExercises);
  }, [isEditMode, groupName, onReorderExercises]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Allow exercises without names
      const exerciseName = prompt('Enter exercise name (optional):') || '';
      onImageDrop(groupName, {
        name: exerciseName,
        imageUrl: reader.result,
        muscleGroup: groupName,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input
  };

  const handleDragStart = (e, exercise) => {
    console.log('===== DRAG START =====');
    console.log('Exercise:', exercise.name);
    console.log('Group:', groupName);
    
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    setDraggedExercise(exercise);
    e.dataTransfer.setData('text/plain', exercise.id);

    requestAnimationFrame(() => {
      e.target.classList.add('dragging');
      e.target.style.opacity = '0.5';
    });
  };

  const handleDragEnter = (e, targetExercise) => {
    console.log('Card Drag Enter:', targetExercise.name);
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedExercise?.id !== targetExercise.id) {
      setDropTarget(targetExercise);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    console.log('Card Drag End:', draggedExercise?.name);
    e.preventDefault();
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });
    setDraggedExercise(null);
    setDropTarget(null);
  };

  const handleDrop = (e, targetExercise) => {
    console.log('===== DROP =====');
    console.log('Dragged:', draggedExercise?.name);
    console.log('Target:', targetExercise.name);
    console.log('Current exercises:', exercises.map(ex => ex.name));
    
    e.preventDefault();
    if (!draggedExercise || draggedExercise.id === targetExercise.id) {
      console.log('Drop cancelled - same exercise');
      return;
    }

    const fromIndex = exercises.findIndex(ex => ex.id === draggedExercise.id);
    const toIndex = exercises.findIndex(ex => ex.id === targetExercise.id);
    
    console.log('From index:', fromIndex, 'To index:', toIndex);

    if (fromIndex === -1 || toIndex === -1) {
      console.error('Exercise not found:', fromIndex === -1 ? 'dragged' : 'target');
      return;
    }

    const updatedExercises = [...exercises];
    updatedExercises.splice(fromIndex, 1);
    updatedExercises.splice(toIndex, 0, draggedExercise);
    
    console.log('New order:', updatedExercises.map(ex => ex.name));
    console.log('Calling onReorderExercises with group:', groupName);

    onReorderExercises(groupName, updatedExercises);
    handleDragEnd(e);
  };

  const handleDelete = (exercise) => {
    if (window.confirm(`Delete exercise "${exercise.name}"?`)) {
      onDeleteExercise(exercise);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between p-2 border-b mb-4">
        <h3 className="text-xl font-bold">{groupName}</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="icon-button ml-2"
          title="Add new exercise"
        >
          <span className="icon">+</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      
      <div className="flex overflow-x-auto pb-4 space-x-4 muscle-group-row">
        {exercises.length > 0 ? (
          exercises.map((exercise) => (
            <div 
              key={exercise.id} 
              className={`
                exercise-card relative flex-shrink-0
                min-w-[150px] max-w-[150px]
                ${isEditMode ? 'edit-mode cursor-move' : ''}
                ${dropTarget?.id === exercise.id ? 'drop-target' : ''}
              `}
              draggable={isEditMode}
              style={{ 
                touchAction: 'none',
                userSelect: 'none'
              }}
              data-exercise-id={exercise.id}
              onDragStart={(e) => isEditMode && handleDragStart(e, exercise)}
              onDragEnter={(e) => isEditMode && handleDragEnter(e, exercise)}
              onDragOver={(e) => isEditMode && handleDragOver(e)}
              onDragEnd={(e) => isEditMode && handleDragEnd(e)}
              onDrop={(e) => isEditMode && handleDrop(e, exercise)}
              onClick={() => !isEditMode && onExerciseClick(exercise)}
            >
              <div className="p-3 w-full">
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(exercise);
                    }}
                    className="absolute top-1 right-1 icon-button bg-white rounded-full shadow-sm"
                  >
                    <span className="icon text-sm">🗑</span>
                  </button>
                )}
                
                <div className="flex justify-center mb-3">
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name || 'Unnamed Exercise'}
                    className="rounded w-full h-[100px] object-contain"
                  />
                </div>
                
                {isEditMode && editingExerciseId === exercise.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => onEditingNameChange(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveName();
                        if (e.key === 'Escape') onCancelNameEdit();
                      }}
                    />
                    <button
                      onClick={onSaveName}
                      className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <div
                    className={`text-sm font-medium text-center truncate
                      ${isEditMode ? 'hover:text-blue-600 cursor-pointer' : ''}`}
                    onClick={() => isEditMode && onEditExerciseName(exercise)}
                    title={exercise.name || 'Unnamed Exercise'}
                  >
                    {exercise.name || 'Unnamed Exercise'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex-shrink-0 w-full py-8 text-center text-gray-500">
            No exercises in this group yet
          </div>
        )}
      </div>
    </div>
  );
};

export default MuscleGroupRow;
