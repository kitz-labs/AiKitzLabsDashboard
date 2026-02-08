import { NextResponse } from 'next/server';
import { getOverviewStats, getAlerts, getActivityLog, getDailyMetrics } from '@/lib/queries';

export async function GET() {
  const stats = getOverviewStats();
  const alerts = getAlerts();
  const recentActivity = getActivityLog({ limit: 20 });
  const metrics = getDailyMetrics(84); // 12 weeks

  return NextResponse.json({ stats, alerts, recentActivity, metrics });
}
