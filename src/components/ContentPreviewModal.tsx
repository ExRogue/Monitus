'use client';

import { X, Copy, Download, Edit2, Save } from 'lucide-react';
import { useState } from 'react';
import SimpleMarkdown from './SimpleMarkdown';
import Badge from './ui/Badge';
import Button from './ui/Button';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
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
  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (editedContent !== content.content) {
      try {
        await fetch('/api/content/edit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_id: content.id,
            edited_text: editedContent,
          }),
        });
      } catch (err) {
        console.error('Failed to persist voice edit:', err);
      }
    }
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
