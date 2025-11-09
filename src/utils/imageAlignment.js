/**
 * Image alignment and processing utilities for exercise image merging
 */

/**
 * Detect the bounds of the main subject in an image by finding non-background areas
 * @param {HTMLImageElement} img - The image to analyze
 * @param {number} threshold - Brightness threshold to detect background (0-255)
 * @returns {Object} Bounds {x, y, width, height} of the detected subject
 */
export const detectSubjectBounds = (img, threshold = 240) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  // Scan for non-background pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      // If pixel is darker than threshold, it's likely part of the subject
      if (brightness < threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Add padding (10% on each side)
  const paddingX = (maxX - minX) * 0.1;
  const paddingY = (maxY - minY) * 0.1;

  return {
    x: Math.max(0, minX - paddingX),
    y: Math.max(0, minY - paddingY),
    width: Math.min(canvas.width, maxX - minX + paddingX * 2),
    height: Math.min(canvas.height, maxY - minY + paddingY * 2)
  };
};

/**
 * Calculate the center of mass for a subject in an image
 * @param {HTMLImageElement} img - The image to analyze
 * @param {Object} bounds - The detected bounds of the subject
 * @returns {Object} Center point {x, y}
 */
export const calculateCenterOfMass = (img, bounds) => {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
};

/**
 * Auto-align and crop an image to center the subject
 * @param {HTMLImageElement} img - The image to process
 * @param {number} targetWidth - Target width after alignment
 * @param {number} targetHeight - Target height after alignment
 * @returns {Object} Alignment parameters {scale, offsetX, offsetY, crop}
 */
export const autoAlignImage = (img, targetWidth, targetHeight) => {
  const bounds = detectSubjectBounds(img);
  const center = calculateCenterOfMass(img, bounds);

  // Calculate target aspect ratio
  const targetAspect = targetWidth / targetHeight;
  const boundsAspect = bounds.width / bounds.height;

  // Determine scale to fit the subject
  let scale;
  if (boundsAspect > targetAspect) {
    // Subject is wider - fit to width
    scale = targetWidth / bounds.width;
  } else {
    // Subject is taller - fit to height
    scale = targetHeight / bounds.height;
  }

  // Calculate offset to center the subject
  const offsetX = (targetWidth / 2) - (center.x * scale);
  const offsetY = (targetHeight / 2) - (center.y * scale);

  return {
    scale,
    offsetX,
    offsetY,
    crop: bounds,
    originalWidth: img.width,
    originalHeight: img.height
  };
};

/**
 * Find a common aspect ratio for multiple images
 * @param {Array<HTMLImageElement>} images - Array of images to analyze
 * @returns {Object} Common dimensions {width, height}
 */
export const findCommonAspectRatio = (images) => {
  if (images.length === 0) return { width: 600, height: 600 };

  // Detect bounds for all images
  const allBounds = images.map(img => detectSubjectBounds(img));

  // Find the maximum dimensions needed
  const maxWidth = Math.max(...allBounds.map(b => b.width));
  const maxHeight = Math.max(...allBounds.map(b => b.height));

  // Use the larger dimension and make it square for consistency
  const size = Math.max(maxWidth, maxHeight);

  return {
    width: size,
    height: size
  };
};

/**
 * Apply transformation to draw an image on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} img - Image to draw
 * @param {Object} transform - Transform parameters {scale, offsetX, offsetY, panX, panY, zoom}
 * @param {number} targetWidth - Target canvas width
 * @param {number} targetHeight - Target canvas height
 */
export const applyImageTransform = (ctx, img, transform, targetWidth, targetHeight) => {
  ctx.save();

  // Clear the canvas
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // Apply transformations
  const totalScale = transform.scale * (transform.zoom || 1);
  const totalOffsetX = transform.offsetX + (transform.panX || 0);
  const totalOffsetY = transform.offsetY + (transform.panY || 0);

  ctx.translate(totalOffsetX, totalOffsetY);
  ctx.scale(totalScale, totalScale);

  // Draw the image
  ctx.drawImage(img, 0, 0);

  ctx.restore();
};

/**
 * Generate a preview canvas with grid overlay
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {boolean} showGrid - Whether to show the grid
 * @returns {HTMLCanvasElement} Canvas with grid
 */
export const createGridCanvas = (width, height, showGrid = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  if (!showGrid) return canvas;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;

  // Draw rule of thirds grid
  const thirdX = width / 3;
  const thirdY = height / 3;

  // Vertical lines
  ctx.beginPath();
  ctx.moveTo(thirdX, 0);
  ctx.lineTo(thirdX, height);
  ctx.moveTo(thirdX * 2, 0);
  ctx.lineTo(thirdX * 2, height);
  ctx.stroke();

  // Horizontal lines
  ctx.beginPath();
  ctx.moveTo(0, thirdY);
  ctx.lineTo(width, thirdY);
  ctx.moveTo(0, thirdY * 2);
  ctx.lineTo(width, thirdY * 2);
  ctx.stroke();

  // Center crosshair
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const crossSize = 20;

  ctx.beginPath();
  ctx.moveTo(centerX - crossSize, centerY);
  ctx.lineTo(centerX + crossSize, centerY);
  ctx.moveTo(centerX, centerY - crossSize);
  ctx.lineTo(centerX, centerY + crossSize);
  ctx.stroke();

  return canvas;
};
