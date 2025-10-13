import React from 'react';

const MuscleGroupEditModal = ({ exercise, muscleGroups, onSave, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Change Muscle Group for {exercise.name}
        </h3>
        <div className="space-y-4">
          {muscleGroups.map(group => (
            <button
              key={group.name}
              className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100
                ${exercise.muscleGroup === group.name ? 'bg-blue-50 border-2 border-blue-500' : ''}`}
              onClick={() => onSave(exercise.id, group.name)}
            >
              {group.name}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MuscleGroupEditModal;
