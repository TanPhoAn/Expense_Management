import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getVietnamTodayString, VIETNAM_TIMEZONE } from '@/lib/utils/date';

/**
 * GET /api/health
 *
 * Operational diagnostic endpoint to verify:
 * 1. Application runtime is healthy.
 * 2. Database connectivity to Neon PostgreSQL is active.
 * 3. Server timezone is correctly operating in Asia/Ho_Chi_Minh.
 *
 * No sensitive connection strings or stack traces are ever exposed.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Ping Neon PostgreSQL via light-weight query
    await db.execute(sql`SELECT 1`);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      vietnamDate: getVietnamTodayString(),
      timezone: VIETNAM_TIMEZONE,
      database: {
        status: 'connected',
        latencyMs: dbLatencyMs,
      },
    }, { status: 200 });
  } catch {
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        error: 'Database connection failed',
      },
    }, { status: 503 });
  }
}
