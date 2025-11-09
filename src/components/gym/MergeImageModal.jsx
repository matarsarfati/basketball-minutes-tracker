import React, { useState, useEffect } from 'react';
import ImageEditorModal from './ImageEditorModal';
import MergePreviewModal from './MergePreviewModal';

const MergeImageModal = ({ onClose, onSave, muscleGroups }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loadedImages, setLoadedImages] = useState([]);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [editedImages, setEditedImages] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load images when files are selected
  useEffect(() => {
    if (selectedFiles.length === 0) return;

    const loadImages = async () => {
      const images = await Promise.all(
        selectedFiles.map(file => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ img, file });
            img.src = URL.createObjectURL(file);
          });
        })
      );
      setLoadedImages(images);
      // Start editing the first image automatically
      setCurrentEditingIndex(0);
    };

    loadImages();
  }, [selectedFiles]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(files);
    setEditedImages([]);
    setCurrentEditingIndex(null);
    setShowPreview(false);
  };

  const handleImageEdited = (data) => {
    // Save the edited image
    const newEditedImages = [...editedImages];
    newEditedImages[currentEditingIndex] = data;
    setEditedImages(newEditedImages);

    // Move to next image or show preview
    if (currentEditingIndex < selectedFiles.length - 1) {
      setCurrentEditingIndex(currentEditingIndex + 1);
    } else {
      // All images edited, show preview
      setCurrentEditingIndex(null);
      setShowPreview(true);
    }
  };

  const handleCancelEdit = () => {
    setCurrentEditingIndex(null);
    setSelectedFiles([]);
    setLoadedImages([]);
    setEditedImages([]);
  };

  const handleBackFromPreview = (editIndex) => {
    setShowPreview(false);
    if (typeof editIndex === 'number') {
      // Edit a specific image
      setCurrentEditingIndex(editIndex);
    } else {
      // Go back to file selection
      setSelectedFiles([]);
      setLoadedImages([]);
      setEditedImages([]);
      setCurrentEditingIndex(null);
    }
  };

  const handleFinalSave = (data) => {
    onSave(data);
  };

  // Show image editor if currently editing
  if (currentEditingIndex !== null && loadedImages[currentEditingIndex]) {
    const { img, file } = loadedImages[currentEditingIndex];
    return (
      <ImageEditorModal
        image={img}
        imageFile={file}
        imageIndex={currentEditingIndex}
        totalImages={selectedFiles.length}
        onSave={handleImageEdited}
        onCancel={handleCancelEdit}
      />
    );
  }

  // Show preview if all images are edited
  if (showPreview && editedImages.length === selectedFiles.length) {
    return (
      <MergePreviewModal
        editedImages={editedImages}
        muscleGroups={muscleGroups}
        onSave={handleFinalSave}
        onBack={handleBackFromPreview}
      />
    );
  }

  // Show file selection screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Merge Exercise Images</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Images to Merge
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Select 2 or more images (e.g., start and end position of an exercise)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {selectedFiles.length}
                </div>
                <span className="font-medium text-blue-900">
                  {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <p className="text-sm text-blue-800">
                Click the button below to start editing and aligning your images
              </p>
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="font-semibold text-gray-900 mb-3">How it works:</h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span><strong>Select images</strong> - Choose 2+ images to merge</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span><strong>Auto-align</strong> - Images are automatically detected and aligned</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span><strong>Edit individually</strong> - Adjust pan, zoom, and position for each image</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">4.</span>
                <span><strong>Preview & save</strong> - Review the merged result and save to library</span>
              </li>
            </ol>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => setCurrentEditingIndex(0)}
              disabled={selectedFiles.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeImageModal;
