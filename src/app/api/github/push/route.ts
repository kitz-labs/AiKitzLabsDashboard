import { NextResponse } from 'next/server';
import { pushGitRemote } from '@/lib/github';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const remote = typeof body.remote === 'string' && body.remote.trim() ? body.remote.trim() : 'kitz';
    const branch = typeof body.branch === 'string' && body.branch.trim() ? body.branch.trim() : 'main';
    const result = await pushGitRemote(remote, branch);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to push changes';
    return NextResponse.json({ error: message }, { status: message === 'forbidden' ? 403 : message === 'unauthorized' ? 401 : 500 });
  }
}