import React, { useState, useCallback } from 'react';

const MergeImageModal = ({ onClose, onSave, muscleGroups }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [preserveProportions, setPreserveProportions] = useState(true);

  const TARGET_HEIGHT = 600;
  const GAP = 10; // Gap between images

  const generateMergedCanvas = async (files, shouldPreserveProportions) => {
    if (files.length === 0) return null;

    try {
      // Load all images first
      const images = await Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(file);
          });
        })
      );

      // Calculate dimensions
      let totalWidth = 0;
      const scaledDimensions = images.map(img => {
        let scale, width, height;
        
        if (shouldPreserveProportions) {
          // Preserve aspect ratio
          scale = TARGET_HEIGHT / img.height;
          width = img.width * scale;
          height = TARGET_HEIGHT;
        } else {
          // Fixed aspect ratio (1:1 for each segment)
          width = TARGET_HEIGHT;
          height = TARGET_HEIGHT;
        }

        totalWidth += width;
        return { width, height };
      });

      // Add gaps between images
      totalWidth += (images.length - 1) * GAP;

      // Create canvas with calculated dimensions
      const canvas = document.createElement('canvas');
      canvas.height = TARGET_HEIGHT;
      canvas.width = totalWidth;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw images with proper spacing
      let currentX = 0;
      images.forEach((img, index) => {
        const { width, height } = scaledDimensions[index];
        
        if (shouldPreserveProportions) {
          ctx.drawImage(img, currentX, 0, width, height);
        } else {
          // Center-crop the image
          const scale = Math.max(width / img.width, height / img.height);
          const sw = width / scale;
          const sh = height / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          
          ctx.drawImage(img, sx, sy, sw, sh, currentX, 0, width, height);
        }

        currentX += width + GAP;
        URL.revokeObjectURL(img.src); // Clean up
      });

      return canvas;
    } catch (error) {
      console.error('Failed to generate canvas:', error);
      return null;
    }
  };

  const generatePreview = async (files) => {
    const canvas = await generateMergedCanvas(files, preserveProportions);
    if (canvas) {
      setPreviewUrl(canvas.toDataURL());
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    generatePreview(files);
  };

  const handleSave = async () => {
    if (!selectedFiles.length || !exerciseName || !selectedGroup) return;

    try {
      const canvas = await generateMergedCanvas(selectedFiles, preserveProportions);
      if (!canvas) throw new Error('Failed to generate merged image');

      onSave({
        name: exerciseName,
        muscleGroup: selectedGroup,
        imageUrl: canvas.toDataURL()
      });
    } catch (error) {
      console.error('Failed to merge images:', error);
      alert('Failed to merge images. Please try again.');
    }
  };

  const handleToggleMode = () => {
    setPreserveProportions(!preserveProportions);
    generatePreview(selectedFiles);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Merge Images</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Images to Merge
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="mb-4">
            <button
              onClick={handleToggleMode}
              className={`px-4 py-2 rounded ${
                preserveProportions
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {preserveProportions ? 'Preserve Proportions' : 'Fixed Square'}
            </button>
          </div>

          {previewUrl && (
            <div className="mb-4 overflow-x-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="max-w-full">
                <img
                  src={previewUrl}
                  alt="Merged preview"
                  className="rounded border object-contain h-auto max-w-full"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exercise Name
            </label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Enter exercise name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Muscle Group
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Select a muscle group</option>
              {muscleGroups.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedFiles.length || !exerciseName || !selectedGroup}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeImageModal;
