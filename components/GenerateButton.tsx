'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingView } from '@/components/LoadingView';

// ─── Placeholder views ────────────────────────────────────────────────────────
// LoadingView is now the real component from VOC-132 (components/LoadingView.tsx).
// ErrorView below remains a stub until VOC-133 (Issue #18) ships.

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <p className="text-sm font-medium text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white
          transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2
          focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GenerateButtonProps {
  /** The full repository name (e.g. "owner/repo"). Null when no repo is selected. */
  selectedRepo: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * VOC-131 — Generate Post trigger button.
 *
 * Behaviour matrix:
 *   • No repo selected  → disabled button with muted label
 *   • Repo selected     → primary CTA; calls POST /api/generate on click
 *   • Loading           → button replaced by LoadingView (no double-submit possible)
 *   • Error             → ErrorView with retry; button becomes visible again
 *   • Success           → stores result in sessionStorage, redirects to /drafts
 *
 * sessionStorage is intentional: drafts are ephemeral to the browser session and
 * must not persist across sessions (localStorage would be wrong here).
 */
export function GenerateButton({ selectedRepo }: GenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    // Guard: should never reach here when disabled, but be explicit.
    if (!selectedRepo) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo }),
      });

      // Always parse JSON — the API contract guarantees a JSON body on all responses.
      const data: unknown = await res.json();

      if (!res.ok) {
        const errData = data as { error?: string };
        throw new Error(errData.error ?? 'Generation failed');
      }

      const successData = data as { noActivity?: boolean };
      if (successData.noActivity) {
        throw new Error(
          'No recent activity found in this repo. Try a repo with recent commits or PRs.',
        );
      }

      // Store result in sessionStorage so the /drafts page can read it without
      // a redundant network round-trip. The key is namespaced to avoid collisions.
      sessionStorage.setItem('voca_drafts', JSON.stringify(data));
      router.push('/drafts');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      // Only reset loading state on error; on success the page navigates away.
      setIsLoading(false);
    }
  }

  // ── State: loading ──────────────────────────────────────────────────────────
  // Button is NOT rendered during loading, eliminating any double-submit risk.
  if (isLoading) {
    return <LoadingView />;
  }

  // ── State: error ────────────────────────────────────────────────────────────
  // The button becomes visible again alongside the ErrorView so the user can retry.
  if (error) {
    return (
      <div className="flex w-full max-w-[400px] mx-auto flex-col gap-3">
        <ErrorView message={error} onRetry={handleGenerate} />
        <button
          type="button"
          id="generate-post-btn"
          onClick={handleGenerate}
          disabled={!selectedRepo}
          className="w-full rounded-lg bg-blue-600 py-3 px-6 font-medium text-white
            transition-colors hover:bg-blue-700 focus-visible:outline
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate Post from Latest Activity
        </button>
      </div>
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
