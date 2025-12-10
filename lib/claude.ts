import Anthropic from '@anthropic-ai/sdk';
import { Character, Message, RollData, RollPrompt, GameState } from '@/types';
import { rollDice } from './dice';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface DMContext {
  campaign_name: string;
  characters: Character[];
  recent_messages: Message[];
  game_state: GameState;
  current_player_action?: string;
  roll_result?: RollData;
  sender_name?: string;
  character_name?: string;
  dm_language?: 'indonesian' | 'english';
}

interface CharacterUpdate {
  character_name: string;
  hp_change?: number; // negative for damage, positive for healing
  spell_slot_used?: { level: number }; // which spell slot was used
  long_rest?: boolean; // restore all HP and spell slots
}

/**
 * Get a response from Claude as the Dungeon Master
 */
export async function getDMResponse(context: DMContext): Promise<{
  response: string;
  rollPrompts?: RollPrompt[];
  characterUpdates?: CharacterUpdate[];
}> {
  const systemPrompt = buildCampaignContext(context);
  const conversationHistory = buildConversationHistory(context);
  const userMessage = buildUserMessage(context);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationHistory.length > 0
        ? [...conversationHistory, { role: 'user', content: userMessage }]
        : [{ role: 'user', content: userMessage }],
      tools: [
        {
          name: 'request_roll',
          description: 'Request a specific character to make a dice roll',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character who should roll',
              },
              roll_type: {
                type: 'string',
                enum: ['initiative', 'attack', 'damage', 'saving_throw', 'ability_check', 'skill_check'],
                description: 'The type of roll needed',
              },
              description: {
                type: 'string',
                description: 'A brief description of why this roll is needed',
              },
            },
            required: ['character_name', 'roll_type', 'description'],
          },
        },
        {
          name: 'apply_damage',
          description: 'Apply damage or healing to one or more characters',
          input_schema: {
            type: 'object',
            properties: {
              character_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of character names taking damage or healing. Use ["all"] to affect all party members.',
              },
              amount: {
                type: 'number',
                description: 'Amount of HP change (positive for healing, negative for damage)',
              },
            },
            required: ['character_names', 'amount'],
          },
        },
        {
          name: 'roll_dice',
          description: 'Roll dice for enemies, NPCs, or any DM-controlled rolls. Returns actual random results.',
          input_schema: {
            type: 'object',
            properties: {
              dice_notation: {
                type: 'string',
                description: 'Dice notation like "1d20", "2d6+3", "1d8+2". Can include modifiers.',
              },
              roll_name: {
                type: 'string',
                description: 'Description of the roll (e.g., "Rat attack roll", "Goblin damage")',
              },
            },
            required: ['dice_notation', 'roll_name'],
          },
        },
        {
          name: 'use_spell_slot',
          description: 'Mark a spell slot as used for a character',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character using the spell slot',
              },
              spell_level: {
                type: 'number',
                description: 'The level of the spell slot being used (1-9)',
              },
            },
            required: ['character_name', 'spell_level'],
          },
        },
        {
          name: 'long_rest',
          description: 'Character takes a long rest (8 hours) - restores all HP and spell slots',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character taking a long rest',
              },
            },
            required: ['character_name'],
          },
        },
      ],
    });

    let responseText = '';
    const rollPrompts: RollPrompt[] = [];
    const characterUpdates: CharacterUpdate[] = [];

    // Process all content blocks
    for (const block of message.content) {
      if (block.type === 'text') {
        responseText += block.text;
      } else if (block.type === 'tool_use') {
        // Handle tool calls
        if (block.name === 'request_roll') {
          const input = block.input as any;
          rollPrompts.push({
            character_name: input.character_name,
            roll_type: input.roll_type as RollPrompt['roll_type'],
            description: input.description,
          });
        } else if (block.name === 'apply_damage') {
          const input = block.input as any;
          const targetNames: string[] = input.character_names || [];

          // Handle "all" keyword
          if (targetNames.includes('all')) {
            // Apply to all characters
            context.characters.forEach(char => {
              characterUpdates.push({
                character_name: char.name,
                hp_change: input.amount,
              });
            });
          } else {
            // Apply to specific characters
            targetNames.forEach(name => {
              characterUpdates.push({
                character_name: name,
                hp_change: input.amount,
              });
            });
          }
        } else if (block.name === 'use_spell_slot') {
          const input = block.input as any;
          characterUpdates.push({
            character_name: input.character_name,
            spell_slot_used: { level: input.spell_level },
          });
        } else if (block.name === 'long_rest') {
          const input = block.input as any;
          characterUpdates.push({
            character_name: input.character_name,
            long_rest: true,
          });
        } else if (block.name === 'roll_dice') {
          const input = block.input as any;
          const diceNotation = input.dice_notation as string;
          const rollName = input.roll_name as string;

          // Parse dice notation (e.g., "1d20+4" → {count: 1, sides: 20, modifier: 4})
          const match = diceNotation.match(/(\d+)d(\d+)([+\-]\d+)?/i);
          if (match) {
            const count = parseInt(match[1]);
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : 0;

            // Roll the dice
            const rolls = rollDice(count, sides);
            const diceTotal = rolls.reduce((sum, r) => sum + r, 0);
            const total = diceTotal + modifier;

            // Inject the roll result into the response text
            const rollResult = `[${rollName}: ${count}d${sides}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''} = ${rolls.join('+')}${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''} = **${total}**]`;
            responseText += `\n${rollResult}`;
          }
        }
      }
    }

    return {
      response: responseText,
      rollPrompts: rollPrompts.length > 0 ? rollPrompts : undefined,
      characterUpdates: characterUpdates.length > 0 ? characterUpdates : undefined,
    };
  } catch (error) {
    console.error('Error getting DM response:', error);
    throw new Error('Failed to get response from Dungeon Master');
  }
}

