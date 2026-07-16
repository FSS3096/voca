'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GenerationResult, Draft } from '@/types/generation';
import { DraftCard } from '@/components/DraftCard';
import { LoadingView } from '@/components/LoadingView';
import { ErrorView, ErrorType } from '@/components/ErrorView';

const DEFAULT_STYLES: Array<'raw' | 'polished' | 'short'> = ['raw', 'polished', 'short'];
type GenerateResponse = Partial<GenerationResult> & { error?: string };

export default function DraftsPage() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<{ type: ErrorType; message?: string } | null>(null);
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

  const getRegenerationError = (status: number, message?: string): ErrorType => {
    const normalizedMessage = message?.toLowerCase() || '';

    if (status === 401) return 'auth_expired';
    if (status === 404) return 'repo_not_found';
    if (status === 504 || status === 408) return 'timeout';
    if (
      status === 502 ||
      status === 503 ||
      normalizedMessage.includes('claude') ||
      normalizedMessage.includes('ai')
    ) {
      return 'ai_failure';
    }
    if (normalizedMessage.includes('activity') || normalizedMessage.includes('commits')) {
      return 'no_activity';
    }

    return 'server_error';
  };

  // Re-run generation for the same repository
  const handleRegenerate = async () => {
    const repoFullName = result?.metadata?.repoFullName;
    if (!repoFullName) return;

    setIsRegenerating(true);
    setRegenError(null);

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

      const data = (await res.json().catch(() => ({}))) as GenerateResponse;

      if (!res.ok) {
        setRegenError({ type: getRegenerationError(res.status, data.error), message: data.error });
        return;
      }

      if (data.noActivity) {
        setRegenError({ type: 'no_activity' });
        return;
      }

      if (!Array.isArray(data.drafts)) {
        setRegenError({ type: 'server_error', message: 'Regeneration returned an invalid response.' });
        return;
      }

      const nextResult: GenerationResult = {
        noActivity: false,
        drafts: data.drafts,
        metadata: data.metadata ?? {
          repoFullName,
          generatedAt: new Date().toISOString(),
        },
      };

      // Update local state and sessionStorage
      setResult(nextResult);
      sessionStorage.setItem('voca_drafts', JSON.stringify(nextResult));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setRegenError({ type: 'timeout' });
      } else if (err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('fetch'))) {
        setRegenError({ type: 'network' });
      } else {
        setRegenError({
          type: 'server_error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsRegenerating(false);
    }
  };

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

      {isRegenerating ? (
        <div className="mb-12 rounded-xl border border-gray-100 bg-white">
          <LoadingView />
        </div>
      ) : regenError ? (
        <div className="mb-12 rounded-xl border border-gray-100 bg-white">
          <ErrorView
            errorType={regenError.type}
            message={regenError.message}
            onRetry={handleRegenerate}
          />
        </div>
      ) : (
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
      )}

      {/* Regeneration Button */}
      <div className="flex flex-col items-center justify-center border-t border-gray-100 pt-8 gap-3">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
        >
          Generate again
        </button>
        <p className="text-xs text-gray-400">
          Will pull your latest work activity again and generate fresh drafts.
        </p>
      </div>
    </div>
  );
}
