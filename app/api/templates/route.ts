import { NextResponse } from 'next/server';
import { getAllTemplates, getTemplatesByCategory, getFeaturedTemplates } from '@/lib/data/template-library';

export const runtime = 'nodejs';

/**
 * GET /api/templates
 * Obtener lista de templates (sin hidden prompts)
 * 
 * Query params:
 * - category: filtrar por categoría
 * - featured: solo destacados (true)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    let templates;

    if (featured === 'true') {
      templates = getFeaturedTemplates();
    } else if (category) {
      templates = getTemplatesByCategory(category);
    } else {
      templates = getAllTemplates();
    }

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });

  } catch (error) {
    console.error('[Templates] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch templates' 
      },
      { status: 500 }
    );
  }
}