/**
 * Build detailed character status for DM context
 */
function buildDetailedCharacterStatus(characters: Character[]): string {
  return characters.map((c) => {
    const abilityMods = {
      STR: Math.floor((c.strength - 10) / 2),
      DEX: Math.floor((c.dexterity - 10) / 2),
      CON: Math.floor((c.constitution - 10) / 2),
      INT: Math.floor((c.intelligence - 10) / 2),
      WIS: Math.floor((c.wisdom - 10) / 2),
      CHA: Math.floor((c.charisma - 10) / 2),
    };

    let status = `\n${c.name} (${c.race || 'Unknown'} ${c.class} Level ${c.level}) - played by ${c.created_by}\n`;
    status += `  HP: ${c.current_hp}/${c.max_hp} | AC: ${c.armor_class} | Proficiency: +${c.proficiency_bonus}\n`;
    status += `  Abilities: STR ${c.strength}(${abilityMods.STR>=0?'+':''}${abilityMods.STR}), DEX ${c.dexterity}(${abilityMods.DEX>=0?'+':''}${abilityMods.DEX}), CON ${c.constitution}(${abilityMods.CON>=0?'+':''}${abilityMods.CON}), INT ${c.intelligence}(${abilityMods.INT>=0?'+':''}${abilityMods.INT}), WIS ${c.wisdom}(${abilityMods.WIS>=0?'+':''}${abilityMods.WIS}), CHA ${c.charisma}(${abilityMods.CHA>=0?'+':''}${abilityMods.CHA})\n`;

    // Weapons
    if (c.weapons && c.weapons.length > 0) {
      status += `  Weapons: ${c.weapons.map(w => `${w.name} (${w.damage_dice} ${w.damage_type})`).join(', ')}\n`;
    }

    // Spell slots
    if (c.spell_slots) {
      const slots = Object.entries(c.spell_slots)
        .filter(([_, value]) => value && value > 0)
        .map(([level, count]) => `L${level.replace('level_', '')}:${count}`)
        .join(', ');
      if (slots) {
        status += `  Spell Slots: ${slots}\n`;
      }
    }

    // Spells (first few)
    if (c.spells && c.spells.length > 0) {
      const spellList = c.spells.slice(0, 5).map(s => `${s.name} (L${s.level})`).join(', ');
      status += `  Spells: ${spellList}${c.spells.length > 5 ? ` +${c.spells.length - 5} more` : ''}\n`;
    }

    // Notable skills (proficient ones)
    if (c.skills) {
      const proficientSkills = Object.entries(c.skills)
        .filter(([_, bonus]) => bonus !== undefined && bonus > 0)
        .map(([skill, bonus]) => `${skill} +${bonus}`)
        .slice(0, 5);
      if (proficientSkills.length > 0) {
        status += `  Key Skills: ${proficientSkills.join(', ')}\n`;
      }
    }

    return status;
  }).join('\n');
}

