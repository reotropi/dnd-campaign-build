// ============================================================================
// COMBAT STATE TYPE DEFINITIONS
// Structured state for tracking combat encounters
// ============================================================================

export type CombatantType = 'player' | 'enemy';

export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  type: CombatantType;
}

export interface PlayerCombatant {
  character_id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  conditions: string[]; // e.g., ['poisoned', 'prone', 'stunned']
}

export interface EnemyCombatant {
  id: string; // Generated unique ID (e.g., "goblin_1")
  name: string; // Display name (e.g., "Goblin #1")
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  attack_bonus: number;
  damage_dice: string; // e.g., "1d6+2"
  is_alive: boolean;
  conditions: string[];
}

export interface CombatState {
  active: boolean;
  round: number;
  turn_index: number; // Index in initiative_order array

  // Sorted by initiative (high to low)
  initiative_order: CombatParticipant[];

  combatants: {
    players: PlayerCombatant[];
    enemies: EnemyCombatant[];
  };
}

// Claude response structure for combat updates
export interface CombatUpdate {
  damage_dealt?: Array<{
    target_id: string; // character_id for players, enemy id for enemies
    amount: number;
  }>;
  healing?: Array<{
    target_id: string;
    amount: number;
  }>;
  conditions_added?: Array<{
    target_id: string;
    conditions: string[];
  }>;
  conditions_removed?: Array<{
    target_id: string;
    conditions: string[];
  }>;
  enemies_killed?: string[]; // Array of enemy IDs to mark as dead
  turn_complete?: boolean; // If true, advance to next turn
}

export interface ClaudeCombatResponse {
  narrative: string; // The story/description for display
  combat_update?: CombatUpdate; // Structured state changes
  roll_prompt?: {
    character_name: string;
    description: string;
  };
}

// Tool definition for Claude to initialize combat
export interface InitCombatParams {
  enemies: Array<{
    name: string; // e.g., "Giant Rat"
    count: number; // How many of this enemy type
    hp: number;
    ac: number;
    attack_bonus: number;
    damage_dice: string;
  }>;
}

// Tool definition for Claude to update combat
export interface UpdateCombatParams {
  changes: CombatUpdate;
}
