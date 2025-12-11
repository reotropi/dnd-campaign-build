import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDMResponseV2 } from '@/lib/claude-v2';

/**
 * V2 API - Compatible with existing frontend
 * This endpoint has the SAME interface as /api/claude
 * But uses the new JSON-based system under the hood
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id, user_id, user_message, roll_data, character_name } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Fetch session for language setting
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('dm_language')
      .eq('id', session_id)
      .single();

    if (sessionError) throw sessionError;

    // Fetch game state with combat state
    const { data: gameState, error: gameStateError } = await supabase
      .from('game_state')
      .select('combat_state')
      .eq('session_id', session_id)
      .single();

    if (gameStateError) throw gameStateError;

    // Fetch active session members and their characters
    const { data: sessionMembers, error: membersError } = await supabase
      .from('session_members')
      .select(`
        character_id,
        characters (
          id,
          name,
          max_hp,
          current_hp,
          armor_class
        )
      `)
      .eq('session_id', session_id)
      .not('character_id', 'is', null);

    if (membersError) throw membersError;

    // Extract active character names
    const activeCharacters = (sessionMembers || [])
      .filter((m: any) => m.characters)
      .map((m: any) => m.characters.name);

    // Fetch recent DM messages for context (last 5)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content')
      .eq('session_id', session_id)
      .eq('message_type', 'dm')
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) throw messagesError;

    const recentNarrative = (messages || []).reverse().map((m) => m.content);

    // Convert roll_data to V2 format
    let rollResultV2 = undefined;
    if (roll_data) {
      rollResultV2 = {
        type: roll_data.roll_type as 'initiative' | 'attack' | 'damage',
        total: roll_data.total,
      };
    }

    // Get DM response from Claude V2
    const dmResponse = await getDMResponseV2({
      session_id,
      player_action: user_message,
      character_name,
      roll_result: rollResultV2,
      combat_state: gameState?.combat_state || null,
      recent_narrative: recentNarrative,
      language: (session as any)?.dm_language || 'indonesian',
      active_characters: activeCharacters,
    });

    // Handle combat updates
    if (dmResponse.combat_update) {
      const update = dmResponse.combat_update;

      // Start combat
      if (update.start_combat) {
        const combatants: any[] = [];

        // Add player combatants first
        for (const member of sessionMembers || []) {
          if (member.characters) {
            const char = member.characters as any;
            combatants.push({
              id: char.id,
              name: char.name,
              hp: char.current_hp || char.max_hp,
              max_hp: char.max_hp,
              ac: char.armor_class,
              initiative: 0,
              type: 'player',
            });
          }
        }

        // Add enemy combatants
        let enemyId = 1;
        update.start_combat.enemies.forEach((enemyType) => {
          for (let i = 1; i <= enemyType.count; i++) {
            combatants.push({
              id: `enemy_${enemyId}`,
              name: `${enemyType.name} #${i}`,
              hp: enemyType.hp,
              max_hp: enemyType.hp,
              ac: enemyType.ac,
              initiative: 0,
              type: 'enemy',
              attack_bonus: enemyType.attack_bonus,
              damage_dice: enemyType.damage_dice,
            });
            enemyId++;
          }
        });

        const newCombatState = {
          active: true,
          round: 0,
          turn_index: 0,
          combatants,
        };

        await supabase
          .from('game_state')
          .update({ combat_state: newCombatState })
          .eq('session_id', session_id);
      }

      // Apply damage
      if (update.damage && gameState?.combat_state) {
        const combatState = gameState.combat_state;
        update.damage.forEach(({ target_id, amount }) => {
          const combatant = combatState.combatants.find((c: any) => c.id === target_id);
          if (combatant) {
            combatant.hp = Math.max(0, combatant.hp - amount);
          }
        });

        await supabase
          .from('game_state')
          .update({ combat_state: combatState })
          .eq('session_id', session_id);
      }

      // Mark deaths
      if (update.deaths && gameState?.combat_state) {
        const combatState = gameState.combat_state;
        update.deaths.forEach((id) => {
          const combatant = combatState.combatants.find((c: any) => c.id === id);
          if (combatant) {
            combatant.hp = 0;
          }
        });

        // Check if combat should end
        const allEnemiesDead = combatState.combatants
          .filter((c: any) => c.type === 'enemy')
          .every((c: any) => c.hp === 0);

        const allPlayersDead = combatState.combatants
          .filter((c: any) => c.type === 'player')
          .every((c: any) => c.hp === 0);

        if (allEnemiesDead || allPlayersDead) {
          combatState.active = false;
        }

        await supabase
          .from('game_state')
          .update({ combat_state: combatState })
          .eq('session_id', session_id);
      }

      // Advance turn
      if (update.advance_turn && gameState?.combat_state) {
        const combatState = gameState.combat_state;
        combatState.turn_index++;

        // Skip dead/unconscious combatants
        while (combatState.turn_index < combatState.combatants.length) {
          const current = combatState.combatants[combatState.turn_index];
          if (current.hp > 0) break;
          combatState.turn_index++;
        }

        // New round?
        if (combatState.turn_index >= combatState.combatants.length) {
          combatState.turn_index = 0;
          combatState.round++;

          // Skip dead/unconscious combatants at start of new round
          while (combatState.turn_index < combatState.combatants.length) {
            const current = combatState.combatants[combatState.turn_index];
            if (current.hp > 0) break;
            combatState.turn_index++;
          }
        }

        await supabase
          .from('game_state')
          .update({ combat_state: combatState })
          .eq('session_id', session_id);
      }
    }

    // DON'T save message here - frontend handles it via sendDMMessage()
    // This prevents duplicate messages

    // Convert V2 response to V1 format (compatible with existing frontend)
    const rollPrompts = dmResponse.request_roll
      ? [
          {
            character_name: dmResponse.request_roll.character,
            roll_type: dmResponse.request_roll.type,
            description: dmResponse.request_roll.reason,
          },
        ]
      : undefined;

    // Return in the same format as /api/claude
    return NextResponse.json({
      content: dmResponse.narrative,
      rollPrompts: rollPrompts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
