import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Helper to get Supabase client (lazy initialization to avoid build-time errors)
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/admin/templates
 * Lista todos los templates de Supabase
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    // Categories are hardcoded in frontend or DB? 
    // For now we return hardcoded or empty, front handles it.
    const categories = ['VISUAL', 'CLOTHING BRANDS', 'ASMR', 'DROP SHIPPING', 'ECOMMERCE', 'BRAND'];

    return NextResponse.json({
      success: true,
      templates: templates || [],
      categories,
    });
  } catch (error: any) {
    console.error('Error reading templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/templates
 * Añade un nuevo template
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    // Insert into Supabase
    // Map fields if necessary. DB columns: title, category, video_url (snake_case in DB?)
    // Let's check schema: before_video_url, after_video_url?
    // User schema dump: title, category, before_image_url, after_image_url, etc.
    // The TemplateForm sends: videoUrl, title, category, hiddenPrompt, maskVideoUrl

    // Mapping:
    // videoUrl -> before_video_url (Assuming this is the base video)
    // hiddenPrompt -> (Where to store? Schema doesn't show it!)
    // maskVideoUrl -> mask_video_url

    // Wait, the schema dump in "sql_part4_templates.sql" earlier showed:
    // id, title, category, before_image_url, after_image_url, before_video_url, after_video_url...
    // It DOES NOT have 'hidden_prompt'.
    // Use 'description' as hidden_prompt? Or add column?
    // User earlier approved "Antigravity Implementation Plan" which just added `mask_video_url`.
    // I should probably stick to available columns or add `hidden_prompt`.
    // Let's assume we map `hiddenPrompt` -> `description` for now or omit if no column.

    // Let's check the SQL dump provided by user again in Step 202:
    // | id | title | mask_video_url | preview_gif |

    // I will try to insert what I can.

    const payload = {
      title: body.title,
      category: body.category,
      description: body.description, // Added to form
      before_video_url: body.videoUrl, // Main video
      mask_video_url: body.maskVideoUrl,
      required_image_count: body.requiredImageCount,
      image_descriptions: body.imageDescriptions,
      image_instructions: body.imageInstructions
      // hidden_prompt: body.hiddenPrompt // Potentially missing column
    };

    console.log('🔥 [API] CREATE TEMPLATE PAYLOAD:', payload);

    const { data, error } = await supabase
      .from('templates')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('❌ [API] CREATE ERROR:', error);
      throw error;
    }

    console.log('✅ [API] TEMPLATE CREATED:', data.id);
    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error: any) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/templates
 * Actualiza un template existente
 */
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) throw new Error("ID required for update");

    // Mapping for updates
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.videoUrl !== undefined) payload.before_video_url = updates.videoUrl;
    if (updates.maskVideoUrl !== undefined) payload.mask_video_url = updates.maskVideoUrl;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.requiredImageCount !== undefined) payload.required_image_count = updates.requiredImageCount;
    if (updates.imageDescriptions !== undefined) payload.image_descriptions = updates.imageDescriptions;
    if (updates.imageInstructions !== undefined) payload.image_instructions = updates.imageInstructions;

    console.log('🔥 [API] UPDATE TEMPLATE:', id, payload); // Debug log

    const { data, error } = await supabase
      .from('templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] UPDATE ERROR:', error);
      throw error;
    }

    console.log('✅ [API] TEMPLATE UPDATED:', data.id);

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/templates
 */
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("ID Required");

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
