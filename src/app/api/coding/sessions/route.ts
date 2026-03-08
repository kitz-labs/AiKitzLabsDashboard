import { NextRequest, NextResponse } from 'next/server';
import { requireApiEditor, requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { archiveCodingSessionRecord, listCodingSessions, upsertCodingSession } from '@/lib/coding';
import type { CodingWorkspaceState } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  return NextResponse.json({ sessions: listCodingSessions() });
}

export async function POST(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const session = upsertCodingSession({
    id: typeof body.id === 'string' ? body.id : undefined,
    title: body.title,
    summary: typeof body.summary === 'string' ? body.summary : '',
    input: typeof body.input === 'string' ? body.input : '',
    output: typeof body.output === 'string' ? body.output : '',
    status: body.status === 'active' || body.status === 'saved' || body.status === 'archived' ? body.status : 'saved',
    agents: Array.isArray(body.agents) ? body.agents : [],
    selectedActions: Array.isArray(body.selectedActions) ? body.selectedActions : [],
    workspaceState: body.workspaceState && typeof body.workspaceState === 'object' ? body.workspaceState as CodingWorkspaceState : null,
    createdBy: actor.username,
  });

  logAudit({
    actor,
    action: 'coding.session.upsert',
    target: `coding_session:${session.id}`,
    detail: { title: session.title, status: session.status },
  });

  return NextResponse.json({ session }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (body.action === 'archive') {
    const archived = archiveCodingSessionRecord(body.id);
    if (!archived) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    logAudit({
      actor,
      action: 'coding.session.archive',
      target: `coding_session:${body.id}`,
      detail: null,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
