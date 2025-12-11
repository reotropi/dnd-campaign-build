import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { session_id, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Verify character exists and is in the session's character pool
    const { error: sessionCharError } = await supabase
      .from('session_characters')
      .select('character_id')
      .eq('session_id', session_id)
      .eq('character_id', params.id)
      .single();

    if (sessionCharError) {
      return NextResponse.json({ error: 'Character not available in this session' }, { status: 400 });
    }

    // Check if character is already selected by another player in this session
    const { data: existingMember, error: checkError } = await supabase
      .from('session_members')
      .select('user_id')
      .eq('session_id', session_id)
      .eq('character_id', params.id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingMember && existingMember.user_id !== user_id) {
      return NextResponse.json({ error: 'Character already selected by another player' }, { status: 400 });
    }

    // Update session member with character selection
    const { error: memberError } = await supabase
      .from('session_members')
      .update({ character_id: params.id })
      .eq('session_id', session_id)
      .eq('user_id', user_id);

    if (memberError) throw memberError;

    // Fetch the character details to return
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', params.id)
      .single();

    if (charError) throw charError;

    return NextResponse.json({ character });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to assign character' }, { status: 500 });
  }
}
