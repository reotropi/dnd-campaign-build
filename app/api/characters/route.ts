import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    const { created_by, ...characterData } = await request.json();

    if (!created_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Note: session_id should be provided when creating character for a session
    // For now, we'll create orphan characters that can be added to sessions later
    const { data, error } = await supabase
      .from('characters')
      .insert({
        ...characterData,
        created_by: created_by,
        current_hp: characterData.max_hp, // Start at full HP
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ character: data }, { status: 201 });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to create character' }, { status: 500 });
  }
}
