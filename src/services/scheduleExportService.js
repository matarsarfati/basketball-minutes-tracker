// src/services/scheduleExportService.js
import { jsPDF } from "jspdf";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Sanitizes text for PDF export by checking for Hebrew characters
 * and replacing them with a placeholder message
 */
const sanitizeForPDF = (text) => {
  if (!text) return '';
  // Check for Hebrew characters
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  if (hasHebrew) {
    return '[Hebrew text - view in app]';
  }
  // Keep only ASCII-safe characters
  return text.replace(/[^\x20-\x7E]/g, '');
};

/**
 * Gets the month name for export filename
 */
const getExportMonthName = (date) => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(date);
};

/**
 * Type colors for PDF rendering (RGB format with alpha)
 */
const TYPE_COLORS_PDF = {
  Practice: { fill: [245, 158, 11], alpha: 0.12 },
  Game: { fill: [220, 38, 38], alpha: 0.12 },
  DayOff: { fill: [16, 185, 129], alpha: 0.12 },
  SplitPractice: { fill: [249, 115, 22], alpha: 0.12 },
  Meeting: { fill: [59, 130, 246], alpha: 0.12 },
  Recovery: { fill: [245, 158, 11], alpha: 0.12 },
  Travel: { fill: [139, 92, 246], alpha: 0.12 },
  Default: { fill: [71, 85, 105], alpha: 0.12 }
};

/**
 * Draws a session box on the PDF
 */
const drawSessionBox = (doc, x, y, width, height, session, formatTime, formatTypeLabel) => {
  const isDayOff = session.type === "DayOff";
  const colors = TYPE_COLORS_PDF[session.type] || TYPE_COLORS_PDF.Default;
  const padding = 1;
  const lineHeight = 2.9; // Reduced from 3.2 to fit more content

  // Helper to check for Hebrew text
  const hasHebrew = text => /[\u0590-\u05FF]/.test(text);

  if (isDayOff) {
    // Day Off gets special treatment - full height centered label
    doc.setFillColor(...colors.fill);
    doc.setGState(new doc.GState({ opacity: colors.alpha }));
    doc.rect(x, y, width, height, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setFontSize(7);
    doc.setTextColor(...colors.fill);
    doc.setFont(undefined, 'bold');
    const dayOffText = "Day Off";
    const textWidth = doc.getStringUnitWidth(dayOffText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const centerX = x + (width - textWidth) / 2;
    const centerY = y + (height / 2) + (doc.internal.getFontSize() / 2.8);
    doc.text(dayOffText, centerX, centerY);
    return height;
  }

  // Get all lines we need to draw - comprehensive format with RPE and notes
  const lines = [
    // Line 1: Time
    { text: formatTime(session.startTime), isBold: false },
    // Line 2: Type (bold)
    { text: formatTypeLabel(session.type), isBold: true },
    // Line 3: Title (if exists and not Hebrew)
    ...(!hasHebrew(session.title) && session.title && session.title !== formatTypeLabel(session.type)
      ? [{ text: session.title.trim(), isBold: false }]
      : []),
    // Line 4: Total/High minutes and Courts
    { text: `${session.totalMinutes || 0}/${session.highIntensityMinutes || 0}m ${session.courts || 0}c`, isBold: false },
    // Line 5: Court RPE (if > 0)
    ...(session.rpeCourtPlanned > 0
      ? [{ text: `Court: ${session.rpeCourtPlanned}/10`, isBold: false }]
      : []),
    // Line 6: Gym RPE (if > 0)
    ...(session.rpeGymPlanned > 0
      ? [{ text: `Gym: ${session.rpeGymPlanned}/10`, isBold: false }]
      : []),
    // Line 7+: Notes (if exists and not Hebrew)
    ...(session.notes && !hasHebrew(session.notes)
      ? [{ text: sanitizeForPDF(session.notes), isBold: false }]
      : [])
  ].filter(line => line.text);

  // IMPORTANT: Use the provided height, don't exceed it
  // This ensures we stay within the cell boundaries
  const actualHeight = height;

  // Draw box background - use actual height to stay within bounds
  doc.setFillColor(...colors.fill);
  doc.setGState(new doc.GState({ opacity: colors.alpha }));
  doc.rect(x, y, width, actualHeight, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Draw all text lines
  doc.setFontSize(5.0); // Reduced from 5.5 to fit more content
  let currentY = y + padding + 2;

  // Only draw lines that fit within the height
  const maxLines = Math.floor((actualHeight - padding * 2 - 2) / lineHeight);
  const linesToDraw = lines.slice(0, maxLines);

  linesToDraw.forEach(line => {
    doc.setFont(undefined, line.isBold ? 'bold' : 'normal');
    doc.setTextColor(...colors.fill);

    // Handle text width constraints
    let text = line.text;
    const maxWidth = width - (padding * 2);

    while (doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor > maxWidth
           && text.length > 3) {
      text = text.slice(0, -1) + '...';
    }

    doc.text(text, x + padding, currentY);
    currentY += lineHeight;
  });

  return actualHeight;
};

/**
 * Generates calendar days for a date range
 */
const generateCalendarDays = (startDate, endDate) => {
  // Find the Sunday that starts the week containing startDate
  const startDay = startDate.getUTCDay(); // 0 = Sunday
  const calendarStart = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate() - startDay
  ));

  // Find the Saturday that ends the week containing endDate
  const endDay = endDate.getUTCDay();
  const daysUntilSaturday = 6 - endDay;
  const calendarEnd = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate() + daysUntilSaturday
  ));

  // Generate all days in the range
  const days = [];
  const current = new Date(calendarStart);

  while (current <= calendarEnd) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
};

