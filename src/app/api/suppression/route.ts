import { NextResponse } from 'next/server';
import { getSuppression } from '@/lib/queries';

export async function GET() {
  return NextResponse.json(getSuppression());
}
