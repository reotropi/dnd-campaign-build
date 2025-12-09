import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDMResponse } from '@/lib/claude';
import { Character } from '@/types';

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
    const characters = (sessionChars?.map((sc: any) => sc.character).filter(Boolean) || []) as Character[];

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

    // Apply character updates (HP changes, spell slot consumption)
    if (dmResponse.characterUpdates && dmResponse.characterUpdates.length > 0) {
      for (const update of dmResponse.characterUpdates) {
        const character = characters.find(c => c.name === update.character_name);
        if (!character) continue;

        const updates: any = {};

        // Apply HP change
        if (update.hp_change !== undefined) {
          const newHP = Math.max(0, Math.min(
            character.current_hp + update.hp_change,
            character.max_hp
          ));
          updates.current_hp = newHP;
        }

        // Apply spell slot consumption
        if (update.spell_slot_used) {
          const level = update.spell_slot_used.level;
          const slotKey = `level_${level}` as keyof typeof character.spell_slots;
          const currentSlots = character.spell_slots[slotKey] || 0;

          if (currentSlots > 0) {
            updates.spell_slots = {
              ...character.spell_slots,
              [slotKey]: currentSlots - 1,
            };
          }
        }

        // Apply long rest (restore all HP and spell slots)
        if (update.long_rest) {
          updates.current_hp = character.max_hp;

          // Restore spell slots from max_spell_slots if available
          const maxSlots = character.max_spell_slots || character.spell_slots;
          if (maxSlots) {
            updates.spell_slots = { ...maxSlots };
          }
        }

        // Apply short rest (partial HP recovery)
        if (update.short_rest) {
          const recoveredHP = Math.min(
            character.current_hp + update.short_rest.hp_recovered,
            character.max_hp
          );
          updates.current_hp = recoveredHP;
        }

        // Update character if there are changes
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('characters')
            .update(updates)
            .eq('id', character.id);
        }
      }
    }

    // Return the DM response with structured data
    return NextResponse.json({
      content: dmResponse.response,
      rollPrompts: dmResponse.rollPrompts,
    });
  } catch (error: any) {
    console.error('Error getting DM response:', error);
    return NextResponse.json({ error: error.message || 'Failed to get DM response' }, { status: 500 });
  }
}
