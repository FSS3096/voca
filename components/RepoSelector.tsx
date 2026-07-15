'use client';

import React, { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Repo = {
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
};

interface RepoSelectorProps {
  /**
   * Called whenever the user changes their selection.
   * Receives the repo's `full_name` (e.g. "owner/repo") or null on deselect.
   * Optional: when omitted, the component manages selection internally (legacy usage).
   */
  onRepoSelect?: (repoFullName: string | null) => void;
  /**
   * Controlled selected value. Pass this when the parent owns the selection state.
   * Optional: when omitted, the component manages selection internally (legacy usage).
   */
  selectedRepo?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * RepoSelector — lists the authenticated user's GitHub repositories and lets
 * them pick one.
 *
 * Supports two modes:
 *   1. **Controlled** (VOC-131): parent passes `onRepoSelect` + `selectedRepo`.
 *      The component calls back with the `full_name` on each click; no internal
 *      router.push is performed. This mode is used on the dashboard.
 *   2. **Uncontrolled / legacy**: no props passed. The component manages its own
 *      selection state and calls `router.push('/commits')` on confirm — preserving
 *      the original behaviour for any existing callers.
 */
export default function RepoSelector({
  onRepoSelect,
  selectedRepo: controlledRepo,
}: RepoSelectorProps) {
  const isControlled = onRepoSelect !== undefined;

  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Internal selection state is only used in uncontrolled mode.
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // In controlled mode, the "selected" value comes from the parent.
  const selectedFullName = isControlled ? controlledRepo : internalSelected;

  // ── Fetch repositories on mount ────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch('/api/repos', { credentials: 'same-origin' })
      .then(async (r) => {
        const contentType = r.headers.get('content-type') ?? '';
        if (!r.ok) {
          if (contentType.includes('application/json')) {
            const err = await r.json();
            throw new Error((err as { error?: string }).error ?? 'Request failed');
          }
          const txt = await r.text();
          throw new Error(`Unexpected response: ${txt.slice(0, 200)}`);
        }
        if (!contentType.includes('application/json')) {
          const txt = await r.text();
          throw new Error(`Expected JSON but got: ${txt.slice(0, 200)}`);
        }
        return r.json() as Promise<{ repos: Repo[]; error?: string }>;
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRepos(d.repos);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load repositories'),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelect(fullName: string) {
    if (isControlled) {
      // Controlled mode: toggle off if already selected, otherwise select.
      onRepoSelect(selectedFullName === fullName ? null : fullName);
    } else {
      setInternalSelected((prev) => (prev === fullName ? null : fullName));
    }
  }

  // Uncontrolled-only: persists the selection via API and navigates.
  async function confirmLegacy() {
    if (!internalSelected || saving) return;

    setSaving(true);
    const repo = repos?.find((r) => r.full_name === internalSelected);
    if (!repo) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/repos/select', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName: repo.name, repoFullName: repo.full_name }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      // Use window.location for a full navigation after server-side persistence.
      // This is intentional: the legacy flow expects a clean page load on /commits.
      window.location.href = data.redirect ?? '/commits';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save selection');
    } finally {
      setSaving(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="text-sm text-gray-500">
        Loading repositories…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return <div className="text-sm text-gray-500">No repositories found.</div>;
  }

  return (
    <div className="space-y-4">
      <ul
        role="listbox"
        aria-label="GitHub repositories"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {repos.map((r) => {
          const isSelected = selectedFullName === r.full_name;
          return (
            <li
              key={r.full_name}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(r.full_name)}
              className={`p-4 border rounded-md cursor-pointer transition-colors
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">{r.private ? 'Private' : 'Public'}</div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Updated: {new Date(r.updated_at).toLocaleString()}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Confirm button is only shown in uncontrolled/legacy mode */}
      {!isControlled && (
        <div className="pt-2">
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded-md
              disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700
              transition-colors"
            onClick={confirmLegacy}
            disabled={!internalSelected || saving}
          >
            {saving ? 'Saving…' : 'Confirm Selection'}
          </button>
        </div>
      )}
    </div>
  );
}
