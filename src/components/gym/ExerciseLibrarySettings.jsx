import React, { useState } from 'react';

const ExerciseLibrarySettings = ({ 
  isOpen,
  onClose,
  muscleGroups, 
  visibleGroups, 
  onToggleVisibility, 
  onMoveGroup,
  onAddMuscleGroup,
  onDeleteGroup,
  onUpdateGroupRows
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddMuscleGroup(newGroupName.trim());
      setNewGroupName('');
      setIsAdding(false);
    }
  };

  const handleRowsChange = (groupId, rows) => {
    onUpdateGroupRows(groupId, Number(rows));
  };

  const modalStyles = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '80vh',
    overflowY: 'auto',
    width: '300px'
  };

  const backdropStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999
  };

  return (
    <>
      <div style={backdropStyles} onClick={onClose} />
      <div style={modalStyles}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Muscle Group Settings</h3>
          <button onClick={onClose} className="icon-button">
            <span className="icon">×</span>
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(muscleGroups).map(([groupId, group], index) => (
            <div key={groupId} className="flex flex-col p-2 bg-gray-50 rounded mb-2">
              <div className="flex items-center justify-between">
                <span>{group.name}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onToggleVisibility(groupId)}
                    className="icon-button"
                  >
                    <span className="icon">{visibleGroups.includes(groupId) ? "👁" : "○"}</span>
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onMoveGroup(index, 'up')}
                      disabled={index === 0}
                      className="icon-button disabled:opacity-50"
                    >
                      <span className="icon">↑</span>
                    </button>
                    <button
                      onClick={() => onMoveGroup(index, 'down')}
                      disabled={index === Object.keys(muscleGroups).length - 1}
                      className="icon-button disabled:opacity-50"
                    >
                      <span className="icon">↓</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${group.name}" group?`)) {
                        onDeleteGroup(groupId);
                      }
                    }}
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="w-24">Rows:</span>
                <select 
                  value={group.rows}
                  onChange={(e) => handleRowsChange(groupId, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="1">1 Row</option>
                  <option value="2">2 Rows</option>
                  <option value="3">3 Rows</option>
                  <option value="4">4 Rows</option>
                  <option value="5">5 Rows</option>
                </select>
              </div>
            </div>
          ))}
          
          {/* Add New Group Section */}
          {isAdding ? (
            <div className="flex items-center mt-4 space-x-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="flex-1 px-2 py-1 border rounded"
                onKeyPress={(e) => e.key === 'Enter' && handleAddGroup()}
              />
              <button onClick={handleAddGroup} className="icon-button">
                <span className="icon">+</span>
              </button>
              <button onClick={() => setIsAdding(false)} className="icon-button">
                <span className="icon">×</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mt-4 p-2 text-blue-500 border border-blue-500 rounded hover:bg-blue-50"
            >
              <span className="icon mr-1">+</span>
              Add Muscle Group
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ExerciseLibrarySettings;
