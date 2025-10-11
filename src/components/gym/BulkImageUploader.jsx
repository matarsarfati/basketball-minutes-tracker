import React, { useState } from 'react';

const BulkImageUploader = ({ onImagesProcessed, muscleGroups }) => {
  const [pendingImages, setPendingImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)
    );

    const imagePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: '',
            imageUrl: reader.result,
            muscleGroup: '',
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((images) => {
      setPendingImages(images);
    });
  };

  const handleImageProcess = (name, muscleGroup) => {
    const image = pendingImages[currentImageIndex];
    onImagesProcessed(muscleGroup, {
      name,
      imageUrl: image.imageUrl,
      muscleGroup,
    });

    if (currentImageIndex < pendingImages.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else {
      setPendingImages([]);
      setCurrentImageIndex(0);
    }
  };

  return (
    <div>
      {pendingImages.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        >
          <p className="text-gray-500">Drag and drop multiple images here</p>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">
              Image {currentImageIndex + 1} of {pendingImages.length}
            </h3>

            <img
              src={pendingImages[currentImageIndex].imageUrl}
              alt="Preview"
              className="mb-4 max-h-48 mx-auto"
            />

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Exercise name"
                className="w-full p-2 border rounded"
                id="exercise-name-input"
              />

              <select className="w-full p-2 border rounded" id="muscle-group-select">
                <option value="" disabled>
                  Select muscle group
                </option>
                {muscleGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setPendingImages([]);
                    setCurrentImageIndex(0);
                  }}
                  className="px-4 py-2 text-gray-600 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const nameInput = document.getElementById('exercise-name-input');
                    const groupSelect = document.getElementById('muscle-group-select');
                    if (nameInput.value && groupSelect.value) {
                      handleImageProcess(nameInput.value, groupSelect.value);
                      nameInput.value = '';
                      groupSelect.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImageUploader;
