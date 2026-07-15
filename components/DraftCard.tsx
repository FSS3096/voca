'use client';

import React, { useState, useEffect } from 'react';

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

export function DraftCard({ style, content, onContentChange }: DraftCardProps) {
  const [copied, setCopied] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const meta = STYLE_LABELS[style];

  // Sync local content if external content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

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

  const handleLinkedInShare = async () => {
    // Copy to clipboard first for convenience
    try {
      await navigator.clipboard.writeText(localContent);
    } catch (err) {
      console.error('Clipboard copy failed before sharing:', err);
    }
    
    // Open LinkedIn compose deep link
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
      localContent
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
      <div className="flex-1 p-4 flex flex-col min-h-[250px]">
        <textarea
          value={localContent}
          onChange={(e) => {
            const val = e.target.value;
            setLocalContent(val);
            onContentChange(val);
          }}
          className="flex-1 w-full resize-none border-0 p-0 text-sm text-gray-800 focus:ring-0 focus:outline-none placeholder-gray-400 font-sans leading-relaxed"
          placeholder="Write your draft here..."
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
            type="button"
            onClick={handleLinkedInShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0A66C2] text-white border border-[#0A66C2] hover:bg-[#004182] transition-colors duration-150"
            title="Copy to clipboard and open LinkedIn sharing window"
          >
            <span>Share</span>
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
