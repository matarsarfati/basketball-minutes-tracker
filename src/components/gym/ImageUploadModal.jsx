import React, { useState, useEffect } from 'react';

const ImageUploadModal = ({
  isOpen,
  onClose,
  images,
  muscleGroups,
  onSaveExercise,
  currentIndex
}) => {
  const [exerciseName, setExerciseName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(muscleGroups[0] || '');
  const [videoLink, setVideoLink] = useState('');

  // Reset exercise name whenever currentIndex changes
  useEffect(() => {
    if (images[currentIndex]) {
      setExerciseName(images[currentIndex].name.replace(/\.[^/.]+$/, ''));
      setVideoLink(''); // Reset video link
    }
  }, [currentIndex, images]);

  const handleSave = () => {
    onSaveExercise(currentIndex, {
      name: exerciseName,
      muscleGroup: selectedGroup,
      videoUrl: videoLink
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px]">
        <h3 className="text-lg font-bold mb-4">
          Exercise Details ({currentIndex + 1} of {images.length})
        </h3>

        <div className="mb-4">
          <img
            src={URL.createObjectURL(images[currentIndex])}
            alt="Preview"
            className="w-32 h-32 object-contain mx-auto"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exercise Name</label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Muscle Group</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              {muscleGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">YouTube Link (Optional)</label>
            <input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;
