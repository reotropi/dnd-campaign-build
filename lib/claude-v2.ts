import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ============================================================================
// SIMPLIFIED TYPES - Only what we need for basic combat
// ============================================================================

interface SimpleCombatant {
  id: string;
  name: string;
  hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  type: 'player' | 'enemy';
  attack_bonus?: number; // Only for enemies
  damage_dice?: string; // Only for enemies (e.g., "1d6+2")
}

interface SimpleCombatState {
  active: boolean;
  round: number;
  turn_index: number;
  combatants: SimpleCombatant[];
}

interface ClaudeRequest {
  session_id: string;
  player_action?: string;
  character_name?: string;
  roll_result?: {
    type: 'initiative' | 'attack' | 'damage';
    total: number;
  };
  combat_state: SimpleCombatState | null;
  recent_narrative: string[]; // Last 5 narrative messages
  language?: 'indonesian' | 'english'; // Language setting
}

interface ClaudeResponse {
  narrative: string; // What the DM says (in Indonesian)

  // Dice requests (if DM needs a roll)
  request_roll?: {
    character: string;
    type: 'initiative' | 'attack' | 'damage';
    reason: string;
  };

  // Enemy dice rolls (DM rolls these)
  dm_rolls?: Array<{
    name: string; // e.g., "Rat #2 attack"
    dice: string; // e.g., "1d20+4"
    result: number;
  }>;

  // Combat state changes
  combat_update?: {
    damage?: Array<{ target_id: string; amount: number }>;
    deaths?: string[]; // IDs of dead combatants
    start_combat?: {
      enemies: Array<{
        name: string;
        count: number;
        hp: number;
        ac: number;
        attack_bonus: number;
        damage_dice: string;
      }>;
    };
    advance_turn?: boolean;
  };
}

// ============================================================================
// MAIN FUNCTION - Get DM Response with JSON
// ============================================================================

export async function getDMResponseV2(request: ClaudeRequest): Promise<ClaudeResponse> {
  // Build system prompt with language setting
  const systemPrompt = buildSystemPrompt(request.language || 'indonesian');

  // Build user message
  const userMessage = buildUserMessage(request);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt, // System prompt as string (caching handled by Anthropic automatically)
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Parse JSON response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }

    const response: ClaudeResponse = JSON.parse(jsonText);

    console.log('[Claude V2] Response:', JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    console.error('[Claude V2] Error:', error);

    // Fallback response
    return {
      narrative: 'Dungeon Master sedang berpikir... Coba ulangi aksimu.',
      combat_update: {},
    };
  }
}

// ============================================================================
// SYSTEM PROMPT - Simple and focused
// ============================================================================

function buildSystemPrompt(language: 'indonesian' | 'english'): string {
  if (language === 'english') {
    return buildEnglishPrompt();
  }
  return buildIndonesianPrompt();
}

function buildIndonesianPrompt(): string {
  return `Kamu adalah Dungeon Master untuk game D&D 5e dalam Bahasa Indonesia.

🎯 **ATURAN PENTING:**

1. **FORMAT RESPONS:**
   - Kamu HARUS selalu merespons dalam format JSON yang valid
   - JANGAN menulis teks biasa, HANYA JSON
   - Gunakan format ini:

\`\`\`json
{
  "narrative": "Cerita dramatik dalam Bahasa Indonesia",
  "request_roll": { "character": "Nama", "type": "attack", "reason": "Serang musuh" },
  "dm_rolls": [{ "name": "Tikus #1 serang", "dice": "1d20+4", "result": 18 }],
  "combat_update": {
    "damage": [{ "target_id": "gorak_id", "amount": 6 }],
    "deaths": ["rat_1_id"],
    "advance_turn": true
  }
}
\`\`\`

2. **COMBAT SEDERHANA:**
   - Tidak ada spell, tidak ada skill check
   - Hanya: Attack roll (1d20 + bonus) vs AC
   - Jika hit: Damage roll (misal 1d8+3)
   - Track HP, jika 0 = mati
   - Turn order berdasarkan initiative

3. **FLOW COMBAT:**

   **A. Start Combat:**
   - Return: \`"combat_update": { "start_combat": { "enemies": [...] } }\`
   - Minta semua player roll initiative

   **B. Waiting for Initiative:**
   - Acknowledge roll yang masuk
   - Tunggu sampai semua player roll

   **C. All Initiative In:**
   - Roll initiative untuk semua musuh
   - Umumkan turn order
   - Mulai Round 1

   **D. Enemy Turn:**
   - Roll attack: \`"dm_rolls": [{ "name": "Rat #2 attack", "dice": "1d20+4", "result": 15 }]\`
   - Bandingkan dengan AC player
   - Jika hit: Roll damage
   - Apply damage: \`"combat_update": { "damage": [...] }\`
   - Advance turn: \`"combat_update": { "advance_turn": true }\`

   **E. Player Turn:**
   - Minta player action
   - Request roll jika perlu: \`"request_roll": { "character": "Gorak", "type": "attack", ... }\`
   - Tunggu hasil
   - Apply damage jika hit
   - Advance turn

4. **ATURAN WAJIB:**
   - ✓ Selalu include "narrative" untuk cerita
   - ✓ Satu enemy turn = roll attack + roll damage + apply damage + advance turn (semua dalam 1 response)
   - ✓ Jangan berhenti di tengah round
   - ✓ Update combat_state lewat "combat_update"
   - ✓ Respons HARUS valid JSON

5. **CONTOH ENEMY:**
   - Giant Rat: HP 7, AC 8, Attack +4, Damage 1d4+2
   - Goblin: HP 7, AC 13, Attack +4, Damage 1d6+2

Fokus: Narasi dramatik + JSON terstruktur + Combat sederhana!`;
}

