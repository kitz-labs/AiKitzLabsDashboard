import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { listCodingApprovals, listCodingKnowledgeFiles, listCodingSessions } from '@/lib/coding';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireApiUser(request);
  if (auth) return auth;

  return NextResponse.json({
    files: listCodingKnowledgeFiles(),
    sessions: listCodingSessions(),
    approvals: listCodingApprovals(),
  });
}
