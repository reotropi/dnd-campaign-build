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

    // Fetch characters in session via junction table with session-specific state
    const { data: sessionChars, error: sessionCharsError } = await supabase
      .from('session_characters')
      .select(`
        id,
        current_hp,
        current_spell_slots,
        character:characters (*)
      `)
      .eq('session_id', session_id);

    if (sessionCharsError) throw sessionCharsError;

    // Merge session-specific state with character data
    const characters = (sessionChars?.map((sc: any) => {
      if (!sc.character) return null;
      return {
        ...sc.character,
        // Override with session-specific state
        current_hp: sc.current_hp !== null ? sc.current_hp : sc.character.current_hp,
        spell_slots: Object.keys(sc.current_spell_slots || {}).length > 0 ? sc.current_spell_slots : sc.character.spell_slots,
        session_character_id: sc.id, // Store junction table ID for updates
      };
    }).filter(Boolean) || []) as Character[];

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
      dm_language: session.dm_language || 'indonesian',
      session_id: session_id, // Added for combat state management
    });

    // Apply character updates (HP changes, spell slot consumption)
    // Updates are applied to session_characters table to maintain session-specific state
    if (dmResponse.characterUpdates && dmResponse.characterUpdates.length > 0) {
      for (const update of dmResponse.characterUpdates) {
        const character = characters.find(c => c.name === update.character_name);
        if (!character || !(character as any).session_character_id) continue;

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
            updates.current_spell_slots = {
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
            updates.current_spell_slots = { ...maxSlots };
          }
        }

        // Update session-specific character state if there are changes
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('session_characters')
            .update(updates)
            .eq('id', (character as any).session_character_id);
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
