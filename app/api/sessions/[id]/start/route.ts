import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { started_by } = await request.json();

    if (!started_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Verify user is host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (sessionError) throw sessionError;

    if (session.host_id !== started_by) {
      return NextResponse.json({ error: 'Only the host can start the session' }, { status: 403 });
    }

    // Update session status
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Initialize session-specific character state (HP and spell slots)
    // This allows the same character to be in multiple sessions with different stats
    const { data: sessionChars, error: sessionCharsError } = await supabase
      .from('session_characters')
      .select(`
        id,
        character_id,
        character:characters (
          max_hp,
          spell_slots,
          max_spell_slots
        )
      `)
      .eq('session_id', params.id);

    if (sessionCharsError) {

    } else if (sessionChars) {
      // Initialize session-specific state for each character
      for (const sc of sessionChars) {
        const character = (sc as any).character;
        if (character) {
          const updates: any = {
            current_hp: character.max_hp, // Start with full HP
            current_spell_slots: character.max_spell_slots || character.spell_slots || {}, // Full spell slots
          };

          await supabase
            .from('session_characters')
            .update(updates)
            .eq('id', sc.id);
        }
      }
    }

    // No initial message - let the game page trigger Claude's immersive opening

    return NextResponse.json({ session: data });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to start session' }, { status: 500 });
  }
}
