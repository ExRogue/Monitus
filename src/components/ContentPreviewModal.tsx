'use client';

import { X, Copy, Download, Edit2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import SimpleMarkdown from './SimpleMarkdown';
import Badge from './ui/Badge';
import Button from './ui/Button';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  compliance_status: string;
  compliance_notes: string;
  created_at: string;
}

interface Props {
  content: ContentItem;
  onClose: () => void;
  onSave?: (updatedContent: ContentItem) => void;
}

export default function ContentPreviewModal({ content, onClose, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content.content);
  const [copied, setCopied] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...content, content: editedContent });
    }
    setIsEditing(false);
  };

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getComplianceScore = (notes: string): number => {
    try {
      const parsed = JSON.parse(notes);
      return typeof parsed.score === 'number' ? parsed.score : 85;
    } catch {
      return 85;
    }
  };

  const score = getComplianceScore(content.compliance_notes);
  const wordCount = editedContent.split(/\s+/).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--navy-light)] border-b border-[var(--border)] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{content.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="purple">{content.content_type}</Badge>
              <Badge variant={score >= 85 ? 'success' : 'warning'}>{score}% Compliance</Badge>
              <span className="text-xs text-[var(--text-secondary)]">{wordCount} words</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(content.content);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Compliance Info */}
          <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg">
            <button
              onClick={() => setComplianceOpen(!complianceOpen)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-semibold text-[var(--text-primary)]">Compliance Report</span>
              {complianceOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
            </button>
            {complianceOpen && (
              <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--text-secondary)]">Overall Score</span>
                  <span className="font-semibold text-[var(--text-primary)]">{score}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--navy-lighter)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content Editor or Viewer */}
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-96 bg-[var(--navy)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
              placeholder="Edit content..."
            />
          ) : (
            <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-6">
              <SimpleMarkdown
                content={editedContent}
                className="text-[var(--text-secondary)] text-sm leading-relaxed prose-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
