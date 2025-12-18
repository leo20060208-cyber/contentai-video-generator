import { NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/api/vertex-client';

export const runtime = 'nodejs';

/**
 * GET /api/jobs/[jobId]
 * Obtener estado de un job de generación (para polling)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // En Next.js 15, params es una Promise y debe ser awaited
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Consultar estado del job
    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log(`[Jobs] Status check for ${jobId}: ${status.status} (${status.progress}%)`);

    return NextResponse.json({
      success: true,
      ...status,
    });

  } catch (error) {
    console.error('[Jobs] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get job status' 
      },
      { status: 500 }
    );
  }
}
