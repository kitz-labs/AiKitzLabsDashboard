import { NextRequest, NextResponse } from 'next/server';
import { getLeads, getSequences, getLeadFunnel, getSuppression } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const view = searchParams.get('view');

  if (view === 'funnel') {
    return NextResponse.json(getLeadFunnel());
  }
  if (view === 'suppression') {
    return NextResponse.json(getSuppression());
  }
  if (view === 'sequences') {
    return NextResponse.json(getSequences({
      status: searchParams.get('status') || undefined,
      lead_id: searchParams.get('lead_id') || undefined,
    }));
  }

  // Default: leads + sequences overview
  const leads = getLeads({
    status: searchParams.get('status') || undefined,
    tier: searchParams.get('tier') || undefined,
  });
  const funnel = getLeadFunnel();
  const pendingApprovals = getSequences({ status: 'pending_approval' });

  return NextResponse.json({ leads, funnel, pendingApprovals });
}
