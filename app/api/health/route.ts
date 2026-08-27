import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'sanpack-storefront',
    version: process.env.GIT_COMMIT_SHA || process.env.K_REVISION || 'local',
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
