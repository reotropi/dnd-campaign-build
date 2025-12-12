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
// JSON VALIDATION - Ensure Haiku returns valid structure
// ============================================================================

function validateClaudeResponse(data: any): ClaudeResponse {
  // Ensure narrative exists
  if (!data.narrative || typeof data.narrative !== 'string') {
    throw new Error('Missing or invalid narrative field');
  }

  const response: ClaudeResponse = {
    narrative: data.narrative,
  };

  // Validate request_roll if present
  if (data.request_roll) {
    if (data.request_roll.character && data.request_roll.type && data.request_roll.reason) {
      response.request_roll = {
        character: String(data.request_roll.character),
        type: data.request_roll.type,
        reason: String(data.request_roll.reason),
      };
    }
  }

  // Validate dm_rolls if present
  if (data.dm_rolls && Array.isArray(data.dm_rolls)) {
    response.dm_rolls = data.dm_rolls
      .filter((roll: any) => roll.name && roll.dice && typeof roll.result === 'number')
      .map((roll: any) => ({
        name: String(roll.name),
        dice: String(roll.dice),
        result: Number(roll.result),
      }));
  }

  // Validate combat_update if present
  if (data.combat_update && typeof data.combat_update === 'object') {
    response.combat_update = {};

    // Validate damage array
    if (data.combat_update.damage && Array.isArray(data.combat_update.damage)) {
      response.combat_update.damage = data.combat_update.damage
        .filter((d: any) => d.target_id && typeof d.amount === 'number')
        .map((d: any) => ({
          target_id: String(d.target_id),
          amount: Number(d.amount),
        }));
    }

    // Validate deaths array
    if (data.combat_update.deaths && Array.isArray(data.combat_update.deaths)) {
      response.combat_update.deaths = data.combat_update.deaths.map((id: any) => String(id));
    }

    // Validate start_combat
    if (data.combat_update.start_combat && data.combat_update.start_combat.enemies) {
      const enemies = data.combat_update.start_combat.enemies;
      if (Array.isArray(enemies)) {
        response.combat_update.start_combat = {
          enemies: enemies
            .filter((e: any) => e.name && e.count && e.hp && e.ac)
            .map((e: any) => ({
              name: String(e.name),
              count: Number(e.count),
              hp: Number(e.hp),
              ac: Number(e.ac),
              attack_bonus: Number(e.attack_bonus || 0),
              damage_dice: String(e.damage_dice || '1d4'),
            })),
        };
      }
    }

    // Validate advance_turn
    if (data.combat_update.advance_turn !== undefined) {
      response.combat_update.advance_turn = Boolean(data.combat_update.advance_turn);
    }
  }

  return response;
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
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse and validate JSON
    let rawResponse;
    try {
      rawResponse = JSON.parse(jsonText);
    } catch (parseError: any) {
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }

    const validatedResponse = validateClaudeResponse(rawResponse);

    return validatedResponse;
  } catch (error: any) {
    // Fallback response in appropriate language
    let fallbackNarrative = request.language === 'english'
      ? 'The Dungeon Master encountered an issue. Please try your action again.'
      : 'Dungeon Master mengalami masalah teknis. Coba ulangi aksimu.';

    // Add specific error info if available
    if (error?.message?.includes('JSON')) {
      fallbackNarrative = request.language === 'english'
        ? 'The Dungeon Master is reorganizing their thoughts... Please try your action again.'
        : 'Dungeon Master sedang merapikan pikirannya... Coba ulangi aksimu.';
    }

    return {
      narrative: fallbackNarrative,
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

2. **STORY PACING - SANGAT PENTING:**
   - ⚠️ JANGAN LANGSUNG KE COMBAT! Bangun cerita secara bertahap
   - Mulai dengan pertemuan NPC (bisa siapa saja, bukan selalu tavern keeper!)
   - ⚠️ VARIASI QUEST: Jangan selalu "tikus di cellar" - gunakan masalah yang berbeda setiap game baru!
   - Beri player PILIHAN: terima quest atau tidak, ajukan pertanyaan, eksplorasi
   - Jelaskan situasi/setting dulu sebelum ada aksi
   - Combat HANYA dimulai kalau player secara eksplisit memilih masuk ke area berbahaya
   - Contoh flow yang baik:
     1. NPC menemui player, jelaskan masalahnya (bervariasi: bandit, goblin, skeleton, dll)
     2. Player bisa tanya detail, nego reward, atau langsung terima
     3. Kalau terima, player harus SECARA EKSPLISIT bilang seperti "saya menerima", "pergi ke lokasi" atau "masuk ke area"
     4. Deskripsi lokasi (gelap, suasana mencekam, detail menarik)
     5. BARU combat dimulai kalau player lebih jauh masuk
   - JANGAN skip step-step ini! Setiap interaction membangun immersion
   - ⚠️ BAHASA: Tulis SEMUA narasi dalam Bahasa Indonesia yang KONSISTEN!

3. **CHARACTER ROLES & ABILITIES:**
   - ⚠️ WAJIB: SELALU ingat dan gunakan class character yang benar dari "Active Players in This Session"!
   - Contoh: Kalau characternya Wizard, jangan sebut dia sebagai Ranger atau Rogue!
   - Players BEBAS menggunakan spell, skill, atau equipment apapun sesuai class mereka
   - TIDAK PERLU track spell slots, ammo, atau resource lainnya - anggap unlimited
   - Wizard bisa cast spell (Fireball, Magic Missile, Shield, dll) kapanpun
   - Ranger bisa shoot arrows unlimited, gunakan Hunter's Mark, dll
   - Rogue bisa Sneak Attack, Hide, dll
   - Fighter bisa Action Surge, Second Wind, dll
   - Cleric bisa cast Cure Wounds, Sacred Flame, dll unlimited
   - Biarkan player creative dengan ability mereka!

4. **COMBAT SEDERHANA:**
   - Attack roll (1d20 + bonus) vs AC - bisa untuk weapon attack atau spell attack
   - Jika hit: Damage roll (misal 1d8+3 untuk weapon, 8d6 untuk Fireball)
   - Spell damage bervariasi tergantung spell (Fireball = 8d6, Magic Missile = 3d4+3, dll)
   - Track HP, jika 0 = mati
   - Turn order berdasarkan initiative

5. **FLOW COMBAT:**

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
   - ⚠️ INGAT: Gunakan CLASS yang BENAR sesuai "Active Players in This Session"! (Wizard = wizard, Ranger = ranger, dll)
   - ⚠️ PENTING: Jika player bilang mau serang/cast spell (apapun kata-katanya: "serang", "attack", "cast Fireball", "shoot arrow", dll):
     1. JANGAN narasi hasil serangan/spell!
     2. WAJIB request attack roll dengan format: \`"request_roll": { "character": "Elara", "type": "attack", "reason": "Cast Fireball at Goblins" }\`
     3. Narasi hanya boleh sampai "Character mulai cast spell..." atau "Character mengincar musuh..."
     4. STOP di situ, tunggu roll result!
   - Tunggu hasil attack roll dari player
   - Setelah dapat attack roll, bandingkan dengan AC musuh:
     - Jika HIT (roll >= AC musuh), request DAMAGE roll: \`"request_roll": { "character": "Elara", "type": "damage", "reason": "Fireball damage (8d6)" }\`
     - Jika MISS, narasi serangan/spell meleset, advance turn
   - Tunggu hasil damage roll
   - Apply damage ke musuh: \`"combat_update": { "damage": [...] }\`
   - ⚠️ CEK HP MUSUH! Kalau HP <= 0, musuh MATI
   - Kalau semua musuh mati, end combat
   - Advance turn

6. **ATURAN WAJIB:**
   - ✓ Selalu include "narrative" untuk cerita - JANGAN PERNAH BERHENTI BERCERITA!
   - ✓ WAJIB gunakan class character yang BENAR dari daftar "Active Players in This Session"!
   - ✓ Satu enemy turn = roll attack + roll damage + apply damage + CEK HP + advance turn (semua dalam 1 response)
   - ✓ Player attack/spell = 2 LANGKAH: (1) Request attack roll → tunggu → (2) Request damage roll → apply
   - ✓ WAJIB CEK HP setelah damage!
   - ✓ Player HP <= 0 = UNCONSCIOUS (pingsan), bukan mati. Skip turn mereka tapi combat lanjut
   - ✓ Combat HANYA berakhir kalau: (1) Semua musuh mati ATAU (2) SEMUA player unconscious
   - ✓ Jangan berhenti di tengah round
   - ✓ Update combat_state lewat "combat_update"
   - ✓ Respons HARUS valid JSON
   - ✓ HANYA request roll dari character yang ada di "Active Players in This Session"
   - ✓ Sambil tunggu roll, tetap beri narasi dramatik tentang situasi/musuh/suasana
   - ⚠️ JANGAN PERNAH tulis hasil serangan player di narrative tanpa request_roll! Kalau player serang, HARUS ada "request_roll" di JSON!

7. **ENEMY YANG TERSEDIA (pilih RANDOM, jangan selalu sama!):**
   - Giant Rat: HP 7, AC 8, Attack +4, Damage 1d4+2
   - Goblin: HP 7, AC 9, Attack +4, Damage 1d6+2
   - Skeleton: HP 13, AC 9, Attack +4, Damage 1d6+2
   - Wolf: HP 11, AC 11, Attack +4, Damage 2d4+2
   - Giant Spider: HP 26, AC 12, Attack +5, Damage 1d8+3 (plus poison)
   - Bandit: HP 11, AC 10, Attack +3, Damage 1d6+1
   - Zombie: HP 22, AC 8, Attack +3, Damage 1d6+1
   - Orc: HP 15, AC 12, Attack +5, Damage 1d12+3

⚠️ **PENTING - KONSISTENSI BAHASA:**
   - Usahakan menulis narasi dalam Bahasa Indonesia sebanyak mungkin
   - Boleh campur sedikit bahasa Inggris (maksimal 50:50), karena player Indonesia paham sedikit Bahasa Inggris
   - Skill/action names/sound effect/senjata/makian boleh Inggris (misal "attack", "bite")
   - Contoh BAIK: "Gorak mengangkat great axe-nya, bersiap untuk strike musuh di depannya."
   - Prioritas: Indonesia > Campur > Inggris penuh

Fokus: Narasi dramatik DALAM BAHASA INDONESIA + JSON terstruktur + Combat sederhana + Enemy BERVARIASI!`;
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

2. **STORY PACING - VERY IMPORTANT:**
   - ⚠️ DO NOT JUMP STRAIGHT TO COMBAT! Build the story gradually
   - Start with NPC encounter (could be anyone, not always tavern keeper!)
   - ⚠️ QUEST VARIETY: Don't always use "rats in cellar" - use different problems each new game!
   - Give players CHOICES: accept quest or not, ask questions, explore
   - Describe the situation/setting before any action
   - Combat ONLY starts when player explicitly chooses to enter dangerous area
   - Example of good flow:
     1. NPC approaches player, explains the problem (varied: bandits, goblins, skeletons, etc)
     2. Player can ask details, negotiate reward, or accept immediately
     3. If accepted, player must EXPLICITLY say something like "I accept", "go to location" or "enter area"
     4. Description of location (dark, ominous atmosphere, interesting details)
     5. Combat starts ONLY when player goes deeper
   - DO NOT skip these steps! Each interaction builds immersion

3. **CHARACTER ROLES & ABILITIES:**
   - ⚠️ MANDATORY: ALWAYS remember and use correct character class from "Active Players in This Session"!
   - Example: If character is Wizard, don't call them Ranger or Rogue!
   - Players are FREE to use any spell, skill, or equipment matching their class
   - DO NOT track spell slots, ammo, or other resources - assume unlimited
   - Wizard can cast spells (Fireball, Magic Missile, Shield, etc) anytime
   - Ranger can shoot arrows unlimited, use Hunter's Mark, etc
   - Rogue can Sneak Attack, Hide, etc
   - Fighter can Action Surge, Second Wind, etc
   - Cleric can cast Cure Wounds, Sacred Flame, etc unlimited
   - Let players be creative with their abilities!

4. **SIMPLE COMBAT:**
   - Attack roll (1d20 + bonus) vs AC - for weapon attacks or spell attacks
   - If hit: Damage roll (e.g., 1d8+3 for weapon, 8d6 for Fireball)
   - Spell damage varies by spell (Fireball = 8d6, Magic Missile = 3d4+3, etc)
   - Track HP, if 0 = dead
   - Turn order based on initiative

5. **COMBAT FLOW:**

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
   - ⚠️ REMEMBER: Use CORRECT CLASS from "Active Players in This Session"! (Wizard = wizard, Ranger = ranger, etc)
   - ⚠️ IMPORTANT: If player says they want to attack/cast spell (any wording: "attack", "cast Fireball", "shoot arrow", etc):
     1. DO NOT narrate the attack/spell outcome!
     2. MUST request attack roll with format: \`"request_roll": { "character": "Elara", "type": "attack", "reason": "Cast Fireball at Goblins" }\`
     3. Narration should only go as far as "Character begins casting..." or "Character aims at the enemy..."
     4. STOP there, wait for roll result!
   - Wait for attack roll result from player
   - After receiving attack roll, compare with enemy AC:
     - If HIT (roll >= enemy AC), request DAMAGE roll: \`"request_roll": { "character": "Elara", "type": "damage", "reason": "Fireball damage (8d6)" }\`
     - If MISS, narrate the attack/spell missing, advance turn
   - Wait for damage roll result
   - Apply damage to enemy: \`"combat_update": { "damage": [...] }\`
   - ⚠️ CHECK ENEMY HP! If HP <= 0, enemy DIES
   - If all enemies dead, end combat
   - Advance turn

6. **MANDATORY RULES:**
   - ✓ Always include "narrative" for the story - NEVER STOP NARRATING!
   - ✓ MUST use correct character class from "Active Players in This Session" list!
   - ✓ One enemy turn = roll attack + roll damage + apply damage + CHECK HP + advance turn (all in 1 response)
   - ✓ Player attack/spell = 2 STEPS: (1) Request attack roll → wait → (2) Request damage roll → apply
   - ✓ MUST CHECK HP after damage!
   - ✓ Player HP <= 0 = UNCONSCIOUS (not dead). Skip their turns but combat continues
   - ✓ Combat ONLY ends if: (1) All enemies dead OR (2) ALL players unconscious
   - ✓ Don't stop mid-round
   - ✓ Update combat_state via "combat_update"
   - ✓ Response MUST be valid JSON
   - ✓ ONLY request rolls from characters in "Active Players in This Session"
   - ✓ While waiting for rolls, continue providing dramatic narration about the situation/enemies/atmosphere
   - ⚠️ NEVER write player attack outcomes in narrative without request_roll! If player attacks, MUST include "request_roll" in JSON!

7. **AVAILABLE ENEMIES (choose RANDOM, don't always use the same!):**
   - Giant Rat: HP 7, AC 8, Attack +4, Damage 1d4+2
   - Goblin: HP 7, AC 9, Attack +4, Damage 1d6+2
   - Skeleton: HP 13, AC 9, Attack +4, Damage 1d6+2
   - Wolf: HP 11, AC 11, Attack +4, Damage 2d4+2
   - Giant Spider: HP 26, AC 12, Attack +5, Damage 1d8+3 (plus poison)
   - Bandit: HP 11, AC 10, Attack +3, Damage 1d6+1
   - Zombie: HP 22, AC 8, Attack +3, Damage 1d6+1
   - Orc: HP 15, AC 12, Attack +5, Damage 1d12+3

⚠️ **IMPORTANT - LANGUAGE CONSISTENCY:**
   - You MUST ALWAYS write narrative in English ONLY
   - NEVER mix Indonesian in the narrative (English players don't understand Indonesian)
   - If you start writing in Indonesian, STOP immediately and rewrite in English!

Focus: Dramatic narrative IN ENGLISH + Structured JSON + Simple combat + VARIED enemies!`;
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
    const language = request.language || 'indonesian';
    if (language === 'indonesian') {
      message += 'Mulai petualangan! Para pemain berada di sebuah tavern yang nyaman. Seorang NPC (bisa tavern keeper, pedagang, petani, atau siapapun) mendekati mereka dengan masalah. PENTING: Jangan selalu gunakan "tikus di cellar" - gunakan situasi yang BERVARIASI! Contoh: bandit di jalan, goblin di hutan, skeleton di kuburan, wolf menyerang desa, dll. Buat cerita menarik, berikan pilihan kepada player, dan biarkan mereka yang memutuskan sebelum combat dimulai. Ketika combat dimulai, pilih musuh secara RANDOM dari daftar yang tersedia!\n\n';
    } else {
      message += 'Start the adventure! The players are in a cozy tavern. An NPC (could be tavern keeper, merchant, farmer, or anyone) approaches them with a problem. IMPORTANT: Don\'t always use "rats in cellar" - use VARIED situations! Examples: bandits on the road, goblins in the forest, skeletons in graveyard, wolves attacking village, etc. Create an interesting story, give players choices, and let them decide before combat starts. When combat begins, choose enemies RANDOMLY from the available list!\n\n';
    }
  }

  message += '**Respond in JSON format only!**';

  return message;
}
