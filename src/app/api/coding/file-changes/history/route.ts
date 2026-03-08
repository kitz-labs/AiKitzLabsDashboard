import { NextRequest, NextResponse } from 'next/server';
import { requireApiCapability, requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { listCodingFileChangeHistory, rollbackCodingFileChange } from '@/lib/coding';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  return NextResponse.json({ history: listCodingFileChangeHistory() });
}

export async function POST(request: NextRequest) {
  const auth = requireApiCapability(request as Request, 'execute_workspace_changes');
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.historyId || typeof body.historyId !== 'string') {
    return NextResponse.json({ error: 'historyId is required' }, { status: 400 });
  }

  try {
    const result = rollbackCodingFileChange(body.historyId, actor.username);
    logAudit({
      actor,
      action: 'coding.file_change.rollback',
      target: result.history.filePath,
      detail: { historyId: body.historyId, approvalId: result.history.approvalId },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to roll back change' }, { status: 400 });
  }
}
