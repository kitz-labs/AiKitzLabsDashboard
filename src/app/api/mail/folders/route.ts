import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createMailFolder, listMailFolders } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  return NextResponse.json({ folders: listMailFolders() });
}

export async function POST(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const folder = createMailFolder({
      name: body.name,
      color: typeof body.color === 'string' ? body.color : null,
    });

    logAudit({
      actor,
      action: 'mail.folder.create',
      target: `mail_folder:${folder.id}`,
      detail: { name: folder.name },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to create folder' }, { status: 400 });
  }
}
