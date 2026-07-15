import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateActivitySummary } from '@/services/activity.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  
  // Test override for auth_expired
  const repoFullName = req.body?.repoFullName;
  if (repoFullName === 'trigger-auth-expired') {
    console.error('[/api/generate] Error:', {
      error: 'Unauthorized',
      repoFullName,
      userId: undefined,
      timestamp: new Date().toISOString(),
    });
    return res.status(401).json({ error: 'Your session expired. Sign in again to continue.' });
  }

  if (!session || !session.user) {
    console.error('[/api/generate] Error:', {
      error: 'Unauthorized',
      repoFullName,
      userId: undefined,
      timestamp: new Date().toISOString(),
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Resolve current user
  let user = null;
  if (session.user.id) {
    user = await prisma.user.findUnique({ where: { id: session.user.id } });
  } else if (session.user.email) {
    user = await prisma.user.findUnique({ where: { email: session.user.email } });
  } else if ((session.user as any).githubId) {
    user = await prisma.user.findUnique({ where: { githubId: (session.user as any).githubId } });
  }

  if (!user || !user.accessToken) {
    console.error('[/api/generate] Error:', {
      error: 'Missing token',
      repoFullName,
      userId: session.user?.email || session.user?.id,
      timestamp: new Date().toISOString(),
    });
    return res.status(403).json({ error: 'Missing token' });
  }

  try {
    // ── Test triggers ──────────────────────────────────────────────────────────
    if (repoFullName === 'trigger-no-activity') {
      return res.status(200).json({ noActivity: true });
    }

    if (repoFullName === 'trigger-ai-failure') {
      throw new Error('Claude API error: Rate limit exceeded or invalid API key');
    }

    if (repoFullName === 'trigger-repo-not-found') {
      return res.status(404).json({ error: "Can't access this repo. Make sure it's a repo you have push access to." });
    }

    if (repoFullName === 'trigger-server-error') {
      throw new Error('Database connection reset unexpectedly');
    }

    if (repoFullName === 'trigger-timeout') {
      // Sleep for 50 seconds to trigger client timeout
      await new Promise((resolve) => setTimeout(resolve, 50000));
      return res.status(200).json({ success: true });
    }

    // ── Real Logic (Milestone #15 placeholder) ───────────────────────────────
    // For normal requests, fetch activity summary and simulate generation
    const result = await generateActivitySummary(repoFullName, user.accessToken);
    if (!result.summary) {
      return res.status(200).json({ noActivity: true });
    }

    // Mock successful 3 drafts return
    return res.status(200).json({
      noActivity: false,
      drafts: [
        { id: 1, text: `Draft 1 for ${repoFullName}: focused on latest changes.` },
        { id: 2, text: `Draft 2 for ${repoFullName}: a more casual variation.` },
        { id: 3, text: `Draft 3 for ${repoFullName}: professional highlights.` },
      ],
      metadata: {
        repoFullName,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    // Log the error server-side. DO NOT log the user's access token!
    console.error('[/api/generate] Error:', {
      error: err instanceof Error ? err.message : err,
      repoFullName,
      userId: session?.user?.email || session?.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Distinguish Claude/AI failure from generic server errors
    if (err.message && (err.message.includes('Claude') || err.message.includes('API key') || err.message.includes('Rate limit'))) {
      return res.status(502).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
