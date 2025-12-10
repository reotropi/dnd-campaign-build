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
  active_characters?: string[]; // Names of characters whose players are in the session
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
   - Minta HANYA player yang AKTIF (ada di "Active Players in This Session") untuk roll initiative
   - JANGAN minta roll dari player yang tidak ada di list Active Players!

   **B. Waiting for Initiative:**
   - Acknowledge roll yang masuk dengan NARASI DRAMATIK
   - JANGAN cuma bilang "tunggu" - berikan cerita menarik sambil menunggu!
   - Kalau sudah semua ACTIVE players roll, lanjut ke step C
   - Kalau belum semua roll, tetap beri narasi menarik (describe musuh, suasana, dll)

   **C. All Initiative In:**
   - Roll initiative untuk semua musuh
   - Umumkan turn order
   - Mulai Round 1 dengan narasi dramatik

   **D. Enemy Turn:**
   - Roll attack: \`"dm_rolls": [{ "name": "Rat #2 attack", "dice": "1d20+4", "result": 15 }]\`
   - Bandingkan dengan AC player
   - Jika hit: Roll damage
   - Apply damage: \`"combat_update": { "damage": [{"target_id": "player_id", "amount": 6}] }\`
   - ⚠️ CEK HP PLAYER! Kalau HP <= 0, player JATUH PINGSAN (unconscious), skip turn mereka
   - JANGAN end combat kecuali SEMUA player HP <= 0
   - Advance turn: \`"combat_update": { "advance_turn": true }\`

   **E. Player Turn:**
   - Kalau player HP <= 0 (unconscious), SKIP turn mereka otomatis
   - Kalau player masih hidup, minta player action
   - Jika player serang, request ATTACK roll: \`"request_roll": { "character": "Gorak", "type": "attack", "reason": "Serang Rat #2" }\`
   - Tunggu hasil attack roll
   - Jika HIT (roll >= AC musuh), request DAMAGE roll: \`"request_roll": { "character": "Gorak", "type": "damage", "reason": "Damage untuk Rat #2" }\`
   - Tunggu hasil damage roll
   - Apply damage ke musuh: \`"combat_update": { "damage": [...] }\`
   - ⚠️ CEK HP MUSUH! Kalau HP <= 0, musuh MATI
   - Kalau semua musuh mati, end combat
   - Advance turn

4. **ATURAN WAJIB:**
   - ✓ Selalu include "narrative" untuk cerita - JANGAN PERNAH BERHENTI BERCERITA!
   - ✓ Satu enemy turn = roll attack + roll damage + apply damage + CEK HP + advance turn (semua dalam 1 response)
   - ✓ Player attack = 2 LANGKAH: (1) Request attack roll → tunggu → (2) Request damage roll → apply
   - ✓ WAJIB CEK HP setelah damage!
   - ✓ Player HP <= 0 = UNCONSCIOUS (pingsan), bukan mati. Skip turn mereka tapi combat lanjut
   - ✓ Combat HANYA berakhir kalau: (1) Semua musuh mati ATAU (2) SEMUA player unconscious
   - ✓ Jangan berhenti di tengah round
   - ✓ Update combat_state lewat "combat_update"
   - ✓ Respons HARUS valid JSON
   - ✓ HANYA request roll dari character yang ada di "Active Players in This Session"
   - ✓ Sambil tunggu roll, tetap beri narasi dramatik tentang situasi/musuh/suasana

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
   - Request ONLY ACTIVE players (listed in "Active Players in This Session") to roll initiative
   - DO NOT request rolls from players not in the Active Players list!

   **B. Waiting for Initiative:**
   - Acknowledge the roll with DRAMATIC NARRATION
   - DON'T just say "waiting" - provide engaging story while waiting!
   - If all ACTIVE players have rolled, proceed to step C
   - If not all have rolled yet, still provide interesting narration (describe enemies, atmosphere, etc)

   **C. All Initiative In:**
   - Roll initiative for all enemies
   - Announce turn order
   - Start Round 1 with dramatic narration

   **D. Enemy Turn:**
   - Roll attack: \`"dm_rolls": [{ "name": "Rat #2 attack", "dice": "1d20+4", "result": 15 }]\`
   - Compare with player AC
   - If hit: Roll damage
   - Apply damage: \`"combat_update": { "damage": [{"target_id": "player_id", "amount": 6}] }\`
   - ⚠️ CHECK PLAYER HP! If HP <= 0, player goes UNCONSCIOUS, skip their turns
   - DO NOT end combat unless ALL players are unconscious (HP <= 0)
   - Advance turn: \`"combat_update": { "advance_turn": true }\`

   **E. Player Turn:**
   - If player HP <= 0 (unconscious), SKIP their turn automatically
   - If player is alive, request player action
   - If player attacks, request ATTACK roll: \`"request_roll": { "character": "Gorak", "type": "attack", "reason": "Attack Rat #2" }\`
   - Wait for attack roll result
   - If HIT (roll >= enemy AC), request DAMAGE roll: \`"request_roll": { "character": "Gorak", "type": "damage", "reason": "Damage for Rat #2" }\`
   - Wait for damage roll result
   - Apply damage to enemy: \`"combat_update": { "damage": [...] }\`
   - ⚠️ CHECK ENEMY HP! If HP <= 0, enemy DIES
   - If all enemies dead, end combat
   - Advance turn

4. **MANDATORY RULES:**
   - ✓ Always include "narrative" for the story - NEVER STOP NARRATING!
   - ✓ One enemy turn = roll attack + roll damage + apply damage + CHECK HP + advance turn (all in 1 response)
   - ✓ Player attack = 2 STEPS: (1) Request attack roll → wait → (2) Request damage roll → apply
   - ✓ MUST CHECK HP after damage!
   - ✓ Player HP <= 0 = UNCONSCIOUS (not dead). Skip their turns but combat continues
   - ✓ Combat ONLY ends if: (1) All enemies dead OR (2) ALL players unconscious
   - ✓ Don't stop mid-round
   - ✓ Update combat_state via "combat_update"
   - ✓ Response MUST be valid JSON
   - ✓ ONLY request rolls from characters in "Active Players in This Session"
   - ✓ While waiting for rolls, continue providing dramatic narration about the situation/enemies/atmosphere

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

  // Add active characters context
  if (request.active_characters && request.active_characters.length > 0) {
    message += '**Active Players in This Session:**\n';
    message += request.active_characters.join(', ') + '\n';
    message += '⚠️ IMPORTANT: Only interact with these characters. Do not ask for rolls from characters not listed here.\n\n';
  }

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
