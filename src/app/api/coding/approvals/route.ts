import { NextRequest, NextResponse } from 'next/server';
import { requireApiEditor, requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createCodingApproval, listCodingApprovals, updateCodingApprovalStatus } from '@/lib/coding';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  return NextResponse.json({ approvals: listCodingApprovals() });
}

export async function POST(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const approval = createCodingApproval({
    title: body.title,
    summary: typeof body.summary === 'string' ? body.summary : '',
    payload: body.payload && typeof body.payload === 'object' ? body.payload : null,
    requestedBy: actor.username,
  });

  logAudit({
    actor,
    action: 'coding.approval.create',
    target: `coding_approval:${approval.id}`,
    detail: { title: approval.title },
  });

  return NextResponse.json({ approval }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  const updated = updateCodingApprovalStatus(body.id, body.status, actor.username);
  if (!updated) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  }

  logAudit({
    actor,
    action: `coding.approval.${body.status}`,
    target: `coding_approval:${body.id}`,
    detail: null,
  });

  return NextResponse.json({ ok: true });
}
