import Anthropic from '@anthropic-ai/sdk';
import { Character, Message, RollData, RollPrompt, GameState } from '@/types';

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
}

interface CharacterUpdate {
  character_name: string;
  hp_change?: number; // negative for damage, positive for healing
  spell_slot_used?: { level: number }; // which spell slot was used
  long_rest?: boolean; // restore all HP and spell slots
  short_rest?: { hp_recovered: number }; // partial HP recovery
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
      max_tokens: 1536,
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
        {
          name: 'short_rest',
          description: 'Character takes a short rest (1 hour) - can spend hit dice to recover HP',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character taking a short rest',
              },
              hp_recovered: {
                type: 'number',
                description: 'Amount of HP recovered from spending hit dice',
              },
            },
            required: ['character_name', 'hp_recovered'],
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
        } else if (block.name === 'short_rest') {
          const input = block.input as any;
          characterUpdates.push({
            character_name: input.character_name,
            short_rest: { hp_recovered: input.hp_recovered },
          });
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

  return `You are the Dungeon Master for "${context.campaign_name}", a D&D 5e adventure. You will host this fully in Indonesian Language for the story telling and commands.

${campaignDetails}

PARTY (This detailed information is for your reference only - players already know their own stats):
${characterList}

${getEnemyContext(context.campaign_name)}

DM GUIDELINES:
1. Start by setting the scene vividly - describe the tavern, Glowkindle's plea, and the cellar entrance
2. When combat starts, call for initiative: "Everyone, roll for initiative!"
3. Track initiative order and announce each player's turn clearly
4. When a player declares an action requiring a roll, prompt them by name
5. Respond to roll results dramatically - describe hits, misses, and damage narratively
6. After a successful hit, always prompt for damage: "[Player name], roll for damage!"
7. Describe enemy actions and their attack rolls
8. Make combat engaging with vivid descriptions
9. Use player names when prompting for rolls

CRITICAL - AUTOMATIC STAT TRACKING:
You have access to tools to automatically update character stats. Use them whenever appropriate:

1. **request_roll**: Call this when a character needs to make a dice roll
   - Use for attacks, damage, saves, skill checks, etc.
   - The dice roller will automatically unlock for that specific character

2. **apply_damage**: Call this when one or more characters take damage or receive healing
   - Use negative numbers for damage: apply_damage(["Hank"], -5) = 5 damage to Hank
   - Use positive numbers for healing: apply_damage(["Hank"], 8) = 8 HP restored to Hank
   - Multiple targets: apply_damage(["Hank", "Elara", "Gorak"], 10) = heal all three for 10 HP
   - All party members: apply_damage(["all"], 10) = heal everyone for 10 HP
   - Area damage: apply_damage(["Hank", "Elara"], -8) = 8 damage to both
   - Call this AFTER you narrate the damage in your story

3. **use_spell_slot**: Call this when a character casts a spell
   - Specify the character name and spell level (1-9)
   - This will automatically decrement their available spell slots

4. **long_rest**: Call this when a character takes a long rest (8 hours of sleep)
   - Restores ALL HP to maximum
   - Restores ALL spell slots
   - Use when party sets up camp for the night or stays at an inn

5. **short_rest**: Call this when a character takes a short rest (1 hour)
   - Allows spending hit dice to recover HP
   - Does NOT restore spell slots (except for some classes like Warlocks)
   - Calculate HP recovered: 1d(hit die) + CON modifier per hit die spent
   - Example: Fighter with d10 hit die and +2 CON spends 2 hit dice = 2d10+4 average = 15 HP

IMPORTANT: Always narrate the action FIRST in your text response, THEN call the appropriate tools!

REST GUIDELINES:
- Long rests require 8 hours of sleep in a safe location
- Short rests require 1 hour of minimal activity (eating, tending wounds, etc.)
- Characters can only benefit from one long rest per 24-hour period
- Monitor the party's resources (HP, spell slots) and suggest rests when needed

COMBAT RULES (D&D 5e):
- Attack hits if roll ≥ target's AC
- Critical hit on natural 20 (double damage dice)
- Critical miss on natural 1 (automatic miss)
- Saving throws succeed if roll ≥ DC
- Death at 0 HP (start making death saving throws)

IMPORTANT ROLL PROMPTING:
When you want a player to roll:
1. Narrate why they need to roll in your story text
2. Call the request_roll tool with their character name and roll type
3. For group rolls (like initiative), call request_roll once for each character

Examples:
- Story: "Hank swings his sword at the rat!"
  Tool: request_roll(character_name="Hank", roll_type="attack", description="Attack the giant rat")

- Story: "The rat bites back viciously!"
  Tool: request_roll(character_name="Hank", roll_type="saving_throw", description="Dexterity save to dodge")

Be dramatic, engaging, and make players feel like heroes (or occasionally feel the sting of failure)!`;
}

/**
 * Get campaign-specific details
 */
function getCampaignDetails(campaignName: string): string {
  // Check for "A Most Potent Brew" or similar beginner adventures
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `CAMPAIGN BACKGROUND:
The party is in the town of Greenest. Glowkindle, the jovial half-elf owner of The Elfsong Tavern, has a serious problem - giant rats have infested his cellar and are destroying his precious wine and beer barrels. The constant squeaking and scratching is driving away customers, and he's losing money fast.

He's offering a generous reward: 50 gold pieces and free food and drink at the tavern for life to anyone brave enough to clear out the rats. This is a perfect opportunity for beginning adventurers to prove themselves and earn some coin.

The cellar is dark and damp, with wooden support beams, stacks of barrels, and plenty of shadows for rats to hide in. The smell of spilled ale and fermenting wine fills the air.`;
  }

  // Default campaign context for custom campaigns
  return `CAMPAIGN BACKGROUND:
This is an epic D&D 5e adventure where heroes face challenges, uncover mysteries, and forge their legends. The party has gathered together for adventure, fortune, and glory.

Adapt to the players' actions and create memorable moments. Be ready to improvise based on their choices.`;
}

/**
 * Get enemy context for known campaigns
 */
function getEnemyContext(campaignName: string): string {
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `ENEMIES IN THE CELLAR:
- 3 Giant Rats
  * HP: 7 each
  * AC: 8
  * Attack: Bite +4 to hit, reach 5 ft., one target
  * Damage: 1d4+2 piercing damage on hit
  * Behavior: Aggressive, will attack if threatened
  * Tactics: Try to surround and overwhelm individual targets`;
  }

  return `ENCOUNTERS:
Adjust enemy difficulty based on party level and composition. Use D&D 5e encounter building guidelines.`;
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

  // If no specific action, prompt DM to continue
  if (!context.current_player_action && !context.roll_result) {
    message += 'Continue the adventure. What happens next? Make sure to keep requesting next action/roll.\n';
  } else {
    message += 'Respond to this action and roll result. Describe what happens and always prompt for next action/roll.\n';
  }

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
