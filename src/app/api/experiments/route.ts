import { NextRequest, NextResponse } from 'next/server';
import { getExperiments, getLearnings } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view');

  if (view === 'learnings') {
    return NextResponse.json(getLearnings());
  }

  const experiments = getExperiments({
    status: searchParams.get('status') || undefined,
  });
  const learnings = getLearnings();

  return NextResponse.json({ experiments, learnings });
}
