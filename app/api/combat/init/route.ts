import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CombatState, InitCombatParams, PlayerCombatant, EnemyCombatant } from '@/types/combat';

/**
 * Initialize combat for a session
 * This endpoint is called by Claude AI via the init_combat tool
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id, enemies } = await request.json() as { session_id: string; enemies: InitCombatParams['enemies'] };

    if (!session_id || !enemies) {
      return NextResponse.json(
        { error: 'session_id and enemies are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Get all characters in the session
    const { data: sessionChars, error: charsError } = await supabase
      .from('session_characters')
      .select(`
        character_id,
        current_hp,
        characters (
          id,
          name,
          armor_class,
          hit_points
        )
      `)
      .eq('session_id', session_id);

    if (charsError) throw charsError;

    // Create player combatants (initiative will be added when they roll)
    const players: PlayerCombatant[] = sessionChars.map((sc: any) => ({
      character_id: sc.character_id,
      name: sc.characters.name,
      current_hp: sc.current_hp || sc.characters.hit_points,
      max_hp: sc.characters.hit_points,
      ac: sc.characters.armor_class,
      initiative: 0, // Will be updated when player rolls
      conditions: [],
    }));

    // Create enemy combatants
    const enemyCombatants: EnemyCombatant[] = [];
    enemies.forEach((enemyType) => {
      for (let i = 1; i <= enemyType.count; i++) {
        const enemyId = `${enemyType.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${i}`;
        enemyCombatants.push({
          id: enemyId,
          name: `${enemyType.name} #${i}`,
          current_hp: enemyType.hp,
          max_hp: enemyType.hp,
          ac: enemyType.ac,
          initiative: 0, // Will be rolled by DM
          attack_bonus: enemyType.attack_bonus,
          damage_dice: enemyType.damage_dice,
          is_alive: true,
          conditions: [],
        });
      }
    });

    // Create initial combat state (no initiative order yet)
    const combatState: CombatState = {
      active: true,
      round: 0, // Will become 1 when first turn starts
      turn_index: 0,
      initiative_order: [],
      combatants: {
        players,
        enemies: enemyCombatants,
      },
    };

    // Update game_state with combat_state
    const { error: updateError } = await supabase
      .from('game_state')
      .update({ combat_state: combatState })
      .eq('session_id', session_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      combat_state: combatState,
      message: `Combat initialized with ${players.length} players and ${enemyCombatants.length} enemies`,
    });
  } catch (error: any) {
    console.error('Error initializing combat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize combat' },
      { status: 500 }
    );
  }
}
