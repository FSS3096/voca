'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface DraftCardProps {
  style: 'raw' | 'polished' | 'short';
  content: string;
  onContentChange: (newContent: string) => void;
}

const STYLE_LABELS: Record<
  DraftCardProps['style'],
  { label: string; description: string; badgeClass: string }
> = {
  raw: {
    label: 'Raw',
    description: 'Unfiltered, first-thought voice',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  polished: {
    label: 'Polished',
    description: 'Cleaned up, still human',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  short: {
    label: 'Short',
    description: 'Under 150 words, punchy',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

function getCharCountColor(count: number): string {
  if (count <= 1300) return 'text-green-600'; // Optimal LinkedIn length
  if (count <= 3000) return 'text-yellow-600'; // Fine but getting long
  return 'text-red-600 font-semibold'; // LinkedIn truncates at ~3000
}

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export function DraftCard({ style, content, onContentChange }: DraftCardProps) {
  const [copied, setCopied] = useState(false);
  const [showLinkedInInstruction, setShowLinkedInInstruction] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const meta = STYLE_LABELS[style];

  // Sync local content only if external content changes and is different to prevent cursor jumps
  useEffect(() => {
    setLocalContent((currentContent) =>
      currentContent === content ? currentContent : content,
    );
  }, [content]);

  // Handle auto-resizing of textarea to prevent any internal scrollbar inside the card
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [localContent]);

  const charCount = localContent.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyWithExecCommand = () => {
    try {
      const el = document.createElement('textarea');
      el.value = localContent;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch (err: unknown) {
      console.error('Synchronous copy failed:', err);
      return false;
    }
  };

  const handlePostToLinkedIn = () => {
    const didCopySynchronously = copyWithExecCommand();
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');

    if (!didCopySynchronously && navigator.clipboard) {
      void navigator.clipboard.writeText(localContent).catch((err: unknown) => {
        console.error('Async clipboard copy failed:', err);
      });
    }

    setShowLinkedInInstruction(true);
    setTimeout(() => setShowLinkedInInstruction(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Badge & Description Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
      </div>

      {/* Editable Area */}
      <div className="flex-1 p-4 flex flex-col bg-transparent">
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => {
            const val = e.target.value;
            setLocalContent(val);
            onContentChange(val);
          }}
          className="w-full resize-none border-0 p-3 text-base text-gray-800 bg-transparent rounded-lg leading-relaxed focus:ring-0 focus:outline-none placeholder-gray-400 font-sans transition-colors duration-150 focus:bg-gray-50 overflow-hidden min-h-[200px]"
          placeholder="Draft will appear here..."
          aria-label={`${meta.label} draft content`}
        />
      </div>

      {/* Character Count & Action Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between gap-4">
        {/* Character Count Warning */}
        <div className="text-xs text-gray-500" aria-live="polite">
          <span className={getCharCountColor(charCount)}>{charCount}</span>
          <span className="text-gray-400"> / 3000</span>
          {charCount > 3000 && (
            <span className="block text-[10px] text-red-500 font-normal">
              May be truncated on LinkedIn
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                copied
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              title="Copy draft content"
            >
              {copied ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>

            {/* Post to LinkedIn Button */}
            <button
              onClick={handlePostToLinkedIn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#004182] transition-colors"
            >
              <LinkedInIcon className="w-4 h-4" />
              Post to LinkedIn
            </button>
          </div>
          
          {/* Instruction Text */}
          <div className="h-0 relative w-full flex justify-end">
            {showLinkedInInstruction && (
              <p className="text-xs text-gray-500 mt-1 absolute top-0 right-0 whitespace-nowrap">
                Text copied — just paste it in LinkedIn
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
