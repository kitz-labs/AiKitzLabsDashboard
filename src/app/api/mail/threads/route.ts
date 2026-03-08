import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { listMailThreads, updateMailThread } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  const { searchParams } = new URL(request.url);
  return NextResponse.json({
    threads: listMailThreads(searchParams.get('folderId') || undefined, searchParams.get('q') || undefined),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (!body.action || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  try {
    const thread = updateMailThread({
      id: body.id,
      action: body.action,
      targetFolderId: typeof body.targetFolderId === 'string' ? body.targetFolderId : undefined,
    });

    logAudit({
      actor,
      action: `mail.thread.${body.action}`,
      target: `mail_thread:${thread.id}`,
      detail: { subject: thread.subject, folderId: thread.folderId },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to update thread' }, { status: 400 });
  }
}
