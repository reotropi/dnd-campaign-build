import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDMResponse } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    const { session_id, user_id, user_message, roll_data, sender_name, character_name } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError) throw sessionError;

    // Fetch characters in session via junction table
    const { data: sessionChars, error: sessionCharsError } = await supabase
      .from('session_characters')
      .select(`
        character:characters (*)
      `)
      .eq('session_id', session_id);

    if (sessionCharsError) throw sessionCharsError;

    // Extract character data from junction table response
    const characters = sessionChars?.map(sc => sc.character).filter(Boolean) || [];

    // Fetch recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) throw messagesError;

    // Fetch game state
    const { data: gameState, error: gameStateError } = await supabase
      .from('game_state')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (gameStateError) throw gameStateError;

    // Get DM response
    const dmResponse = await getDMResponse({
      campaign_name: session.campaign_name,
      characters: characters || [],
      recent_messages: messages?.reverse() || [],
      game_state: gameState,
      current_player_action: user_message,
      roll_result: roll_data,
      sender_name: sender_name,
      character_name: character_name,
    });

    return NextResponse.json({
      content: dmResponse.response,
      rollPrompts: dmResponse.rollPrompts,
    });
  } catch (error: any) {
    console.error('Error getting DM response:', error);
    return NextResponse.json({ error: error.message || 'Failed to get DM response' }, { status: 500 });
  }
}
