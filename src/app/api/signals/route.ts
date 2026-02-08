import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const signals = getSignals({
    type: searchParams.get('type') || undefined,
    relevance: searchParams.get('relevance') || undefined,
    date: searchParams.get('date') || undefined,
  });
  return NextResponse.json(signals);
}
