'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GenerationResult, Draft } from '@/types/generation';
import { DraftCard } from '@/components/DraftCard';
import { LoadingView } from '@/components/LoadingView';
import { ErrorView, ErrorType } from '@/components/ErrorView';

const DEFAULT_STYLES: Array<'raw' | 'polished' | 'short'> = ['raw', 'polished', 'short'];

export default function DraftsPage() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: ErrorType; message?: string } | null>(null);
  const router = useRouter();

  // Load from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('voca_drafts');
    if (!raw) {
      router.replace('/dashboard');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.drafts)) {
        throw new Error('Invalid format');
      }
      setResult(parsed);
    } catch {
      router.replace('/dashboard');
    }
  }, [router]);

  // Update content of a draft in state & sessionStorage
  const handleContentChange = (index: number, newContent: string) => {
    if (!result) return;
    const updatedDrafts = [...result.drafts];
    updatedDrafts[index] = { ...updatedDrafts[index], text: newContent };
    const updatedResult = { ...result, drafts: updatedDrafts };
    
    setResult(updatedResult);
    sessionStorage.setItem('voca_drafts', JSON.stringify(updatedResult));
  };

  // Re-run generation for the same repository
  const handleRegenerate = async () => {
    const repoFullName = result?.metadata?.repoFullName;
    if (!repoFullName) return;

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s client timeout

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        let type: ErrorType = 'server_error';
        if (res.status === 401) {
          type = 'auth_expired';
        } else if (res.status === 404) {
          type = 'repo_not_found';
        } else if (res.status === 504 || res.status === 408) {
          type = 'timeout';
        } else if (
          res.status === 502 ||
          res.status === 503 ||
          (data.error && (data.error.toLowerCase().includes('claude') || data.error.toLowerCase().includes('ai')))
        ) {
          type = 'ai_failure';
        } else if (
          data.error &&
          (data.error.toLowerCase().includes('activity') || data.error.toLowerCase().includes('commits'))
        ) {
          type = 'no_activity';
        }

        setError({ type, message: data.error });
        setIsLoading(false);
        return;
      }

      if (data.noActivity) {
        setError({ type: 'no_activity' });
        setIsLoading(false);
        return;
      }

      // Update local state and sessionStorage
      setResult(data);
      sessionStorage.setItem('voca_drafts', JSON.stringify(data));
      setIsLoading(false);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setIsLoading(false);

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError({ type: 'timeout' });
      } else if (err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('fetch'))) {
        setError({ type: 'network' });
      } else {
        setError({
          type: 'server_error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
      }
    }
  };

  const handleBackFromError = () => {
    setError(null);
  };

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingView />
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="py-12">
        <ErrorView
          errorType={error.type}
          message={error.message}
          onRetry={handleRegenerate}
          onBack={handleBackFromError}
        />
      </div>
    );
  }

  if (!result) return null;

  const repoName = result.metadata?.repoFullName || 'Selected Repository';

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Here are 3 posts based on your latest work
        </h1>
        <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
          <span>From repository:</span>
          <span className="font-semibold text-gray-700">{repoName}</span>
        </p>
      </div>

      {/* Draft Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {result.drafts.map((draft, index) => {
          // Fallback style if none provided by API: raw, polished, short in sequence
          const style = draft.style || DEFAULT_STYLES[index % DEFAULT_STYLES.length];

          return (
            <div key={draft.id || index} className="h-full">
              <DraftCard
                style={style}
                content={draft.text}
                onContentChange={(newContent) => handleContentChange(index, newContent)}
              />
            </div>
          );
        })}
      </div>

      {/* Regeneration Button */}
      <div className="flex flex-col items-center justify-center border-t border-gray-100 pt-8 gap-3">
        <button
          type="button"
          onClick={handleRegenerate}
          className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Generate again from this repository
        </button>
        <p className="text-xs text-gray-400">
          Will pull your latest work activity again and generate fresh drafts.
        </p>
      </div>
    </div>
  );
}
