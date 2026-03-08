import { NextRequest, NextResponse } from 'next/server';
import { requireApiEditor, requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  buildContentPreview,
  deleteCodingKnowledgeFile,
  inferCodingCategory,
  listCodingKnowledgeFiles,
  upsertCodingKnowledgeFile,
  writeCodingUploadFile,
} from '@/lib/coding';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  return NextResponse.json({ files: listCodingKnowledgeFiles() });
}

export async function POST(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);

  const form = await request.formData();
  const uploaded = form.get('file');

  if (!(uploaded instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const arrayBuffer = await uploaded.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const textLike = /^(text|application\/(json|javascript))/.test(uploaded.type)
    || /\.(md|txt|json|csv|ts|tsx|js|jsx|yml|yaml)$/i.test(uploaded.name);
  const preview = textLike ? buildContentPreview(buffer.toString('utf8')) : '';
  const relativePath = writeCodingUploadFile(uploaded.name, buffer);

  const record = upsertCodingKnowledgeFile({
    name: uploaded.name,
    type: uploaded.type || 'application/octet-stream',
    size: uploaded.size,
    category: inferCodingCategory(uploaded.name),
    contentPreview: preview,
    storagePath: relativePath,
    createdBy: actor.username,
  });

  logAudit({
    actor,
    action: 'coding.file.upload',
    target: `coding_file:${record.id}`,
    detail: { name: record.name, size: record.size, category: record.category },
  });

  return NextResponse.json({ file: record }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = requireApiEditor(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const deleted = deleteCodingKnowledgeFile(id);
  if (!deleted) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  logAudit({
    actor,
    action: 'coding.file.delete',
    target: `coding_file:${id}`,
    detail: null,
  });

  return NextResponse.json({ ok: true });
}
