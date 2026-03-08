import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { getMailBootstrap, listMailThreads } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireApiUser(request);
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || undefined;
  const query = searchParams.get('q') || undefined;
  const bootstrap = getMailBootstrap(query);

  return NextResponse.json({
    ...bootstrap,
    threads: listMailThreads(folderId || bootstrap.folders[0]?.id, query),
  });
}
