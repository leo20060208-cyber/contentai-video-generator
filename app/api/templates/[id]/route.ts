import { NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/data/template-library';

export const runtime = 'nodejs';

/**
 * GET /api/templates/[id]
 * Obtener un template específico por ID (sin hidden prompt)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // En Next.js 15, params es una Promise y debe ser awaited
    const { id: templateId } = await params;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });

  } catch (error) {
    console.error('[Template] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch template' 
      },
      { status: 500 }
    );
  }
}
