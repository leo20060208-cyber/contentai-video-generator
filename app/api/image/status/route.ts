
import { NextResponse } from 'next/server';
import { WavespeedClient } from '@/lib/wavespeed';

export const runtime = 'nodejs';

const wavespeedClient = new WavespeedClient();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        console.log(`[Image Status] Checking Wavespeed task: ${taskId}`);

        // Call Wavespeed directly using the requested logic
        const result = await wavespeedClient.getTaskStatus(taskId);

        // Result: { status: 'completed'|'processing'|'failed', url: '...', ... }

        return NextResponse.json({
            status: result.status,
            taskId: taskId,
            url: result.url,
            data: result.data
        });

    } catch (error: any) {
        console.error('[Image Status] Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
