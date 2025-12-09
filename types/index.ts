// ============================================================================
// DATABASE TYPES (matching Supabase schema)
// ============================================================================

export interface Profile {
  id: string;
  player_name: string;
  email: string;
  role: 'admin' | 'player';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  host_id: string;
  campaign_name: string;
  session_code: string;
  status: 'lobby' | 'active' | 'paused' | 'ended';
  max_players: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface Character {
  id: string;
  created_by: string;
  user_id: string | null;
  session_id: string;
  name: string;
  class: string;
  level: number;
  race?: string;
  background?: string;

  // Core stats
  max_hp: number;
  current_hp: number;
  armor_class: number;

  // Ability scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Proficiency
  proficiency_bonus: number;

  // JSON fields
  skills: Skills;
  weapons: Weapon[];
  spells: Spell[];
  spell_slots: SpellSlots;
  features: Feature[];
  inventory: InventoryItem[];
  notes?: string;

  // Assignment
  is_assigned: boolean;

  created_at: string;
  updated_at: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  user_id: string;
  character_id: string | null;
  is_ready: boolean;
  joined_at: string;
}

export interface SessionCharacter {
  id: string;
  session_id: string;
  character_id: string;
  added_by: string;
  added_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string | null;
  character_id: string | null;
  message_type: 'chat' | 'dm' | 'roll' | 'system' | 'ooc';
  content: string;
  roll_data?: RollData;
  created_at: string;
}

export interface GameState {
  id: string;
  session_id: string;
  is_in_combat: boolean;
  combat_round: number;
  turn_order: TurnOrderEntry[];
  current_turn_index: number;
  current_scene?: string;
  location?: string;
  quest_objectives: QuestObjective[];
  custom_state: Record<string, any>;
  updated_at: string;
}

// ============================================================================
// CHARACTER RELATED TYPES
// ============================================================================

export interface Skills {
  acrobatics?: number;
  animal_handling?: number;
  arcana?: number;
  athletics?: number;
  deception?: number;
  history?: number;
  insight?: number;
  intimidation?: number;
  investigation?: number;
  medicine?: number;
  nature?: number;
  perception?: number;
  performance?: number;
  persuasion?: number;
  religion?: number;
  sleight_of_hand?: number;
  stealth?: number;
  survival?: number;
}

export interface Weapon {
  name: string;
  damage_dice: string; // e.g., "1d8"
  damage_type: string; // e.g., "slashing"
  attack_bonus?: number;
  properties?: string[];
}

export interface Spell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  damage?: string;
  save_dc?: number;
}

export interface SpellSlots {
  level_1?: number;
  level_2?: number;
  level_3?: number;
  level_4?: number;
  level_5?: number;
  level_6?: number;
  level_7?: number;
  level_8?: number;
  level_9?: number;
}

export interface Feature {
  name: string;
  description: string;
  source: string; // e.g., "Class", "Race", "Background"
}

export interface InventoryItem {
  name: string;
  quantity: number;
  description?: string;
  weight?: number;
}

// ============================================================================
// DICE ROLLING TYPES
// ============================================================================

export type RollType = 'initiative' | 'attack' | 'damage' | 'saving_throw' | 'ability_check' | 'skill_check' | 'custom';

export type AdvantageType = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRoll {
  dice_type: string; // e.g., "d20", "d8"
  count: number;
  result: number;
  individual_rolls?: number[];
}

export interface RollModifier {
  name: string;
  value: number;
  source?: string; // e.g., "Strength Modifier", "Hunter's Mark"
}

export interface RollData {
  roll_type: RollType;
  advantage_type: AdvantageType;
  dice: DiceRoll[];
  modifiers: RollModifier[];
  total: number;
  description?: string;
  character_name?: string;
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

export interface TurnOrderEntry {
  character_id: string;
  character_name: string;
  initiative: number;
  user_id: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

// ============================================================================
// UI/COMPONENT TYPES
// ============================================================================

export interface SessionWithHost extends Session {
  host?: Profile;
}

export interface SessionMemberWithDetails extends SessionMember {
  profile?: Profile;
  character?: PublicCharacterInfo;
}

export interface MessageWithDetails extends Message {
  profile?: Profile;
  character?: PublicCharacterInfo;
}

// Public character info (what other players can see)
export interface PublicCharacterInfo {
  id: string;
  name: string;
  class: string;
  level: number;
  race?: string;
  armor_class: number;
}

// Full character info (what the player sees)
export interface FullCharacterInfo extends Character {
  // All character fields plus computed values
  ability_modifiers: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

// ============================================================================
// CHARACTER IMPORT TYPES
// ============================================================================

export interface CharacterImportData {
  name: string;
  class: string;
  level: number;
  race?: string;
  background?: string;
  max_hp: number;
  armor_class: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiency_bonus: number;
  skills?: Skills;
  weapons?: Weapon[];
  spells?: Spell[];
  spell_slots?: SpellSlots;
  features?: Feature[];
  inventory?: InventoryItem[];
  notes?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSessionRequest {
  campaign_name: string;
  max_players?: number;
  character_ids: string[]; // Characters to add to session
}

export interface CreateSessionResponse {
  session: Session;
  session_code: string;
}

export interface JoinSessionRequest {
  session_code: string;
}

export interface JoinSessionResponse {
  session: Session;
  member: SessionMember;
}

export interface SelectCharacterRequest {
  character_id: string;
}

export interface SendMessageRequest {
  content: string;
  message_type?: 'chat' | 'roll';
  roll_data?: RollData;
}

export interface ClaudeMessageRequest {
  session_id: string;
  user_message?: string;
  roll_data?: RollData;
}

export interface ClaudeMessageResponse {
  content: string;
  roll_prompt?: RollPrompt; // If Claude asks for a roll
}

export interface RollPrompt {
  character_name: string;
  roll_type: RollType;
  description: string;
  difficulty_class?: number; // For saving throws
}

// ============================================================================
// DICE ROLLER TYPES
// ============================================================================

export interface DiceRollerState {
  isLocked: boolean;
  rollType: RollType | null;
  targetCharacter: string | null;
  advantageType: AdvantageType;
  customModifier: number;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, playerName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};

// Utility type for ability scores
export type AbilityScore = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

// Utility type for skill names
export type SkillName = keyof Skills;
