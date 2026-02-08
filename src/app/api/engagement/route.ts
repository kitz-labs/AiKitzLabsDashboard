import { NextRequest, NextResponse } from 'next/server';
import { getEngagements } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const engagements = getEngagements({
    platform: searchParams.get('platform') || undefined,
    action_type: searchParams.get('action_type') || undefined,
    date: searchParams.get('date') || undefined,
  });
  return NextResponse.json(engagements);
}
