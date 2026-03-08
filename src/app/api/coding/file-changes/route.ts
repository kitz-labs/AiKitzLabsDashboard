import { NextRequest, NextResponse } from 'next/server';
import { requireApiCapability, requireApiEditor } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { applyApprovedCodingFileChange, buildContentPreview, createCodingApproval, createUnifiedDiff, readWorkspaceTextFile } from '@/lib/coding';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  const filePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
  const proposedContent = typeof body.proposedContent === 'string' ? body.proposedContent : '';
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : `File change: ${filePath}`;
  const summary = typeof body.summary === 'string' ? body.summary : '';
  const createApproval = body.createApproval === true;

  if (!filePath) {
    return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  }
  if (!proposedContent.trim()) {
    return NextResponse.json({ error: 'proposedContent is required' }, { status: 400 });
  }

  try {
    const current = readWorkspaceTextFile(filePath);
    const diffPreview = createUnifiedDiff(filePath, current.content, proposedContent);

    let approval = null;
    if (createApproval) {
      approval = createCodingApproval({
        title,
        summary,
        payload: {
          type: 'file-change',
          filePath,
          exists: current.exists,
          diffPreview,
          proposedContent,
          currentContent: current.content,
          currentContentPreview: buildContentPreview(current.content),
          proposedContentPreview: buildContentPreview(proposedContent),
        },
        requestedBy: actor.username,
      });

      logAudit({
        actor,
        action: 'coding.file_change.request',
        target: `coding_approval:${approval.id}`,
        detail: { filePath, title },
      });
    } else {
      logAudit({
        actor,
        action: 'coding.file_change.preview',
        target: filePath,
        detail: { exists: current.exists },
      });
    }

    return NextResponse.json({
      preview: {
        filePath,
        exists: current.exists,
        currentContent: current.content,
        proposedContent,
        diffPreview,
      },
      approval,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to generate diff preview' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireApiCapability(request as Request, 'execute_workspace_changes');
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.approvalId || typeof body.approvalId !== 'string') {
    return NextResponse.json({ error: 'approvalId is required' }, { status: 400 });
  }

  try {
    const result = applyApprovedCodingFileChange(body.approvalId, actor.username);
    logAudit({
      actor,
      action: 'coding.file_change.apply',
      target: result.filePath,
      detail: { approvalId: body.approvalId, bytesWritten: result.bytesWritten },
    });

    return NextResponse.json({
      ok: true,
      filePath: result.filePath,
      bytesWritten: result.bytesWritten,
      approval: result.approval,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to apply file change' }, { status: 400 });
  }
}
