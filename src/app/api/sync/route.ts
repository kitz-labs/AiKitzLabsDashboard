import { NextResponse } from 'next/server';
import { startSync, syncAll } from '@/lib/sync';

// Start background sync on first import
let started = false;

export async function POST() {
  if (!started) {
    startSync();
    started = true;
  }
  syncAll();
  return NextResponse.json({ ok: true, synced_at: new Date().toISOString() });
}

export async function GET() {
  if (!started) {
    startSync();
    started = true;
  }
  return NextResponse.json({ ok: true, running: true });
}
