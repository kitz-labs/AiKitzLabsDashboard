import { NextResponse } from 'next/server';
import { getGitStatus } from '@/lib/github';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    requireUser(request);
    const status = await getGitStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load GitHub status';
    return NextResponse.json({ error: message }, { status: message === 'unauthorized' ? 401 : 500 });
  }
}