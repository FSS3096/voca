'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingView } from '@/components/LoadingView';
import { ErrorView, ErrorType } from '@/components/ErrorView';

interface GenerateButtonProps {
  /** The full repository name (e.g. "owner/repo"). Null when no repo is selected. */
  selectedRepo: string | null;
  /** Callback to clear the repository selection in the parent component. */
  onResetRepo?: () => void;
}

/**
 * VOC-131 & VOC-133 — Generate Post trigger button and error handling flow.
 *
 * Behaviour matrix:
 *   • No repo selected  → disabled button with muted label
 *   • Repo selected     → primary CTA; calls POST /api/generate on click
 *   • Loading           → button replaced by LoadingView (no double-submit possible)
 *   • Error             → ErrorView shows mapped user-facing message and retry/back options
 *   • Success           → stores result in sessionStorage, redirects to /drafts
 */
export function GenerateButton({ selectedRepo, onResetRepo }: GenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: ErrorType; message?: string } | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    if (!selectedRepo) return;

    setIsLoading(true);
    setError(null);

    // Set up AbortController for a client-side request timeout of 45 seconds (VOC-133 requirement)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Attempt to parse JSON response. Fallback to empty object if response is not JSON.
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

      // Store result in sessionStorage so the drafts page can read it.
      // sessionStorage is used deliberately — drafts are session-specific and shouldn't persist.
      sessionStorage.setItem('voca_drafts', JSON.stringify(data));
      router.push('/drafts');
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
  }

  function handleBack() {
    // If the error was repo_not_found, we should reset the repo selection in parent
    if (error?.type === 'repo_not_found' && onResetRepo) {
      onResetRepo();
    }
    setError(null);
  }

  // ── State: loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingView />;
  }

  // ── State: error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorView
        errorType={error.type}
        message={error.message}
        onRetry={handleGenerate}
        onBack={handleBack}
      />
    );
  }

  // ── State: idle ─────────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      id="generate-post-btn"
      onClick={handleGenerate}
      disabled={!selectedRepo}
      aria-disabled={!selectedRepo}
      aria-label={
        selectedRepo
          ? `Generate post from ${selectedRepo}`
          : 'Select a repository first'
      }
      className="w-full max-w-[400px] mx-auto block rounded-lg py-3 px-6 font-medium
        transition-colors focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-2 focus-visible:outline-blue-600
        disabled:cursor-not-allowed disabled:opacity-40
        bg-blue-600 text-white hover:bg-blue-700
        disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300"
    >
      {selectedRepo ? 'Generate Post from Latest Activity' : 'Select a repo first'}
    </button>
  );
}
