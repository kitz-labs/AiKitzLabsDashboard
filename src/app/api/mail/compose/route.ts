import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { composeMail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = requireApiUser(request as Request);
  if (auth) return auth;
  const actor = requireUser(request as Request);
  const body = await request.json();

  try {
    const thread = composeMail({
      toEmail: typeof body.toEmail === 'string' ? body.toEmail : '',
      cc: typeof body.cc === 'string' ? body.cc : '',
      bcc: typeof body.bcc === 'string' ? body.bcc : '',
      subject: typeof body.subject === 'string' ? body.subject : '',
      body: typeof body.body === 'string' ? body.body : '',
      mailbox: typeof body.mailbox === 'string' ? body.mailbox : 'office@aikitz.at',
    });

    logAudit({
      actor,
      action: 'mail.compose.send',
      target: `mail_thread:${thread.id}`,
      detail: { toEmail: thread.toEmail, subject: thread.subject },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to send email' }, { status: 400 });
  }
}
