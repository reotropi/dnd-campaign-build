import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CombatState, CombatParticipant } from '@/types/combat';

/**
 * Add initiative rolls to combat state
 * Called when a player rolls initiative or DM sets enemy initiative
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id, initiatives } = await request.json() as {
      session_id: string;
      initiatives: Array<{
        id: string; // character_id for players, enemy id for enemies
        initiative: number;
        type: 'player' | 'enemy';
      }>;
    };

    if (!session_id || !initiatives) {
      return NextResponse.json(
        { error: 'session_id and initiatives are required' },
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

    // Update initiatives
    initiatives.forEach(({ id, initiative, type }) => {
      if (type === 'player') {
        const player = combatState.combatants.players.find(p => p.character_id === id);
        if (player) {
          player.initiative = initiative;
        }
      } else if (type === 'enemy') {
        const enemy = combatState.combatants.enemies.find(e => e.id === id);
        if (enemy) {
          enemy.initiative = initiative;
        }
      }
    });

    // Check if all combatants have initiative
    const allPlayersHaveInitiative = combatState.combatants.players.every(p => p.initiative > 0);
    const allEnemiesHaveInitiative = combatState.combatants.enemies.every(e => e.initiative > 0);

    let initiativeComplete = false;

    // If all have rolled, create initiative order
    if (allPlayersHaveInitiative && allEnemiesHaveInitiative) {
      const allCombatants: CombatParticipant[] = [
        ...combatState.combatants.players.map(p => ({
          id: p.character_id,
          name: p.name,
          initiative: p.initiative,
          type: 'player' as const,
        })),
        ...combatState.combatants.enemies.map(e => ({
          id: e.id,
          name: e.name,
          initiative: e.initiative,
          type: 'enemy' as const,
        })),
      ];

      // Sort by initiative (high to low)
      allCombatants.sort((a, b) => b.initiative - a.initiative);

      combatState.initiative_order = allCombatants;
      combatState.turn_index = 0;
      combatState.round = 1; // Combat officially starts

      initiativeComplete = true;
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
      initiative_complete: initiativeComplete,
      turn_order: initiativeComplete ? combatState.initiative_order : null,
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: error.message || 'Failed to update initiative' },
      { status: 500 }
    );
  }
}