/**
 * Build comprehensive campaign context with specific adventure details
 */
function buildCampaignContext(context: DMContext): string {
  const characterList = buildDetailedCharacterStatus(context.characters);

  // Campaign-specific context based on campaign name
  const campaignDetails = getCampaignDetails(context.campaign_name);

  const languageInstruction = context.dm_language === 'english'
    ? 'You will host this adventure in English for storytelling and commands.'
    : 'You will host this fully in Indonesian Language for the story telling and commands.';

  return `You are the Dungeon Master for "${context.campaign_name}", a D&D 5e adventure. ${languageInstruction}

${campaignDetails}

PARTY (This detailed information is for your reference only - players already know their own stats):
${characterList}

${getEnemyContext(context.campaign_name)}

DM GUIDELINES:

🚨 **CRITICAL RULES:**

1. **NEVER STOP MID-COMBAT ROUND:**
   - Enemy attacks? → Roll attack AND damage in same response, apply damage, move to next enemy
   - Multiple enemies before player? → Resolve ALL their complete turns (attack+damage) until player's turn
   - Only stop at player's turn with clear action prompt

2. **MULTI-ACTION TURNS:**
   - Player uses bonus action (Hunter's Mark, etc.) + main action (attack)? → Request attack roll sequentially
   - Example: "You mark the rat with Hunter's Mark! Now make your Longbow attack roll!"
   - Never stop after just bonus action - always complete the full turn

3. **ALWAYS END WITH PLAYER PROMPT:**
   - Every response must end with player being prompted for action or roll
   - Never end on enemy action without continuing to player's turn

**TOOLS:** roll_dice (enemies), request_roll (players), apply_damage (HP), use_spell_slot, long_rest

**CRITICAL HIT:** Double damage dice only. Example: 1d8+3 → 2d8+3

If player down to 0, if there's other player left, keep the game on. But if not, this mission is failed or another NPC saves players for a long rest to retry.

Be dramatic and engaging!`;
}

/**
 * Get campaign-specific details
 */
function getCampaignDetails(campaignName: string): string {
  // Check for "A Most Potent Brew" or similar beginner adventures
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `CAMPAIGN: "A Most Potent Brew"
Location: The Elfsong Tavern, Greenest
Quest Giver: Glowkindle (jovial half-elf tavern owner)
Quest: Clear the cellar of giant rats
Reward: 50 gold pieces + free food/drink for life

After rats defeated: Glowkindle celebrates, pays the reward, and the party becomes local heroes. Continue the adventure - they can explore Greenest, hear rumors of other quests, or rest at the tavern.`;
  }

  // Default campaign context for custom campaigns
  return `CAMPAIGN: Custom Adventure
Continue the story naturally based on player actions. Create memorable moments and improvise as needed.`;
}

/**
 * Get enemy context for known campaigns
 */
function getEnemyContext(campaignName: string): string {
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `INITIAL ENCOUNTER: 3 Giant Rats (HP: 7, AC: 8, Bite: +4 hit / 1d4+2 damage)`;
  }

  return `Create appropriate encounters based on party level.`;
}

