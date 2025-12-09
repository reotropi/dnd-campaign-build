import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapCharacterToDatabase } from '@/lib/character-mapper';

export async function POST(request: NextRequest) {
  try {
    const { characterJson, sessionId, createdBy } = await request.json();

    if (!characterJson || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: characterJson, createdBy' },
        { status: 400 }
      );
    }

    // Transform to database format (sessionId is optional)
    const dbCharacter = mapCharacterToDatabase(
      characterJson,
      createdBy,
      sessionId || null
    );

    // Set max_spell_slots to current spell_slots for restoration purposes
    if (dbCharacter.spell_slots) {
      (dbCharacter as any).max_spell_slots = { ...dbCharacter.spell_slots };
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Insert into database using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('characters')
      .insert(dbCharacter)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      character: data
    }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to import character:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import character' },
      { status: 500 }
    );
  }
}
