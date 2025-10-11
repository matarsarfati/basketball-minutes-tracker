const drawSessionBox = (doc, x, y, width, height, session) => {
  // ...existing code...
  const hasSpaceForLine = () => currentY + lineHeight <= maxY;

  // Type label
  if (hasSpaceForLine()) {
    const typeLabel = formatTypeLabel(session.type);
    doc.setFont(undefined, "bold");
    doc.text(typeLabel, x + padding, currentY);
    currentY += lineHeight;
  }

  // Time
  if (showTime && hasSpaceForLine()) {
    doc.setFont(undefined, "normal");
    const timeText = formatTime(session.startTime);
    doc.text(timeText, x + padding, currentY);
    currentY += lineHeight;
  }

  // Stats (only for non-Game, non-DayOff sessions)
  if (showStats) {
    // Courts info
    if (hasSpaceForLine()) {
      const courts = session.courts ?? 0;
      doc.text(`Courts: ${courts}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Total minutes
    if (hasSpaceForLine()) {
      doc.text(`Total: ${session.totalMinutes || 0}m`, x + padding, currentY);
      currentY += lineHeight;
    }

    // High intensity minutes
    if (hasSpaceForLine()) {
      doc.text(`High: ${session.highIntensityMinutes || 0}m`, x + padding, currentY);
      currentY += lineHeight;
    }
  }

  // Ensure no content is written beyond the allowed height
  if (currentY > maxY) {
    console.warn("Content exceeds the allowed height. Some data may not be visible.");
  }

  // ...existing code...
};
