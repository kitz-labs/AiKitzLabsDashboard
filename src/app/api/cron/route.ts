import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const CRON_DIR = '/home/leads/.openclaw/cron';
const LOGS_DIR = '/home/leads/.openclaw/cron/logs';

interface CronJob {
  id: string;
  agent: string;
  schedule: string;
  message: string;
  enabled: boolean;
  timezone?: string;
  lastRun?: string | null;
  lastResult?: string | null;
  lastDuration?: number | null;
  nextRun?: string | null;
}

export async function GET() {
  try {
    // Read cron jobs config
    const jobsPath = path.join(CRON_DIR, 'jobs.json');
    let jobs: CronJob[] = [];
    try {
      const raw = await fs.readFile(jobsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      jobs = Array.isArray(parsed) ? parsed : parsed.jobs || [];
    } catch {
      // No cron config yet
    }

    // Read recent logs for each job
    const enriched = await Promise.all(jobs.map(async (job) => {
      try {
        const logFile = path.join(LOGS_DIR, `${job.id}.log`);
        const stat = await fs.stat(logFile).catch(() => null);
        if (!stat) return { ...job, lastRun: null, lastResult: null };

        // Read last 2KB of log
        const fd = await fs.open(logFile, 'r');
        const size = stat.size;
        const readSize = Math.min(size, 2048);
        const buffer = Buffer.alloc(readSize);
        await fd.read(buffer, 0, readSize, Math.max(0, size - readSize));
        await fd.close();

        const lastLines = buffer.toString('utf-8').trim().split('\n').slice(-5);
        return {
          ...job,
          lastRun: stat.mtime.toISOString(),
          lastResult: lastLines.join('\n'),
        };
      } catch {
        return { ...job, lastRun: null, lastResult: null };
      }
    }));

    // Calculate next run (simple: just show schedule info)
    return NextResponse.json({ jobs: enriched });
  } catch (error) {
    console.error('GET /api/cron error:', error);
    return NextResponse.json({ error: 'Failed to read cron status' }, { status: 500 });
  }
}
