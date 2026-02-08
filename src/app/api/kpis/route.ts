import { NextRequest, NextResponse } from 'next/server';
import { getDailyMetrics, getWeeklyKPIs } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weeks = Number(searchParams.get('weeks')) || 12;

  const daily = getDailyMetrics(weeks * 7);
  const weekly = getWeeklyKPIs(weeks);

  return NextResponse.json({ daily, weekly });
}
