'use client';

import React, { useState } from 'react';
import RepoSelector from '@/components/RepoSelector';
import { GenerateButton } from '@/components/GenerateButton';

/**
 * DashboardClient — Client Component boundary for the dashboard page.
 *
 * The dashboard page (Server Component) cannot hold local state, so this wrapper
 * acts as the single source of truth for `selectedRepo`. Both RepoSelector and
 * GenerateButton consume it, eliminating any prop-drilling issues across the tree.
 *
 * State flow:
 *   RepoSelector → onRepoSelect(repoFullName) → selectedRepo state
 *   GenerateButton reads selectedRepo → triggers POST /api/generate
 */
export default function DashboardClient() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Repository selection */}
      <section aria-labelledby="repo-selector-heading">
        <h3 id="repo-selector-heading" className="text-lg font-medium mb-4">
          Select a repository
        </h3>
        <RepoSelector onRepoSelect={setSelectedRepo} selectedRepo={selectedRepo} />
      </section>

      {/* Generate trigger — disabled until a repo is chosen */}
      <section aria-label="Generate post">
        <GenerateButton selectedRepo={selectedRepo} />
      </section>
    </div>
  );
}
