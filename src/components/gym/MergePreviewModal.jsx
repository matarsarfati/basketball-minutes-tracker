import React, { useState, useRef, useEffect } from 'react';

const MergePreviewModal = ({
  editedImages,
  onSave,
  onBack,
  muscleGroups
}) => {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [gap, setGap] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [cropStart, setCropStart] = useState(null);
  const [mergedCanvas, setMergedCanvas] = useState(null);

  const CANVAS_HEIGHT = 600;

  // Generate merged preview
  useEffect(() => {
    if (!editedImages || editedImages.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Calculate total width
    const totalWidth = (editedImages.length * 600) + ((editedImages.length - 1) * gap);
    canvas.width = totalWidth;
    canvas.height = CANVAS_HEIGHT;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, CANVAS_HEIGHT);

    // Draw each image
    let currentX = 0;
    editedImages.forEach((item) => {
      ctx.drawImage(item.canvas, currentX, 0);
      currentX += 600 + gap;
    });

    // Store the merged canvas for cropping
    setMergedCanvas(canvas);
  }, [editedImages, gap]);

  // Draw crop overlay on preview canvas
  useEffect(() => {
    if (!previewCanvasRef.current || !mergedCanvas) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Copy merged canvas to preview
    canvas.width = mergedCanvas.width;
    canvas.height = mergedCanvas.height;
    ctx.drawImage(mergedCanvas, 0, 0);

    // Draw crop rectangle if in crop mode
    if (cropMode && cropRect) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

      // Draw semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, cropRect.y);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
      ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, canvas.width - cropRect.x - cropRect.width, cropRect.height);
      ctx.fillRect(0, cropRect.y + cropRect.height, canvas.width, canvas.height - cropRect.y - cropRect.height);

      ctx.setLineDash([]);
    }
  }, [mergedCanvas, cropMode, cropRect]);

  const handleMouseDown = (e) => {
    if (!cropMode || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (previewCanvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (previewCanvasRef.current.height / rect.height);

    setCropStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!cropMode || !cropStart || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) * (previewCanvasRef.current.width / rect.width);
    const currentY = (e.clientY - rect.top) * (previewCanvasRef.current.height / rect.height);

    const width = currentX - cropStart.x;
    const height = currentY - cropStart.y;
    setCropRect({
      x: width > 0 ? cropStart.x : currentX,
      y: height > 0 ? cropStart.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    if (cropMode && cropRect && (cropRect.width < 10 || cropRect.height < 10)) {
      setCropRect(null);
    }
    setCropStart(null);
  };

  const handleApplyCrop = () => {
    if (!cropRect || !mergedCanvas) return;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropRect.width;
    croppedCanvas.height = cropRect.height;
    const ctx = croppedCanvas.getContext('2d');

    ctx.drawImage(
      mergedCanvas,
      cropRect.x, cropRect.y, cropRect.width, cropRect.height,
      0, 0, cropRect.width, cropRect.height
    );

    // Update merged canvas
    setMergedCanvas(croppedCanvas);
    setCropMode(false);
    setCropRect(null);

    // Redraw main canvas
    const canvas = canvasRef.current;
    canvas.width = croppedCanvas.width;
    canvas.height = croppedCanvas.height;
    const mainCtx = canvas.getContext('2d');
    mainCtx.drawImage(croppedCanvas, 0, 0);
  };

  const handleCancelCrop = () => {
    setCropMode(false);
    setCropRect(null);
    setCropStart(null);
  };

  const handleSave = () => {
    if (!exerciseName || !selectedGroup) {
      alert('Please enter exercise name and select muscle group');
      return;
    }

    if (!canvasRef.current) return;

    onSave({
      name: exerciseName,
      muscleGroup: selectedGroup,
      imageUrl: canvasRef.current.toDataURL('image/png', 1.0)
    });
  };

  const handleEditImage = (index) => {
    // Go back to edit a specific image
    onBack(index);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Preview Merged Image</h2>
          <button
            onClick={() => onBack()}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Individual Images Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Individual Images:</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {editedImages.map((item, index) => (
                <div key={index} className="flex-shrink-0">
                  <div className="relative group">
                    <img
                      src={item.canvas.toDataURL()}
                      alt={`Image ${index + 1}`}
                      className="w-32 h-32 object-cover rounded border-2 border-gray-300"
                    />
                    <button
                      onClick={() => handleEditImage(index)}
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50
                               flex items-center justify-center opacity-0 group-hover:opacity-100
                               transition-all duration-200 rounded"
                    >
                      <span className="text-white font-semibold">Edit</span>
                    </button>
                  </div>
                  <div className="text-xs text-center text-gray-500 mt-1">
                    Image {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gap Control */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {gap === 0 ? 'No spacing' : gap > 0 ? `Gap: ${gap}px` : `Overlap: ${Math.abs(gap)}px`}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setGap(Math.max(-50, gap - 1))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                disabled={cropMode}
              >
                −
              </button>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={gap}
                onChange={(e) => setGap(parseInt(e.target.value))}
                className="flex-1"
                disabled={cropMode}
              />
              <button
                onClick={() => setGap(Math.min(50, gap + 1))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                disabled={cropMode}
              >
                +
              </button>
              <span className="text-sm text-gray-600 w-20 text-right">
                {gap === 0 ? '0' : gap > 0 ? `+${gap}px` : `${gap}px`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
              <span>← Overlap</span>
              <span>Gap →</span>
            </div>
          </div>

          {/* Crop Button */}
          {!cropMode && (
            <div className="mb-4">
              <button
                onClick={() => setCropMode(true)}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium"
              >
                Crop Final Image
              </button>
            </div>
          )}

          {/* Crop Mode Instructions */}
          {cropMode && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
              <h4 className="font-semibold text-purple-900 mb-2">Crop Mode Active</h4>
              <p className="text-sm text-purple-800">
                Click and drag on the merged image to select the area you want to keep.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleApplyCrop}
                  disabled={!cropRect || cropRect.width < 10 || cropRect.height < 10}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600
                           disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Apply Crop
                </button>
                <button
                  onClick={handleCancelCrop}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
                >
                  Cancel Crop
                </button>
              </div>
            </div>
          )}

          {/* Merged Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Merged Preview:
            </label>
            <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
                style={{ display: cropMode ? 'none' : 'block' }}
              />
              <canvas
                ref={previewCanvasRef}
                className={`max-w-full h-auto ${cropMode ? 'cursor-crosshair' : ''}`}
                style={{ display: cropMode ? 'block' : 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>

          {/* Exercise Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exercise Name *
              </label>
              <input
                type="text"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter exercise name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Muscle Group *
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a muscle group</option>
                {muscleGroups.map(group => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <button
              onClick={() => onBack()}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Edit
            </button>
            <button
              onClick={handleSave}
              disabled={!exerciseName || !selectedGroup}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Exercise
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Preview Tips:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Click "Edit" on any image to adjust its alignment</li>
              <li>• Use the slider to adjust spacing or overlap between images</li>
              <li>• Value 0 = no spacing, positive = gap, negative = overlap</li>
              <li>• Click "Crop Final Image" to trim the merged result</li>
              <li>• Scroll horizontally to see the full preview</li>
              <li>• Final image will be saved in high quality (PNG format)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergePreviewModal;