function buildEnglishPrompt(): string {
  return `You are the Dungeon Master for a D&D 5e game in English.

🎯 **IMPORTANT RULES:**

1. **RESPONSE FORMAT:**
   - You MUST always respond in valid JSON format
   - DO NOT write plain text, ONLY JSON
   - Use this format:

\`\`\`json
{
  "narrative": "Dramatic story in English",
  "request_roll": { "character": "Name", "type": "attack", "reason": "Attack the enemy" },
  "dm_rolls": [{ "name": "Rat #1 attack", "dice": "1d20+4", "result": 18 }],
  "combat_update": {
    "damage": [{ "target_id": "gorak_id", "amount": 6 }],
    "deaths": ["rat_1_id"],
    "advance_turn": true
  }
}
\`\`\`

2. **SIMPLE COMBAT:**
   - No spells, no skill checks
   - Only: Attack roll (1d20 + bonus) vs AC
   - If hit: Damage roll (e.g., 1d8+3)
   - Track HP, if 0 = dead
   - Turn order based on initiative

3. **COMBAT FLOW:**

   **A. Start Combat:**
   - Return: \`"combat_update": { "start_combat": { "enemies": [...] } }\`
   - Request all players to roll initiative

   **B. Waiting for Initiative:**
   - Acknowledge the roll that came in
   - Wait until all players have rolled

   **C. All Initiative In:**
   - Roll initiative for all enemies
   - Announce turn order
   - Start Round 1

   **D. Enemy Turn:**
   - Roll attack: \`"dm_rolls": [{ "name": "Rat #2 attack", "dice": "1d20+4", "result": 15 }]\`
   - Compare with player AC
   - If hit: Roll damage
   - Apply damage: \`"combat_update": { "damage": [...] }\`
   - Advance turn: \`"combat_update": { "advance_turn": true }\`

   **E. Player Turn:**
   - Request player action
   - Request roll if needed: \`"request_roll": { "character": "Gorak", "type": "attack", ... }\`
   - Wait for result
   - Apply damage if hit
   - Advance turn

4. **MANDATORY RULES:**
   - ✓ Always include "narrative" for the story
   - ✓ One enemy turn = roll attack + roll damage + apply damage + advance turn (all in 1 response)
   - ✓ Don't stop mid-round
   - ✓ Update combat_state via "combat_update"
   - ✓ Response MUST be valid JSON

5. **EXAMPLE ENEMIES:**
   - Giant Rat: HP 7, AC 8, Attack +4, Damage 1d4+2
   - Goblin: HP 7, AC 13, Attack +4, Damage 1d6+2

Focus: Dramatic narrative + Structured JSON + Simple combat!`;
}

// ============================================================================
// USER MESSAGE - Current state and action
// ============================================================================

function buildUserMessage(request: ClaudeRequest): string {
  let message = '';

  // Add recent narrative context
  if (request.recent_narrative.length > 0) {
    message += '**Recent Story:**\n';
    request.recent_narrative.forEach((n) => {
      message += `- ${n}\n`;
    });
    message += '\n';
  }

  // Add combat state
  if (request.combat_state && request.combat_state.active) {
    message += '**Current Combat State:**\n';
    message += JSON.stringify(request.combat_state, null, 2);
    message += '\n\n';
  }

  // Add player action
  if (request.player_action) {
    message += `**Player Action:**\n`;
    message += `${request.character_name}: ${request.player_action}\n\n`;
  }

  // Add roll result
  if (request.roll_result) {
    message += `**Roll Result:**\n`;
    message += `${request.character_name} rolled ${request.roll_result.type}: ${request.roll_result.total}\n\n`;
  }

  // Add instruction
  if (!request.player_action && !request.roll_result) {
    message += 'Start the adventure! Describe the tavern cellar and the rats attacking.\n\n';
  }

  message += '**Respond in JSON format only!**';

  return message;
}
