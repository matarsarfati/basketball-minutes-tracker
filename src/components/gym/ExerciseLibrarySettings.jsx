import React, { useState } from 'react';

const ExerciseLibrarySettings = ({ 
  isOpen,
  onClose,
  muscleGroups,  // This is an ARRAY of {name, rows}
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

  const handleRowsChange = (groupName, rows) => {
    onUpdateGroupRows(groupName, Number(rows));
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
          <button onClick={onClose} className="text-2xl hover:bg-gray-100 px-2 rounded">×</button>
        </div>
        <div className="space-y-2">
          {Array.isArray(muscleGroups) && muscleGroups.map((group, index) => (
            <div key={group.name} className="flex flex-col p-2 bg-gray-50 rounded mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{group.name}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onToggleVisibility(group.name)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={visibleGroups.includes(group.name) ? "Hide group" : "Show group"}
                  >
                    <span className="text-lg">
                      {visibleGroups.includes(group.name) ? "👁" : "○"}
                    </span>
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onMoveGroup(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <span className="text-lg">↑</span>
                    </button>
                    <button
                      onClick={() => onMoveGroup(index, 'down')}
                      disabled={index === muscleGroups.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <span className="text-lg">↓</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${group.name}" group? All exercises in this group will be moved to "Other".`)) {
                        onDeleteGroup(group.name);
                      }
                    }}
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                    title="Delete group"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-600">Rows:</span>
                <select 
                  value={group.rows}
                  onChange={(e) => handleRowsChange(group.name, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
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
                autoFocus
              />
              <button 
                onClick={handleAddGroup} 
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                ✓
              </button>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setNewGroupName('');
                }} 
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                ✗
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mt-4 p-2 text-blue-500 border border-blue-500 rounded hover:bg-blue-50"
            >
              + Add New Muscle Group
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ExerciseLibrarySettings;