import React, { useState } from 'react';
import { Download, FileText, FileCode, X, Check } from 'lucide-react';
import { JournalEntry } from '../types';
import { generateEntryMarkdown, downloadMarkdownFile, exportEntryToPdf } from '../lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: JournalEntry | null;
  allEntries?: JournalEntry[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entry,
  allEntries = [],
}) => {
  const [exportScope, setExportScope] = useState<'single' | 'all'>(entry ? 'single' : 'all');
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportScope === 'single' && entry) {
        if (format === 'markdown') {
          const md = generateEntryMarkdown(entry);
          const sanitizedTitle = (entry.title || 'reflection').toLowerCase().replace(/[^a-z0-9]/g, '-');
          downloadMarkdownFile(`${sanitizedTitle}-${new Date(entry.createdAt).toISOString().split('T')[0]}.md`, md);
        } else {
          exportEntryToPdf(entry);
        }
      } else if (exportScope === 'all') {
        if (format === 'markdown') {
          let combinedMd = `# My Mindful Journal Archive\n\nExported on: ${new Date().toLocaleDateString()}\nTotal Entries: ${allEntries.length}\n\n=========================================\n\n`;
          allEntries.forEach((e, idx) => {
            combinedMd += `\n\n### Entry ${idx + 1}\n\n` + generateEntryMarkdown(e);
            combinedMd += `\n\n-----------------------------------------\n`;
          });
          downloadMarkdownFile(`mindful-journal-full-export-${new Date().toISOString().split('T')[0]}.md`, combinedMd);
        } else {
          // Export each or primary
          if (allEntries.length > 0) {
            exportEntryToPdf(allEntries[0]);
          }
        }
      }
      setCompleted(true);
      setTimeout(() => {
        setCompleted(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-stone-900 rounded-2xl max-w-md w-full shadow-2xl p-6 border border-stone-800 flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-lg font-serif">Export Reflections</h3>
              <p className="text-xs text-stone-400">Download formatted entries for offline reading</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selection (if both available) */}
        {entry && allEntries.length > 1 && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Export Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('single')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  exportScope === 'single'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 font-bold'
                    : 'border-stone-800 bg-stone-850 text-stone-400 hover:bg-stone-800'
                }`}
              >
                Current Entry Only
              </button>
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  exportScope === 'all'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 font-bold'
                    : 'border-stone-800 bg-stone-850 text-stone-400 hover:bg-stone-800'
                }`}
              >
                All Entries ({allEntries.length})
              </button>
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
            Choose Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setFormat('markdown')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                format === 'markdown'
                  ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40'
                  : 'border-stone-800 bg-stone-850 hover:bg-stone-800'
              }`}
            >
              <FileCode className={`w-7 h-7 mb-2 ${format === 'markdown' ? 'text-amber-400' : 'text-stone-500'}`} />
              <span className="text-sm font-bold text-stone-100">Markdown (.md)</span>
              <span className="text-[11px] text-stone-400 mt-1">Plain text with markdown headers & chat log</span>
            </div>

            <div
              onClick={() => setFormat('pdf')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                format === 'pdf'
                  ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40'
                  : 'border-stone-800 bg-stone-850 hover:bg-stone-800'
              }`}
            >
              <FileText className={`w-7 h-7 mb-2 ${format === 'pdf' ? 'text-amber-400' : 'text-stone-500'}`} />
              <span className="text-sm font-bold text-stone-100">Document (PDF)</span>
              <span className="text-[11px] text-stone-400 mt-1">Formatted document with headers & AI insights</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-stone-100 bg-stone-800 border border-stone-700 rounded-xl hover:bg-stone-750 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-export-btn"
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="px-5 py-2 text-xs font-extrabold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {completed ? (
              <>
                <Check className="w-4 h-4 text-stone-950" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : `Download ${format.toUpperCase()}`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

