import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Generate session code
function generateSessionCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  result += '-';
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { campaign_name, max_players = 6, character_ids, created_by, dm_language = 'indonesian' } = await request.json();

    if (!created_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    if (!campaign_name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabase = supabaseAdmin;

    // Generate unique session code
    let sessionCode = generateSessionCode();
    let isUnique = false;

    while (!isUnique) {
      const { data: existing } = await supabase.from('sessions').select('id').eq('session_code', sessionCode).single();

      if (!existing) {
        isUnique = true;
      } else {
        sessionCode = generateSessionCode();
      }
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        host_id: created_by,
        campaign_name,
        session_code: sessionCode,
        max_players,
        status: 'lobby',
        dm_language,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Add characters to session pool (NEW architecture using junction table)
    if (character_ids && character_ids.length > 0) {
      const sessionCharacters = character_ids.map((char_id: string) => ({
        session_id: session.id,
        character_id: char_id,
        added_by: created_by,
      }));

      const { error: charactersError } = await supabase
        .from('session_characters')
        .insert(sessionCharacters);

      if (charactersError) throw charactersError;
    }

    // Add host as a member
    const { error: memberError } = await supabase.from('session_members').insert({
      session_id: session.id,
      user_id: created_by,
      is_ready: true, // Host is always ready
    });

    if (memberError) throw memberError;

    return NextResponse.json({ session, session_code: sessionCode }, { status: 201 });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 });
  }
}
