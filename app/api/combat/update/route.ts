import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CombatState, CombatUpdate } from '@/types/combat';

/**
 * Update combat state for a session
 * This endpoint is called by Claude AI via the update_combat tool
 * or by the game system to advance turns
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id, changes, advance_turn } = await request.json() as {
      session_id: string;
      changes?: CombatUpdate;
      advance_turn?: boolean;
    };

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Get current combat state
    const { data: gameState, error: fetchError } = await supabase
      .from('game_state')
      .select('combat_state')
      .eq('session_id', session_id)
      .single();

    if (fetchError) throw fetchError;

    let combatState = gameState.combat_state as CombatState;

    if (!combatState || !combatState.active) {
      return NextResponse.json(
        { error: 'No active combat in this session' },
        { status: 400 }
      );
    }

    // Apply changes if provided
    if (changes) {
      // Apply damage
      if (changes.damage_dealt) {
        changes.damage_dealt.forEach(({ target_id, amount }) => {
          // Check if target is a player
          const player = combatState.combatants.players.find(p => p.character_id === target_id);
          if (player) {
            player.current_hp = Math.max(0, player.current_hp - amount);
          }

          // Check if target is an enemy
          const enemy = combatState.combatants.enemies.find(e => e.id === target_id);
          if (enemy) {
            enemy.current_hp = Math.max(0, enemy.current_hp - amount);
            if (enemy.current_hp === 0) {
              enemy.is_alive = false;
            }
          }
        });
      }

      // Apply healing
      if (changes.healing) {
        changes.healing.forEach(({ target_id, amount }) => {
          const player = combatState.combatants.players.find(p => p.character_id === target_id);
          if (player) {
            player.current_hp = Math.min(player.max_hp, player.current_hp + amount);
          }

          const enemy = combatState.combatants.enemies.find(e => e.id === target_id);
          if (enemy) {
            enemy.current_hp = Math.min(enemy.max_hp, enemy.current_hp + amount);
          }
        });
      }

      // Add conditions
      if (changes.conditions_added) {
        changes.conditions_added.forEach(({ target_id, conditions }) => {
          const player = combatState.combatants.players.find(p => p.character_id === target_id);
          if (player) {
            player.conditions = [...new Set([...player.conditions, ...conditions])];
          }

          const enemy = combatState.combatants.enemies.find(e => e.id === target_id);
          if (enemy) {
            enemy.conditions = [...new Set([...enemy.conditions, ...conditions])];
          }
        });
      }

      // Remove conditions
      if (changes.conditions_removed) {
        changes.conditions_removed.forEach(({ target_id, conditions }) => {
          const player = combatState.combatants.players.find(p => p.character_id === target_id);
          if (player) {
            player.conditions = player.conditions.filter(c => !conditions.includes(c));
          }

          const enemy = combatState.combatants.enemies.find(e => e.id === target_id);
          if (enemy) {
            enemy.conditions = enemy.conditions.filter(c => !conditions.includes(c));
          }
        });
      }

      // Mark enemies as killed
      if (changes.enemies_killed) {
        changes.enemies_killed.forEach(enemyId => {
          const enemy = combatState.combatants.enemies.find(e => e.id === enemyId);
          if (enemy) {
            enemy.is_alive = false;
            enemy.current_hp = 0;
          }
        });
      }
    }

    // Advance turn if requested
    if (advance_turn || changes?.turn_complete) {
      combatState.turn_index++;

      // Check if we've completed a full round
      if (combatState.turn_index >= combatState.initiative_order.length) {
        combatState.turn_index = 0;
        combatState.round++;
      }

      // Skip dead enemies
      while (combatState.turn_index < combatState.initiative_order.length) {
        const current = combatState.initiative_order[combatState.turn_index];
        if (current.type === 'enemy') {
          const enemy = combatState.combatants.enemies.find(e => e.id === current.id);
          if (enemy && !enemy.is_alive) {
            combatState.turn_index++;
            if (combatState.turn_index >= combatState.initiative_order.length) {
              combatState.turn_index = 0;
              combatState.round++;
            }
            continue;
          }
        }
        break;
      }
    }

    // Update player HP in session_characters table
    for (const player of combatState.combatants.players) {
      await supabase
        .from('session_characters')
        .update({ current_hp: player.current_hp })
        .eq('session_id', session_id)
        .eq('character_id', player.character_id);
    }

    // Check if combat should end (all enemies dead or all players dead)
    const allEnemiesDead = combatState.combatants.enemies.every(e => !e.is_alive);
    const allPlayersDead = combatState.combatants.players.every(p => p.current_hp === 0);

    if (allEnemiesDead || allPlayersDead) {
      combatState.active = false;
    }

    // Save updated combat state
    const { error: updateError } = await supabase
      .from('game_state')
      .update({ combat_state: combatState })
      .eq('session_id', session_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      combat_state: combatState,
      combat_ended: !combatState.active,
    });
  } catch (error: any) {
    console.error('Error updating combat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update combat' },
      { status: 500 }
    );
  }
}