/**
 * Build conversation history from recent messages
 */
function buildConversationHistory(context: DMContext): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (context.recent_messages.length === 0) return [];

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Take last 15 messages to provide context without overwhelming the model
  const recentMessages = context.recent_messages.slice(-15);

  recentMessages.forEach((msg) => {
    if (msg.message_type === 'dm') {
      // DM messages
      history.push({
        role: 'assistant',
        content: msg.content,
      });
    } else if (msg.message_type === 'chat' || msg.message_type === 'roll') {
      // Player messages (with or without rolls)
      let content = `[${msg.character_id ? 'Player' : 'User'}]: ${msg.content}`;

      // Add roll information if present
      if (msg.roll_data) {
        content += `\n[ROLL: ${msg.roll_data.roll_type} - Total: ${msg.roll_data.total}]`;
      }

      history.push({
        role: 'user',
        content,
      });
    }
  });

  return history;
}

/**
 * Build the user message with current action and roll data
 */
function buildUserMessage(context: DMContext): string {
  let message = '';

  // If this is the very first message, prompt to start the adventure with immersive storytelling
  if (!context.current_player_action && !context.roll_result && context.recent_messages.length === 0) {
    return `Begin the adventure immediately with vivid, immersive storytelling! Do NOT use generic greetings like "Welcome, brave adventurers!"

Instead, dive straight into the scene:
- Describe the environment in rich detail (sights, sounds, smells)
- Set the mood and atmosphere
- Present the immediate situation or problem
- Make the players feel like they are already IN the moment

For example, for "A Most Potent Brew": Start by describing them already at the tavern, hearing Glowkindle's plea, seeing his worried face, smelling the ale and wine. Make them feel present in the scene.

Start the narrative NOW!`;
  }

  // Add player action
  if (context.current_player_action) {
    const prefix = context.character_name && context.sender_name
      ? `[${context.sender_name} playing ${context.character_name}]`
      : '[Player]';
    message += `${prefix}: ${context.current_player_action}\n\n`;
  }

  // Add detailed roll result if present
  if (context.roll_result) {
    message += `[ROLL RESULT]\n`;
    message += `Type: ${context.roll_result.roll_type}\n`;
    message += `Advantage: ${context.roll_result.advantage_type}\n`;

    if (context.roll_result.dice && context.roll_result.dice.length > 0) {
      message += `Dice: ${context.roll_result.dice.map(d =>
        `${d.count}${d.dice_type} = ${d.result}${d.individual_rolls ? ` (rolls: ${d.individual_rolls.join(', ')})` : ''}`
      ).join(', ')}\n`;
    }

    if (context.roll_result.modifiers && context.roll_result.modifiers.length > 0) {
      message += `Modifiers: ${context.roll_result.modifiers.map(m =>
        `+${m.value} (${m.source || m.name})`
      ).join(', ')}\n`;
    }

    message += `Total: ${context.roll_result.total}\n`;

    if (context.roll_result.description) {
      message += `Description: ${context.roll_result.description}\n`;
    }

    message += '\n';
  }

  // Add instructions for DM response
  if (!context.current_player_action && !context.roll_result) {
    message += 'Continue the adventure.\n';
  } else {
    message += '\nRespond dramatically.\n';
  }

  // Critical reminders
  message += '\n🚨 MANDATORY:\n';
  message += '- Enemy turn? Roll attack+damage together, apply damage, continue to next creature\n';
  message += '- Player multi-action turn? Request ALL actions (bonus action + main action)\n';
  message += '- MUST end with player being prompted for their action/roll\n';
  message += '- NEVER stop mid-round or after enemy attack without damage';

  return message;
}


/**
 * Helper to calculate ability modifier
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Helper to determine if a roll succeeds
 */
export function checkRollSuccess(roll: RollData, dc?: number): boolean {
  if (!dc) return true;
  return roll.total >= dc;
}
