import React, { useState, useRef, useEffect } from 'react';
import { autoAlignImage, applyImageTransform, createGridCanvas } from '../../utils/imageAlignment';

const ImageEditorModal = ({ image, imageFile, onSave, onCancel, imageIndex, totalImages }) => {
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState(null);
  const [autoTransform, setAutoTransform] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [cropStart, setCropStart] = useState(null);

  const CANVAS_SIZE = 600;

  // Initialize auto-alignment when image loads
  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.onload = () => {
      const autoAlign = autoAlignImage(img, CANVAS_SIZE, CANVAS_SIZE);
      setAutoTransform(autoAlign);
      setTransform({
        ...autoAlign,
        panX: 0,
        panY: 0,
        zoom: 1
      });
    };
    img.src = image.src;
  }, [image]);

  // Redraw canvas whenever transform changes
  useEffect(() => {
    if (!canvasRef.current || !image || !transform) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Apply transform and draw image
    const currentTransform = {
      scale: transform.scale,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      panX: transform.panX,
      panY: transform.panY,
      zoom: zoom
    };
    applyImageTransform(ctx, image, currentTransform, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid overlay if enabled
    if (showGrid && !cropMode) {
      const gridCanvas = createGridCanvas(CANVAS_SIZE, CANVAS_SIZE, true);
      ctx.drawImage(gridCanvas, 0, 0);
    }

    // Draw crop rectangle if in crop mode
    if (cropMode && cropRect) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

      // Draw semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_SIZE, cropRect.y);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
      ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, CANVAS_SIZE - cropRect.x - cropRect.width, cropRect.height);
      ctx.fillRect(0, cropRect.y + cropRect.height, CANVAS_SIZE, CANVAS_SIZE - cropRect.y - cropRect.height);

      ctx.setLineDash([]);
    }
  }, [image, transform, zoom, showGrid, cropMode, cropRect]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (cropMode) {
      setCropStart({ x, y });
      setCropRect({ x, y, width: 0, height: 0 });
    } else {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (cropMode && cropStart) {
      // Draw crop rectangle
      const width = currentX - cropStart.x;
      const height = currentY - cropStart.y;
      setCropRect({
        x: width > 0 ? cropStart.x : currentX,
        y: height > 0 ? cropStart.y : currentY,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } else if (isDragging && !cropMode && transform) {
      // Pan the image
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      setTransform(prev => ({
        ...prev,
        panX: (prev.panX || 0) + deltaX,
        panY: (prev.panY || 0) + deltaY
      }));

      setDragStart({ x: currentX, y: currentY });
    }
  };

  const handleMouseUp = () => {
    if (cropMode && cropRect && cropRect.width > 10 && cropRect.height > 10) {
      // Crop is ready - user can apply it
    } else if (cropMode) {
      setCropRect(null);
    }
    setIsDragging(false);
    setCropStart(null);
  };

  const handleApplyCrop = () => {
    if (!cropRect || !canvasRef.current) return;

    // Create a new canvas with the cropped image
    const sourceCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = CANVAS_SIZE;
    croppedCanvas.height = CANVAS_SIZE;
    const ctx = croppedCanvas.getContext('2d');

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate scale to fit cropped area to canvas
    const scale = Math.min(CANVAS_SIZE / cropRect.width, CANVAS_SIZE / cropRect.height);
    const scaledWidth = cropRect.width * scale;
    const scaledHeight = cropRect.height * scale;
    const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
    const offsetY = (CANVAS_SIZE - scaledHeight) / 2;

    // Draw the cropped portion, scaled to fit
    ctx.drawImage(
      sourceCanvas,
      cropRect.x, cropRect.y, cropRect.width, cropRect.height,
      offsetX, offsetY, scaledWidth, scaledHeight
    );

    // Update the image with cropped version
    const croppedImg = new Image();
    croppedImg.onload = () => {
      // Reset transform for the new cropped image
      const autoAlign = autoAlignImage(croppedImg, CANVAS_SIZE, CANVAS_SIZE);
      setAutoTransform(autoAlign);
      setTransform({
        ...autoAlign,
        panX: 0,
        panY: 0,
        zoom: 1
      });
      setZoom(1);
      setCropMode(false);
      setCropRect(null);

      // Update the image reference
      image.src = croppedCanvas.toDataURL();
    };
    croppedImg.src = croppedCanvas.toDataURL();
  };

  const handleCancelCrop = () => {
    setCropMode(false);
    setCropRect(null);
    setCropStart(null);
  };

  const handleZoomChange = (newZoom) => {
    setZoom(parseFloat(newZoom));
  };

  const handleReset = () => {
    if (!autoTransform) return;
    setTransform({
      ...autoTransform,
      panX: 0,
      panY: 0,
      zoom: 1
    });
    setZoom(1);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = CANVAS_SIZE;
    finalCanvas.height = CANVAS_SIZE;
    const ctx = finalCanvas.getContext('2d');

    // Draw with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Apply final transform
    const finalTransform = {
      scale: transform.scale,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      panX: transform.panX,
      panY: transform.panY,
      zoom: zoom
    };
    applyImageTransform(ctx, image, finalTransform, CANVAS_SIZE, CANVAS_SIZE);

    onSave({
      canvas: finalCanvas,
      transform: finalTransform,
      imageFile
    });
  };

  if (!image || !transform) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-gray-600">Loading image...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">
            Edit Image {imageIndex + 1} of {totalImages}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Canvas Preview */}
          <div className="mb-6 flex justify-center">
            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={`${
                  cropMode
                    ? 'cursor-crosshair'
                    : isDragging
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {cropMode ? 'Click and drag to crop' : 'Drag to pan'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 mb-6">
            {!cropMode ? (
              <>
                {/* Zoom Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom: {zoom.toFixed(2)}x
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleZoomChange(Math.max(0.1, zoom - 0.1))}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => handleZoomChange(e.target.value)}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleZoomChange(Math.min(3, zoom + 0.1))}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Grid Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="showGrid" className="text-sm font-medium text-gray-700">
                    Show alignment grid
                  </label>
                </div>

                {/* Crop and Reset Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCropMode(true)}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium"
                  >
                    Crop Image
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Crop Mode Instructions */}
                <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                  <h4 className="font-semibold text-purple-900 mb-2">Crop Mode Active</h4>
                  <p className="text-sm text-purple-800">
                    Click and drag on the image to select the area you want to keep.
                  </p>
                </div>

                {/* Crop Action Buttons */}
                <div className="flex gap-2">
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
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Continue
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Pan:</strong> Click and drag on the image to reposition</li>
              <li>• <strong>Zoom:</strong> Use the slider or +/− buttons to zoom in/out</li>
              <li>• <strong>Grid:</strong> Use the alignment grid to center your subject</li>
              <li>• <strong>Reset:</strong> Return to automatic alignment at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;
