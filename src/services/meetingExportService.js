// src/services/meetingExportService.js
import { jsPDF } from 'jspdf';
import { heeboFonts } from '../heeboFonts';

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

const formatSessionTime = (session) => {
  const time = session?.startTime || session?.time;
  if (!time) return "—";
  if (typeof time === 'string' && time.includes(':')) return time;
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return time;
  }
};

/**
 * Generate Meeting Protocol PDF using jsPDF with Heebo font
 */
export const generateMeetingPDF = async ({
  session,
  agenda = [],
  actionItems = [],
  generalNotes = ''
}) => {
  try {
    console.log('Starting PDF generation with jsPDF + Heebo...');

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add Heebo font
    doc.addFileToVFS('Heebo-Regular.ttf', heeboFonts['Heebo-Regular.ttf']);
    doc.addFont('Heebo-Regular.ttf', 'Heebo', 'normal');
    doc.setFont('Heebo');

    const meetingTitle = session.title || 'פגישת צוות';
    const meetingDate = formatDate(session.date);
    const meetingTime = formatSessionTime(session);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add text with RTL support
    const addRTLText = (text, x, y, options = {}) => {
      const fontSize = options.fontSize || 12;
      const isBold = options.bold || false;
      const align = options.align || 'right';

      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont('Heebo', 'bold');
      } else {
        doc.setFont('Heebo', 'normal');
      }

      if (align === 'center') {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
      } else if (align === 'right') {
        doc.text(text, pageWidth - margin, y, { align: 'right' });
      } else {
        doc.text(text, x, y);
      }
    };

    // Helper to check if we need a new page
    const checkNewPage = (spaceNeeded) => {
      if (yPos + spaceNeeded > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Header
    addRTLText('פרוטוקול פגישה', 0, yPos, { fontSize: 24, bold: true, align: 'center' });
    yPos += 10;

    addRTLText(meetingTitle, 0, yPos, { fontSize: 18, bold: true, align: 'center' });
    yPos += 8;

    addRTLText(`${meetingDate} • ${meetingTime}`, 0, yPos, { fontSize: 12, align: 'center' });
    yPos += 10;

    // Horizontal line
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Agenda Section
    checkNewPage(20);
    addRTLText('סדר יום ודיון', pageWidth - margin, yPos, { fontSize: 16, bold: true });
    yPos += 8;

    if (agenda.length === 0) {
      addRTLText('לא נרשמו נושאים', pageWidth - margin, yPos, { fontSize: 12 });
      yPos += 6;
    } else {
      agenda.forEach((item, index) => {
        checkNewPage(30);

        // Background box
        doc.setFillColor(249, 250, 251);
        const boxHeight = 8 + (item.notes && item.notes.trim() ? 15 : 0);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, boxHeight, 'F');

        // Title
        addRTLText(`${index + 1}. ${item.title || 'ללא כותרת'}`, pageWidth - margin, yPos, { fontSize: 14, bold: true });
        yPos += 7;

        // Notes
        if (item.notes && item.notes.trim()) {
          const lines = doc.splitTextToSize(item.notes, pageWidth - 2 * margin - 20);
          lines.forEach(line => {
            checkNewPage(6);
            addRTLText(line, pageWidth - margin - 10, yPos, { fontSize: 12 });
            yPos += 5;
          });
        }

        yPos += 5;
      });
    }

    // Action Items Section
    yPos += 5;
    checkNewPage(25);
    addRTLText('משימות', pageWidth - margin, yPos, { fontSize: 16, bold: true });
    yPos += 8;

    if (actionItems.length === 0) {
      addRTLText('לא נרשמו משימות', pageWidth - margin, yPos, { fontSize: 12 });
      yPos += 6;
    } else {
      // Table header
      checkNewPage(15);
      doc.setFillColor(229, 231, 235);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setDrawColor(209, 213, 219);

      const col1X = pageWidth - margin;
      const col2X = pageWidth - margin - 30;
      const col3X = pageWidth - margin - 60;
      const col4X = margin + (pageWidth - 2 * margin - 90);

      addRTLText('תאריך יעד', col1X, yPos, { fontSize: 11, bold: true });
      addRTLText('אחראי', col2X, yPos, { fontSize: 11, bold: true });
      addRTLText('משימה', col3X, yPos, { fontSize: 11, bold: true });
      doc.text('✓', margin + 5, yPos, { align: 'left' });

      yPos += 3;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      // Table rows
      actionItems.forEach(item => {
        checkNewPage(10);

        const deadlineText = item.deadline
          ? new Date(item.deadline).toLocaleDateString('he-IL')
          : '—';

        if (item.completed) {
          doc.setTextColor(156, 163, 175);
        } else {
          doc.setTextColor(0, 0, 0);
        }

        addRTLText(deadlineText, col1X, yPos, { fontSize: 11 });
        addRTLText(item.responsible || '', col2X, yPos, { fontSize: 11 });

        const taskLines = doc.splitTextToSize(item.task || '', col3X - col4X - 40);
        addRTLText(taskLines[0] || '', col3X, yPos, { fontSize: 11 });

        if (item.completed) {
          doc.text('✓', margin + 5, yPos, { align: 'left' });
        }

        yPos += 6;
        doc.setDrawColor(209, 213, 219);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 3;

        doc.setTextColor(0, 0, 0);
      });
    }

    // General Notes
    if (generalNotes && generalNotes.trim()) {
      yPos += 10;
      checkNewPage(25);
      addRTLText('הערות כלליות', pageWidth - margin, yPos, { fontSize: 16, bold: true });
      yPos += 8;

      doc.setFillColor(249, 250, 251);
      const notesLines = doc.splitTextToSize(generalNotes, pageWidth - 2 * margin - 10);
      const notesHeight = notesLines.length * 5 + 8;

      checkNewPage(notesHeight);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, notesHeight, 'F');

      notesLines.forEach(line => {
        addRTLText(line, pageWidth - margin - 5, yPos, { fontSize: 12 });
        yPos += 5;
      });
      yPos += 5;
    }

    // Footer
    yPos = pageHeight - margin - 5;
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    const footerText = `נוצר בתאריך ${new Date().toLocaleDateString('he-IL')} בשעה ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    addRTLText(footerText, 0, yPos, { fontSize: 10, align: 'center' });

    // Generate filename
    const sanitizeFileName = (str) => {
      return str
        .replace(/[^a-zA-Z0-9-_\u0590-\u05FF]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
    };

    const titleForFilename = session.title || 'Meeting';
    const fileName = `meeting-protocol-${sanitizeFileName(session.date)}-${sanitizeFileName(titleForFilename)}.pdf`;

    // Save PDF
    doc.save(fileName);

    console.log('✓ Meeting protocol PDF generated successfully');
    return true;
  } catch (error) {
    console.error('✗ Error generating meeting protocol PDF:', error);
    throw error;
  }
};
