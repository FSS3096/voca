import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

/**
 * Dashboard page — Server Component.
 *
 * Auth guard runs server-side (zero client cost). All interactive UI (repo
 * selection + generate trigger) is delegated to DashboardClient which owns
 * the shared selectedRepo state.
 */
export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session) return redirect('/');

  return (
    <div className="py-16">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-sm text-gray-500">
        Select a repository and generate a LinkedIn post from your latest activity.
      </p>

      <div className="mt-10">
        <DashboardClient />
      </div>
    </div>
  );
}
