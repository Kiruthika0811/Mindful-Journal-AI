import { jsPDF } from 'jspdf';
import { JournalEntry, WeeklyDigest } from '../types';

/**
 * Generates clean Markdown formatted string for a single JournalEntry
 */
export function generateEntryMarkdown(entry: JournalEntry): string {
  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let md = `# ${entry.title || 'Journal Reflection'}\n\n`;
  md += `**Date:** ${formattedDate}  \n`;
  md += `**Mood:** ${entry.moodEmoji} ${entry.mood.toUpperCase()}  \n`;
  if (entry.tags && entry.tags.length > 0) {
    md += `**Tags:** ${entry.tags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}  \n`;
  }
  md += `**Word Count:** ${entry.wordCount} words\n\n`;
  md += `---\n\n`;

  md += `## Reflection Entry\n\n${entry.content || '*No content*'}\n\n`;

  if (entry.summary) {
    md += `## AI Summary & Takeaway\n\n`;
    md += `> ${entry.summary}\n\n`;
    if (entry.actionableTakeaway) {
      md += `**Mindful Takeaway:** *${entry.actionableTakeaway}*\n\n`;
    }
    if (entry.themes && entry.themes.length > 0) {
      md += `**Core Themes:** ${entry.themes.join(', ')}\n\n`;
    }
  }

  if (entry.messages && entry.messages.length > 0) {
    md += `## Gemini AI Reflection Thread\n\n`;
    for (const msg of entry.messages) {
      const speaker = msg.role === 'user' ? '👤 **You**' : '✨ **Gemini Reflection**';
      md += `${speaker} (${new Date(msg.timestamp).toLocaleTimeString()}):\n`;
      md += `${msg.content}\n\n`;
    }
  }

  md += `\n---\n*Exported from Mindful Journal AI*\n`;
  return md;
}

/**
 * Downloads a markdown file to user's device
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean, styled PDF document for a journal entry
 */
export function exportEntryToPdf(entry: JournalEntry): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 24;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Header Banner
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, cursorY - 6, contentWidth, 24, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text(entry.title || 'Journal Reflection', margin + 6, cursorY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const dateStr = new Date(entry.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Recorded: ${dateStr}  |  Mood: ${entry.moodEmoji} ${entry.mood}  |  Words: ${entry.wordCount}`, margin + 6, cursorY + 12);

  cursorY += 28;

  // Tags
  if (entry.tags && entry.tags.length > 0) {
    checkPageBreak(12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`Tags: ${entry.tags.join(', ')}`, margin, cursorY);
    cursorY += 8;
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // Reflection Content Section
  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('Reflection Entry', margin, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  const splitContent = doc.splitTextToSize(entry.content || '(No entry written)', contentWidth);
  
  for (const line of splitContent) {
    checkPageBreak(6);
    doc.text(line, margin, cursorY);
    cursorY += 5.5;
  }
  cursorY += 6;

  // AI Summary & Takeaways
  if (entry.summary) {
    checkPageBreak(30);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Mindful Insights & Actionable Takeaway', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(`Summary: ${entry.summary}`, contentWidth);
    for (const line of summaryLines) {
      checkPageBreak(6);
      doc.text(line, margin, cursorY);
      cursorY += 5;
    }

    if (entry.actionableTakeaway) {
      cursorY += 3;
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      const takeawayLines = doc.splitTextToSize(`Key Takeaway: ${entry.actionableTakeaway}`, contentWidth);
      for (const line of takeawayLines) {
        checkPageBreak(6);
        doc.text(line, margin, cursorY);
        cursorY += 5;
      }
    }
    cursorY += 6;
  }

  // Multi-turn Gemini Dialogue
  if (entry.messages && entry.messages.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Gemini Reflection Thread', margin, cursorY);
    cursorY += 8;

    for (const msg of entry.messages) {
      const isUser = msg.role === 'user';
      checkPageBreak(18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(isUser ? 37 : 99, isUser ? 99 : 102, isUser ? 235 : 241);
      doc.text(isUser ? 'You:' : 'Gemini AI:', margin, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const msgLines = doc.splitTextToSize(msg.content, contentWidth - 4);
      for (const line of msgLines) {
        checkPageBreak(5.5);
        doc.text(line, margin + 4, cursorY);
        cursorY += 4.8;
      }
      cursorY += 4;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Mindful Journal AI  •  Page ${i} of ${totalPages}`, margin, pageHeight - 10);
  }

  const sanitizedTitle = (entry.title || 'journal-entry').toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`${sanitizedTitle}-${new Date(entry.createdAt).toISOString().split('T')[0]}.pdf`);
}

/**
 * Generates and downloads PDF for Weekly Digest
 */
export function exportDigestToPdf(digest: WeeklyDigest): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 24;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Header Banner
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, cursorY - 6, contentWidth, 24, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(49, 46, 129);
  doc.text(`Weekly AI Digest: ${digest.weekRange}`, margin + 6, cursorY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(99, 102, 241);
  doc.text(`Generated: ${new Date(digest.generatedAt).toLocaleDateString()} | Entries Analyzed: ${digest.entriesAnalyzedCount}`, margin + 6, cursorY + 12);

  cursorY += 28;

  // Headline
  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  const headlineLines = doc.splitTextToSize(`"${digest.headline}"`, contentWidth);
  for (const line of headlineLines) {
    doc.text(line, margin, cursorY);
    cursorY += 6;
  }
  cursorY += 4;

  // Overview
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Weekly Synthesis', margin, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(55, 65, 81);
  const overviewLines = doc.splitTextToSize(digest.overview, contentWidth);
  for (const line of overviewLines) {
    checkPageBreak(5.5);
    doc.text(line, margin, cursorY);
    cursorY += 5;
  }
  cursorY += 6;

  // Top Themes
  if (digest.topThemes && digest.topThemes.length > 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Key Themes & Emotional Arc', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`Themes: ${digest.topThemes.join('  •  ')}`, margin, cursorY);
    cursorY += 6;

    if (digest.moodTrends) {
      doc.setTextColor(55, 65, 81);
      const moodLines = doc.splitTextToSize(`Mood Trajectory: ${digest.moodTrends}`, contentWidth);
      for (const line of moodLines) {
        checkPageBreak(5.5);
        doc.text(line, margin, cursorY);
        cursorY += 5;
      }
    }
    cursorY += 6;
  }

  // Celebrations & Inquiries
  if (digest.celebrations && digest.celebrations.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Highlights & Celebrations', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    for (const cel of digest.celebrations) {
      checkPageBreak(6);
      doc.text(`✓ ${cel}`, margin + 2, cursorY);
      cursorY += 5;
    }
    cursorY += 4;
  }

  if (digest.mindfulInquiryForNextWeek && digest.mindfulInquiryForNextWeek.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Inquiry for the Coming Week', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(67, 56, 202);
    for (const inq of digest.mindfulInquiryForNextWeek) {
      checkPageBreak(6);
      doc.text(`? ${inq}`, margin + 2, cursorY);
      cursorY += 5;
    }
    cursorY += 4;
  }

  // Recommended Focus
  if (digest.recommendedFocus) {
    checkPageBreak(15);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, cursorY, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    doc.text(`Recommended Focus: ${digest.recommendedFocus}`, margin + 4, cursorY + 9);
    cursorY += 20;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Mindful Journal AI  •  Weekly Digest  •  Page ${i} of ${totalPages}`, margin, pageHeight - 10);
  }

  doc.save(`weekly-digest-${digest.startDate || 'summary'}.pdf`);
}