/**
 * Exports the schedule to PDF with the given date range
 * Multi-page support: 2 weeks (14 days) per page
 *
 * @param {Object} params - Export parameters
 * @param {Date} params.startDate - Start date for export range
 * @param {Date} params.endDate - End date for export range
 * @param {Array} params.sessions - All sessions
 * @param {Map} params.sessionsByDate - Sessions organized by date (ISO string keys)
 * @param {Function} params.toISODate - Function to convert Date to ISO string
 * @param {Function} params.slotOf - Function to determine AM/PM slot from time
 * @param {Function} params.formatTime - Function to format time strings
 * @param {Function} params.formatTypeLabel - Function to format type labels
 */
export const exportScheduleToPDF = async ({
  startDate,
  endDate,
  sessions,
  sessionsByDate,
  toISODate,
  slotOf,
  formatTime,
  formatTypeLabel
}) => {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  // Filter sessions to only those in the selected date range
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);
  const filteredSessions = sessions.filter(session => {
    return session.date >= startISO && session.date <= endISO;
  });

  // Generate calendar days based on the selected date range
  const calendarDays = generateCalendarDays(startDate, endDate);

  // Build calendar data with filtered sessions
  const calendarData = calendarDays.map(dayDate => {
    const dateISO = toISODate(dayDate);
    const daySessions = sessionsByDate.get(dateISO) || [];

    // Only include sessions that are in our filtered list
    const filteredDaySessions = daySessions.filter(s =>
      filteredSessions.some(fs => fs.id === s.id)
    );

    const dayOffSession = filteredDaySessions.find(s => s.type === "DayOff");
    const isInRange = dateISO >= startISO && dateISO <= endISO;

    return {
      date: dayDate,
      dateISO,
      dayNum: dayDate.getUTCDate(),
      isOutside: !isInRange,
      dayOffSession,
      amSession: dayOffSession ? null : filteredDaySessions.find(s => s.slot === "AM" || slotOf(s.startTime) === "AM"),
      pmSession: dayOffSession ? null : filteredDaySessions.find(s => s.slot === "PM" || slotOf(s.startTime) === "PM")
    };
  });

  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const effectiveWidth = pageWidth - (margin * 2);

  // Grid dimensions
  const colCount = 7;
  const colWidth = effectiveWidth / colCount;
  const rowHeight = 70; // Optimized height for AM/PM splits
  const cellPadding = 1;
  const rowsPerPage = 2; // 2 weeks per page
  const daysPerPage = rowsPerPage * colCount; // 14 days

  // Calculate pagination
  const totalWeeks = Math.ceil(calendarData.length / 7);
  const totalPages = Math.ceil(totalWeeks / rowsPerPage);

  // Helper function to format date range
  const formatDateRange = (start, end) => {
    const startStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(start);
    const endStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(end);
    return `${startStr} - ${endStr}`;
  };

  // Loop through pages
  for (let page = 0; page < totalPages; page++) {
    // Add new page (except for first page)
    if (page > 0) {
      doc.addPage();
    }

    // Draw title with date range
    doc.setFontSize(14);
    doc.setTextColor(0);
    const titleText = `Team Schedule: ${formatDateRange(startDate, endDate)}`;
    const pageInfo = totalPages > 1 ? ` (Page ${page + 1}/${totalPages})` : '';
    doc.text(titleText + pageInfo, margin, margin + 6);

    // Draw weekday headers
    doc.setFontSize(7);
    doc.setTextColor(100);
    WEEKDAYS.forEach((day, index) => {
      doc.text(day, margin + (colWidth * index) + 3, margin + 15);
    });

    // Grid start position
    const gridStartY = margin + 20;

    // Get days for this page
    const startIdx = page * daysPerPage;
    const endIdx = Math.min(startIdx + daysPerPage, calendarData.length);
    const pageDays = calendarData.slice(startIdx, endIdx);

    // Draw cells for this page
    pageDays.forEach((day, index) => {
      const row = Math.floor(index / 7); // Will be 0 or 1 (2 rows per page)
      const col = index % 7;
      const x = margin + (col * colWidth);
      const y = gridStartY + (row * rowHeight);

      // Draw cell border
      doc.rect(x, y, colWidth, rowHeight);

      // Draw day number
      doc.setFontSize(10);
      doc.setTextColor(day.isOutside ? 160 : 0);
      doc.text(String(day.dayNum), x + 4, y + 6);

      // Draw sessions - handle Day Off differently
      if (day.dayOffSession) {
        const fullHeight = rowHeight - 10;
        drawSessionBox(doc, x + cellPadding, y + 8,
          colWidth - (cellPadding * 2), fullHeight,
          day.dayOffSession, formatTime, formatTypeLabel);
      } else {
        // Regular AM/PM split
        const sessionHeight = (rowHeight - 8 - cellPadding * 2) / 2;

        if (day.amSession) {
          drawSessionBox(doc, x + cellPadding, y + 8,
            colWidth - (cellPadding * 2), sessionHeight,
            day.amSession, formatTime, formatTypeLabel);
        }

        if (day.pmSession) {
          drawSessionBox(doc, x + cellPadding, y + 8 + sessionHeight + cellPadding,
            colWidth - (cellPadding * 2), sessionHeight,
            day.pmSession, formatTime, formatTypeLabel);
        }
      }
    });
  }

  // Generate filename with actual exported date range
  const filename = `team-schedule-${startISO}-to-${endISO}.pdf`;

  doc.save(filename);
};

/**
 * Calculates the number of sessions in a date range
 */
export const countSessionsInRange = (sessions, startDate, endDate, toISODate) => {
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  return sessions.filter(session => {
    const sessionDate = session.date;
    return sessionDate >= startISO && sessionDate <= endISO;
  }).length;
};
