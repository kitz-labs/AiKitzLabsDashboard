import { NextRequest, NextResponse } from 'next/server';
import { requireApiEditor } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { upsertCodingSession } from '@/lib/coding';
import type { CodingWorkspaceState } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  const promptDraft = typeof body.promptDraft === 'string' ? body.promptDraft.trim() : '';
  if (!promptDraft) {
    return NextResponse.json({ error: 'promptDraft is required' }, { status: 400 });
  }

  const session = upsertCodingSession({
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : promptDraft.slice(0, 48),
    summary: typeof body.summary === 'string' ? body.summary : 'Saved coding snapshot',
    input: promptDraft,
    output: typeof body.output === 'string' ? body.output : '',
    status: 'saved',
    agents: Array.isArray(body.agents) ? body.agents : [],
    selectedActions: Array.isArray(body.selectedActions) ? body.selectedActions : [],
    workspaceState: body.workspaceState && typeof body.workspaceState === 'object' ? body.workspaceState as CodingWorkspaceState : null,
    createdBy: actor.username,
  });

  logAudit({
    actor,
    action: 'coding.snapshot.save',
    target: `coding_session:${session.id}`,
    detail: { title: session.title },
  });

  return NextResponse.json({ session }, { status: 201 });
}
