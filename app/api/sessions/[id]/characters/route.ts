import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all characters in a session's pool
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    // Fetch characters for this session via the junction table
    const { data, error } = await supabase
      .from('session_characters')
      .select(`
        id,
        added_at,
        character:characters (*)
      `)
      .eq('session_id', params.id);

    if (error) throw error;

    // Extract just the character data with session_character info
    const characters = data?.map(sc => ({
      ...sc.character,
      session_character_id: sc.id,
      added_to_session_at: sc.added_at
    })) || [];

    return NextResponse.json({ characters });
  } catch (error: any) {
    console.error('Error fetching session characters:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch characters' }, { status: 500 });
  }
}

// POST - Add a character to a session's pool
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { character_id, added_by } = await request.json();

    if (!character_id || !added_by) {
      return NextResponse.json({ error: 'character_id and added_by are required' }, { status: 400 });
    }

    // Verify user is the session host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('host_id')
      .eq('id', params.id)
      .single();

    if (sessionError) throw sessionError;

    if (session.host_id !== added_by) {
      return NextResponse.json({ error: 'Only the host can add characters to the session' }, { status: 403 });
    }

    // Add character to session pool
    const { data, error } = await supabase
      .from('session_characters')
      .insert({
        session_id: params.id,
        character_id: character_id,
        added_by: added_by
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (character already in session)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Character already added to this session' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, session_character: data });
  } catch (error: any) {
    console.error('Error adding character to session:', error);
    return NextResponse.json({ error: error.message || 'Failed to add character' }, { status: 500 });
  }
}

// DELETE - Remove a character from a session's pool
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { searchParams } = new URL(request.url);
    const character_id = searchParams.get('character_id');
    const removed_by = searchParams.get('removed_by');

    if (!character_id || !removed_by) {
      return NextResponse.json({ error: 'character_id and removed_by are required' }, { status: 400 });
    }

    // Verify user is the session host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('host_id')
      .eq('id', params.id)
      .single();

    if (sessionError) throw sessionError;

    if (session.host_id !== removed_by) {
      return NextResponse.json({ error: 'Only the host can remove characters from the session' }, { status: 403 });
    }

    // Remove character from session pool
    const { error } = await supabase
      .from('session_characters')
      .delete()
      .eq('session_id', params.id)
      .eq('character_id', character_id);

    if (error) throw error;

    // Also unassign from any session members who had selected this character
    await supabase
      .from('session_members')
      .update({ character_id: null, is_ready: false })
      .eq('session_id', params.id)
      .eq('character_id', character_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing character from session:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove character' }, { status: 500 });
  }
}
